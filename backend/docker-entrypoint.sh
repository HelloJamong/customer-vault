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
  # Try to apply migrations, if it fails with P3005 (database not empty), resolve and continue
  if ! npx prisma migrate deploy 2>&1 | tee /tmp/migrate.log; then
    if grep -q "P3005" /tmp/migrate.log; then
      echo "[entrypoint] Database is not empty. Marking initial migration as applied..."
      npx prisma migrate resolve --applied 20260106000000_init
      echo "[entrypoint] Retrying migration deployment..."
      npx prisma migrate deploy
    else
      echo "[entrypoint] Migration failed with unexpected error"
      exit 1
    fi
  fi
else
  echo "[entrypoint] No migrations found; pushing schema to database..."
  npx prisma db push
fi

echo "[entrypoint] Starting application..."
exec "$@"
