# Deploying AIResume to AWS — Runbook

The full process, end to end: what gets created, what it costs, who does what
(you vs. the assistant), and every command. Target: **staging first**, then
clone to production.

---

## 0. What we're building

```
Route53 (optional, needs a domain)
   └─▶ CloudFront ──▶ ALB ──▶ ECS Fargate: web (Next.js, 2 tasks)
                                        ECS Fargate: worker (PDF, 1 task)
                                   RDS PostgreSQL 16 (private subnets)
                                   ElastiCache Redis   (private subnets)
                                   S3 exports bucket   (PDFs, KMS)
                                   Secrets Manager     (DB URL, app secrets)
                                   ECR                 (2 images: web, worker)
```

Everything lives in `infra/terraform/` — reviewable, repeatable, tear-down-able.

**Monthly cost reality check** (the honest numbers):

| Piece | Staging (sized down) | Production (Multi-AZ) |
|---|---|---|
| NAT gateway | $33 × 1 | $33 × 2 |
| RDS db.t4g.small/medium | ~$25 | ~$60 (Multi-AZ) |
| Fargate web (2 × 0.5 vCPU) | ~$18 | ~$36 |
| Fargate worker (1 vCPU) | ~$19 | ~$19 |
| ElastiCache t4g.micro/small | ~$12 | ~$26 |
| ALB | ~$16 | ~$16 |
| CloudFront + S3 + misc | ~$5 | ~$10 |
| **Total** | **~$90–130/mo** | **~$180–250/mo** |

For a true staging-minimal setup we use **1 NAT gateway, single-AZ RDS,
db.t4g.small** (a one-variable change).

---

## 1. One-time machine setup (done ✅)

- AWS CLI (`aws --version`), Terraform (`terraform -version`),
  Docker via colima (`docker ps`).

## 2. Authenticate to AWS — **YOU**

```bash
aws configure sso
```

You'll be asked for:
- **SSO session name** — anything, e.g. `wtfbuilds`
- **SSO start URL** — from your AWS access portal (bookmark), looks like
  `https://d-xxxxxxxxxx.awsapps.com/start` or `https://<org>.awsapps.com/start`
- **SSO region** — usually `us-east-1` (where the portal lives, not where we deploy)
- Then a **browser window opens** → log in → pick the account + role
  (AdministratorAccess) → set default region `ap-south-1`.

Verify:

```bash
aws sts get-caller-identity     # should print your account + role
```

If you don't know your start URL: log into the AWS access portal in your
browser first — the URL bar *is* the start URL.

## 3. Terraform state bucket (one-time, ~1 min)

Terraform stores its state remotely so re-runs are safe:

```bash
aws s3api create-bucket \
  --bucket airesume-tfstate-<your-account-id> \
  --region ap-south-1 --create-bucket-configuration LocationConstraint=ap-south-1
aws s3api put-bucket-versioning --bucket airesume-tfstate-<your-account-id> \
  --versioning-configuration Status=Enabled
```

Then `infra/terraform/backend.hcl` gets the bucket name (assistant does this).

## 4. Provision the foundation — assistant runs, you approve

```bash
cd infra/terraform
terraform init -backend-config=backend.hcl
terraform plan -var-file=staging.tfvars     # review the ~40 resources
terraform apply -var-file=staging.tfvars    # ~10–15 minutes (RDS is slow)
```

Creates: VPC (2 AZs, NAT), RDS 16, ElastiCache Redis, S3 exports bucket,
ECR repos, ECS cluster + task definitions, ALB, Secrets Manager, IAM.
Outputs: **ALB DNS name** (your temporary public URL), ECR repo URLs.

At this point the services are deployed but *unhealthy* — they have no images
yet. That's step 5.

## 5. Build & push the Docker images — assistant

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com
docker build -f docker/web.Dockerfile -t <ecr-web>:v1 .
docker build -f docker/worker.Dockerfile -t <ecr-worker>:v1 .
docker push <ecr-web>:v1 && docker push <ecr-worker>:v1
```

(`colima` must be running: `colima start`. ~3–5 min per image.)

Then update the ECS services to the new image (assistant, via `aws ecs
update-service --force-new-deployment` or a terraform variable bump).

## 6. Run the database migration — one-off ECS task

RDS sits in private subnets — migrations run *inside* the VPC as a one-off
Fargate task using the worker image:

```bash
aws ecs run-task --cluster airesume-staging \
  --task-definition airesume-worker-staging \
  --overrides '{"containerOverrides":[{"name":"worker","command":["pnpm","--filter","@airesume/db","migrate"]}]}'
```

(Worker image ships with the repo + deps, so `migrate` just works.)

## 7. App secrets — assistant

`BETTER_AUTH_SECRET`, OAuth client IDs/secrets, SES config go into Secrets
Manager + get wired into the task definitions (small Terraform addition at
deploy time).

## 8. Verify

- `curl http://<alb-dns>/` → marketing page (200)
- Sign up on `http://<alb-dns>` → dashboard → create resume → export PDF
- Worker logs: `aws logs tail /airesume/staging --filter-pattern export`

## 9. DNS + HTTPS (optional now, recommended before sharing publicly)

Needs a domain you own: Route53 zone → ACM certificate (DNS-validated) →
ALB 443 listener. Without it, the ALB DNS name works over plain HTTP — fine
for staging, not for production cookies.

## 10. Every future deploy — GitHub Actions (no local machine needed)

`deploy-staging.yml` (already in the repo) does: test → build images → push
ECR → `terraform apply`. One-time setup:
- GitHub repo secrets: `AWS_ROLE_ARN` (OIDC role), `TF_STATE_BUCKET`
- Repo variable: `AWS_DEPLOY_ENABLED=true`
- AWS side: OIDC provider + trust role for the repo (assistant creates via Terraform)

## 11. Teardown (when you want your money back)

```bash
terraform destroy -var-file=staging.tfvars   # removes everything except the state bucket
```

---

## Google OAuth sign-in — setup walkthrough (YOU, ~10 minutes)

1. **console.cloud.google.com** → create project `AIResume` (top-bar selector).
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name `AIResume`, your support email + developer email
   - Scopes: keep defaults (`email`, `profile`, `openid`) → Save
   - **Test users**: add your own Gmail(s) while the app is in *Testing* status
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - *(later)* `https://your-prod-domain`
   - Authorized redirect URIs (must match EXACTLY):
     - `http://localhost:3000/api/auth/callback/google`
     - *(later)* `https://your-prod-domain/api/auth/callback/google`
4. **Copy the Client ID + Client secret** → paste into `.env`:

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
NEXT_PUBLIC_GOOGLE_OAUTH=true
```

5. Restart `pnpm dev` → "Continue with Google" appears on /sign-in and
   /sign-up → test the flow.

Production notes: move the consent screen to *In production* before launch
(no test-user cap), and keep the secret only in GitHub Secrets / AWS Secrets
Manager — never in the repo.

SES production access (for real verification emails): SES accounts start in
sandbox (only verified recipients) — request production access from the SES
console when going live.
