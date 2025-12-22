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
  npx prisma migrate deploy
else
  echo "[entrypoint] No migrations found; pushing schema to database..."
  npx prisma db push
fi

echo "[entrypoint] Starting application..."
exec "$@"
