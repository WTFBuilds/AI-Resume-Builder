#!/usr/bin/env bash
# Creates the AIResume EC2 stack on a fresh AWS account:
#   key pair → security group → Ubuntu 24.04 t3.micro (free tier) → elastic IP
# Prereq: `aws configure` done with the new account's credentials.
# Usage:  bash deploy/aws/create-ec2.sh [region]   (default: ap-south-1)
set -euo pipefail

REGION="${1:-ap-south-1}"
KEY_NAME="airesume-deploy"
SG_NAME="airesume-sg"
INSTANCE_TYPE="t3.micro"   # free tier (12 mo); upgrade to t3.small when real users arrive
export AWS_DEFAULT_REGION="$REGION"

echo "── account check"
aws sts get-caller-identity

echo "── key pair"
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" &>/dev/null; then
  aws ec2 create-key-pair --key-name "$KEY_NAME" \
    --query 'KeyMaterial' --output text > ~/.ssh/"$KEY_NAME".pem
  chmod 600 ~/.ssh/"$KEY_NAME".pem
  echo "  key saved to ~/.ssh/$KEY_NAME.pem"
else
  echo "  exists"
fi

echo "── security group"
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)
SG_ID=$(aws ec2 create-security-group --group-name "$SG_NAME" \
  --description "AIResume: ssh, web, postgres, redis" --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups --group-names "$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' --output text)

MY_IP=$(curl -s https://api.ipify.org || echo "0.0.0.0/0")
[[ "$MY_IP" == *.* ]] && MY_IP="$MY_IP/32" || MY_IP="0.0.0.0/0"
echo "  ssh allowed from: $MY_IP"

authorize() { # port, description, cidr
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
    --protocol tcp --port "$1" --cidr "$3" 2>/dev/null \
    || echo "  (port $1 rule already present)"
}
authorize 22   "ssh"     "$MY_IP"
authorize 80   "http"    "0.0.0.0/0"
authorize 443  "https"   "0.0.0.0/0"
authorize 5432 "postgres" "0.0.0.0/0"
authorize 6379 "redis"   "0.0.0.0/0"

echo "── latest Ubuntu 24.04 LTS AMI"
AMI_ID=$(aws ssm get-parameter \
  --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query 'Parameter.Value' --output text)

echo "── launch instance ($INSTANCE_TYPE, free tier)"
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" --security-group-ids "$SG_ID" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --user-data file://deploy/aws/ec2-user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=airesume}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "  instance: $INSTANCE_ID — waiting for running state"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

echo "── elastic IP (free while attached)"
ALLOC_ID=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID"
PUBLIC_IP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" \
  --query 'Addresses[0].PublicIp' --output text)

echo "  waiting for SSH (bootstrap runs ~3 min on first boot)"
for i in $(seq 1 30); do
  if nc -z "$PUBLIC_IP" 22 2>/dev/null; then break; fi
  sleep 5
done

cat <<EOF

── DONE ──────────────────────────────────────────────
  Instance:   $INSTANCE_ID ($INSTANCE_TYPE, $REGION)
  Public IP:  $PUBLIC_IP        (elastic — survives stop/start)
  SSH:        ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP
  Bootstrap:  runs automatically on first boot (~3 min), log:
              /var/log/cloud-init-output.log
  Next:       over SSH — postgres/redis passwords, clone repo,
              deploy/ec2/setup.sh, systemd unit  (see SHIFTPLAN.md §3d)
EOF
