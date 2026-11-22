#!/bin/bash
# Runs ON the EC2 box — full worker setup from the `production` branch
# via the GitHub deploy key. Passwords come from /tmp/{pgpass,redpass}.txt.
set -euo pipefail

PG_PASS=$(cat /tmp/pgpass.txt)
REDIS_PASS=$(cat /tmp/redpass.txt)
APP_DIR=/opt/airesume
BRANCH=production

echo "── clone repo (branch $BRANCH)"
sudo rm -rf "$APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown ec2-user:ec2-user "$APP_DIR"
git clone -b "$BRANCH" git@github.com:WTFBuilds/AI-Resume-Builder.git "$APP_DIR"
echo "  cloned at: $(git -C "$APP_DIR" log --oneline -1)"

echo "── dedicated service user"
id -u airesume &>/dev/null || sudo useradd --system --shell /sbin/nologin --home "$APP_DIR" airesume

echo "── pnpm install (few minutes)"
cd "$APP_DIR"
pnpm install --frozen-lockfile

echo "── puppeteer chromium"
pnpm --filter @airesume/worker exec puppeteer browsers install chrome

echo "── .env"
BAS=$(openssl rand -base64 32)
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgres://airesume:$PG_PASS@16.178.186.120:5432/airesume
REDIS_URL=redis://:$REDIS_PASS@16.178.186.120:6379
BETTER_AUTH_SECRET=$BAS
REQUIRE_EMAIL_VERIFICATION=false
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WORKER_CONCURRENCY=1
NODE_ENV=production
EOF
chmod 600 "$APP_DIR/.env"

echo "── database schema (drizzle push) + template seed"
pnpm --filter @airesume/db push 2>&1 | tail -2
pnpm --filter @airesume/db seed 2>&1 | tail -1

echo "── systemd unit"
if [[ -f "$APP_DIR/deploy/ec2/airesume-worker.service" ]]; then
  sudo cp "$APP_DIR/deploy/ec2/airesume-worker.service" /etc/systemd/system/airesume-worker.service
else
  echo "  !! unit file missing in production branch — writing fallback"
  sudo tee /etc/systemd/system/airesume-worker.service >/dev/null <<'UNIT'
[Unit]
Description=AIResume export worker (BullMQ + Puppeteer)
After=network-online.target postgresql.service redis6.service
Wants=network-online.target

[Service]
Type=simple
User=airesume
Group=airesume
WorkingDirectory=/opt/airesume
EnvironmentFile=/opt/airesume/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/pnpm --filter @airesume/worker start
Restart=always
RestartSec=5
MemoryMax=1536M
Nice=5

[Install]
WantedBy=multi-user.target
UNIT
fi
sudo chown -R airesume:airesume "$APP_DIR"
sudo systemctl daemon-reload
sudo systemctl enable airesume-worker >/dev/null

echo "── start + status"
sudo systemctl restart airesume-worker || true
sleep 8
systemctl is-active airesume-worker || true
sudo journalctl -u airesume-worker --no-pager -n 12 | tail -10
