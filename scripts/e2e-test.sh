#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
RUN_ID="${E2E_RUN_ID:-$(date +%s)-$$}"
PROJECT_NAME="customer-vault-e2e-${RUN_ID}"
BACKEND_PORT="${E2E_BACKEND_PORT:-15000}"
DB_PORT="${E2E_DB_PORT:-13306}"
INITIAL_PASSWORD="${E2E_INITIAL_ADMIN_PASSWORD:-E2e-Initial-9!}"
CHANGED_PASSWORD="${E2E_CHANGED_ADMIN_PASSWORD:-E2e-New-9!}"
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
DB_ROOT_PASSWORD=E2eRoot-9!
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=E2eDb-9!
DB_PORT=$DB_PORT
JWT_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ENCRYPTION_KEY=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
BACKUP_ENCRYPTION_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
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
