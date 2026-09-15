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
  # Capture the real migrate exit status without relying on non-POSIX pipefail.
  set +e
  npx prisma migrate deploy >/tmp/migrate.log 2>&1
  migrate_status=$?
  set -e
  cat /tmp/migrate.log

  if [ "$migrate_status" -ne 0 ]; then
    if grep -q "P3005" /tmp/migrate.log; then
      initial_migration=$(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | head -n 1)
      if [ -z "$initial_migration" ]; then
        echo "[entrypoint] Migration failed: no initial migration directory found for P3005 recovery." >&2
        exit 1
      fi
      echo "[entrypoint] Database is not empty. Marking initial migration as applied: $initial_migration"
      npx prisma migrate resolve --applied "$initial_migration"
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
