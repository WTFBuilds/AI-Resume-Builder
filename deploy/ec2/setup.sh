#!/usr/bin/env bash
# One-time EC2 setup for the AIResume worker (Ubuntu 22.04/24.04).
# Run from the repo root on the EC2 box:  sudo bash deploy/ec2/setup.sh
# Safe to re-run; skips finished steps.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "── 1/5 Node.js 22 (nodesource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "── 2/5 pnpm 12"
if ! command -v pnpm >/dev/null; then
  npm install -g pnpm@12
  # make pnpm resolvable for the systemd unit
  [[ -e /usr/bin/pnpm ]] || ln -sf "$(command -v pnpm)" /usr/bin/pnpm
fi
pnpm -v

echo "── 3/5 Chromium runtime libraries (Puppeteer)"
apt-get update -qq
apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
  libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils wget \
  || apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
  libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils wget

echo "── 4/5 dedicated service user"
id -u airesume &>/dev/null || useradd --system --shell /usr/sbin/nologin --home "$REPO_DIR" airesume

echo "── 5/5 dependencies + Chromium download"
cd "$REPO_DIR"
pnpm install --frozen-lockfile
pnpm --filter @airesume/worker exec puppeteer browsers install chrome

chown -R airesume:airesume "$REPO_DIR"

echo
echo "Next steps:"
echo "  1. Create /opt/airesume/.env from .env.example (DATABASE_URL/REDIS_URL point"
echo "     at this box; CLOUDINARY_* creds from your dashboard)."
echo "  2. chown airesume:airesume /opt/airesume/.env && chmod 600 it."
echo "  3. cp deploy/ec2/airesume-worker.service /etc/systemd/system/"
echo "  4. systemctl daemon-reload && systemctl enable --now airesume-worker"
echo "  5. journalctl -u airesume-worker -f"
