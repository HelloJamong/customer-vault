#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set. Set it before starting the container." >&2
  exit 1
fi

echo "[entrypoint] Running Prisma generate..."
npx prisma generate

MIGRATIONS_DIR="/app/prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR")" ]; then
  echo "[entrypoint] Applying Prisma migrations..."
  set +e
  npx prisma migrate deploy >/tmp/migrate.log 2>&1
  migrate_status=$?
  set -e
  cat /tmp/migrate.log

  if [ "$migrate_status" -ne 0 ]; then
    echo "[entrypoint] Migration failed. Resolve an existing database baseline explicitly before restarting." >&2
    exit "$migrate_status"
  fi
else
  if [ "${NODE_ENV:-production}" = "production" ]; then
    echo "[entrypoint] No Prisma migrations found in the production image. Refusing to run db push." >&2
    exit 1
  fi
  echo "[entrypoint] No migrations found; using db push in non-production environment..."
  npx prisma db push
fi

echo "[entrypoint] Normalizing legacy contract types..."
printf '%s\n' "UPDATE customers SET contract_type = '만료' WHERE contract_type = '미계약';" \
  | npx prisma db execute --stdin

echo "[entrypoint] Starting application..."
exec "$@"
