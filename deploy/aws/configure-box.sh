#!/bin/bash
# Runs ON the EC2 box (Amazon Linux 2023) — fixes PG config, sets up Redis,
# creates the app user/database. Passwords read from /tmp/pgpass.txt + /tmp/redpass.txt.
set -euo pipefail

PG_PASS=$(cat /tmp/pgpass.txt)
REDIS_PASS=$(cat /tmp/redpass.txt)

echo "── postgresql.conf: clean listen_addresses"
PGCONF=/var/lib/pgsql/data/postgresql.conf
# remove every listen_addresses line (however they got mangled)
sudo sed -i '/^[[:space:]]*listen_addresses/d' "$PGCONF"
# append the correct single-quoted form via a temp file (no shell quoting traps)
echo "listen_addresses = '*'" > /tmp/_la
sudo tee -a "$PGCONF" >/dev/null < /tmp/_la && sudo rm -f /tmp/_la
sudo grep -n "^listen_addresses" "$PGCONF"

echo "── pg_hba: ensure hostssl line"
PGHBA=/var/lib/pgsql/data/pg_hba.conf
sudo grep -q "^hostssl" "$PGHBA" || echo "hostssl  all  all  0.0.0.0/0  scram-sha-256" | sudo tee -a "$PGHBA" >/dev/null

echo "── restart postgresql"
sudo systemctl restart postgresql
sudo systemctl enable postgresql >/dev/null

echo "── create app user + database"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='airesume'" | grep -q 1 \
  && sudo -u postgres psql -c "ALTER USER airesume WITH PASSWORD '$PG_PASS';" \
  || sudo -u postgres psql -c "CREATE USER airesume WITH PASSWORD '$PG_PASS';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='airesume'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE airesume OWNER airesume;"
sudo -u postgres psql -c "\l" | grep airesume

echo "── redis: locate config + cli"
if [[ -f /etc/redis/redis.conf ]]; then RCONF=/etc/redis/redis.conf; else RCONF=$(sudo find /etc -name "*.conf" -path "*redis*" | head -1); fi
RCLI=$(command -v redis-cli || command -v redis6-cli || command -v valkey-cli)
RSVC=$(systemctl list-units --type=service | grep -oE "redis6|redis|valkey" | head -1)
echo "  config: $RCONF · cli: $RCLI · service: $RSVC"

sudo sed -i '/^[[:space:]]*bind /d' "$RCONF"
echo "bind 0.0.0.0 127.0.0.1" | sudo tee -a "$RCONF" >/dev/null
sudo sed -i '/^[[:space:]]*requirepass/d' "$RCONF"
echo "requirepass $REDIS_PASS" | sudo tee -a "$RCONF" >/dev/null
sudo systemctl restart "$RSVC"
sudo systemctl enable "$RSVC" >/dev/null

echo "── verify"
sudo -u postgres psql -c "select 1" | tail -2
"$RCLI" -a "$REDIS_PASS" --no-auth-warning ping
PGPASSWORD="$PG_PASS" psql -h 127.0.0.1 -U airesume -d airesume -c "select 'remote-ready' as status;"

echo "── DONE. Save these (worker .env + Vercel):"
echo "DATABASE_URL=postgres://airesume:$PG_PASS@16.178.186.120:5432/airesume"
echo "REDIS_URL=redis://:$REDIS_PASS@16.178.186.120:6379"
