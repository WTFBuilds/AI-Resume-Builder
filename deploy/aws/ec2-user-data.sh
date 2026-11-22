#!/bin/bash
# cloud-init user-data — bootstraps the AIResume EC2 box (Ubuntu 24.04).
# Installs: nginx, PostgreSQL 16, Redis 7, Node 22, pnpm, Chromium libs,
# dedicated service user + swap. Log: /var/log/cloud-init-output.log
set -eux

export DEBIAN_FRONTEND=noninteractive

# swap (t3.micro has 1 GB RAM — Chromium needs headroom)
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

apt-get update -qq
apt-get upgrade -y

# ── database + cache + web server ──
apt-get install -y postgresql-16 redis-server nginx

# ── Node.js 22 + pnpm ──
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm@12

# ── Chromium runtime libraries (Puppeteer) ──
apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
  libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils wget git

# ── dedicated service user ──
id -u airesume &>/dev/null || useradd --system --create-home --shell /bin/bash airesume

# ── postgres: listen for remote app traffic (auth is set up over SSH later) ──
PGCONF=$(find /etc/postgresql -name postgresql.conf | head -1)
echo "listen_addresses = '*'" >> "$PGCONF"
PGHBA=$(find /etc/postgresql -name pg_hba.conf | head -1)
echo "hostssl  airesume  all  0.0.0.0/0  scram-sha-256" >> "$PGHBA"
systemctl restart postgresql

# ── redis: remote-capable, password set over SSH later ──
cat >> /etc/redis/redis.conf <<EOF
bind 0.0.0.0 127.0.0.1
requirepass CHANGEME_SET_VIA_SSH
EOF
systemctl restart redis-server

# chromium for puppeteer gets downloaded on first worker setup (SSH step)
mkdir -p /opt/airesume
chown airesume:airesume /opt/airesume

echo "user-data bootstrap complete" > /var/log/airesume-bootstrap-done
