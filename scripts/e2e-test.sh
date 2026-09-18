#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
RUN_ID="${E2E_RUN_ID:-$(date +%s)-$$}"
PROJECT_NAME="customer-vault-e2e-${RUN_ID}"
BACKEND_PORT="${E2E_BACKEND_PORT:-15000}"
DB_PORT="${E2E_DB_PORT:-13306}"

random_hex() {
  local bytes="${1:-24}"
  node -e "process.stdout.write(require('crypto').randomBytes(Number(process.argv[1])).toString('hex'))" "$bytes"
}

DB_NAME="${E2E_DB_NAME:-customer_db}"
DB_USER="${E2E_DB_USER:-customer_user}"
DB_ROOT_PASSWORD="${E2E_DB_ROOT_PASSWORD:-$(random_hex)}"
DB_PASSWORD="${E2E_DB_PASSWORD:-$(random_hex)}"
INITIAL_PASSWORD="${E2E_INITIAL_ADMIN_PASSWORD:-E2e-$(random_hex 6)-9!}"
CHANGED_PASSWORD="${E2E_CHANGED_ADMIN_PASSWORD:-E2e-$(random_hex 6)-8!}"
JWT_SECRET="${E2E_JWT_SECRET:-$(random_hex 32)}"
ENCRYPTION_KEY="${E2E_ENCRYPTION_KEY:-$(random_hex 32)}"
BACKUP_ENCRYPTION_KEY="${E2E_BACKUP_ENCRYPTION_KEY:-$(random_hex 32)}"
ENV_FILE="$(mktemp)"

cleanup() {
  docker compose --env-file "$ENV_FILE" \
    -f "$PROJECT_ROOT/docker-compose.yml" \
    -f "$PROJECT_ROOT/docker-compose.e2e.yml" \
    -p "$PROJECT_NAME" down -v --remove-orphans >/tmp/customer-vault-e2e-cleanup.log 2>&1 || true
  rm -f "$ENV_FILE"
}
trap cleanup EXIT

cat >"$ENV_FILE" <<EOF
VERSION=latest
NODE_ENV=test
DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_PORT=$DB_PORT
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY
INITIAL_ADMIN_PASSWORD=$INITIAL_PASSWORD
CLAMAV_ENABLED=false
E2E_RUN_ID=$RUN_ID
E2E_BACKEND_PORT=$BACKEND_PORT
E2E_DB_PORT=$DB_PORT
EOF

compose() {
  docker compose --env-file "$ENV_FILE" \
    -f "$PROJECT_ROOT/docker-compose.yml" \
    -f "$PROJECT_ROOT/docker-compose.e2e.yml" \
    -p "$PROJECT_NAME" "$@"
}

echo "[e2e] Starting isolated database and backend..."
compose up -d --build db clamav backend

echo "[e2e] Waiting for backend health..."
for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:${BACKEND_PORT}/api/health" >/tmp/customer-vault-e2e-health.json; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    compose logs backend db
    echo "[e2e] Backend did not become healthy." >&2
    exit 1
  fi
  sleep 2
done

E2E_BASE_URL="http://127.0.0.1:${BACKEND_PORT}" \
E2E_INITIAL_ADMIN_PASSWORD="$INITIAL_PASSWORD" \
E2E_CHANGED_ADMIN_PASSWORD="$CHANGED_PASSWORD" \
npm run test:e2e:runner --prefix "$BACKEND_DIR"
