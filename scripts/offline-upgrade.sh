#!/usr/bin/env bash
# Upgrade an existing Customer Vault installation from an offline image bundle.
# The script preserves .env, MariaDB data, uploads, logs, backups, and proxy config.
set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"

usage() {
  cat <<USAGE
Usage:
  $SCRIPT_NAME --app-dir DIR --package-dir DIR --version VERSION [options]

Required:
  --app-dir DIR       Existing Customer Vault deployment directory
  --package-dir DIR   Directory containing docker-compose.yml and image tar.gz
  --version VERSION   Release version, for example 26.7.2

Options:
  --compose FILE      Compose file in package directory (default: docker-compose.yml)
  --images FILE       Image archive in package directory (default:
                      customer-vault-images-VERSION.tar.gz)
  --yes               Skip the final confirmation prompt
  --dry-run           Validate inputs without loading images or changing services
  -h, --help          Show this help

Example:
  $SCRIPT_NAME \\
    --app-dir /opt/customer-vault \\
    --package-dir /mnt/usb/customer-vault-26.7.2 \\
    --version 26.7.2
USAGE
}

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

error() {
  printf '[%s] ERROR: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2
}

die() {
  error "$*"
  exit 1
}

APP_DIR=""
PACKAGE_DIR=""
VERSION=""
COMPOSE_SOURCE=""
IMAGES_SOURCE=""
ASSUME_YES=0
DRY_RUN=0

while (($# > 0)); do
  case "$1" in
    --app-dir)
      (($# >= 2)) || die "--app-dir requires a value"
      APP_DIR=$2
      shift 2
      ;;
    --package-dir)
      (($# >= 2)) || die "--package-dir requires a value"
      PACKAGE_DIR=$2
      shift 2
      ;;
    --version)
      (($# >= 2)) || die "--version requires a value"
      VERSION=$2
      shift 2
      ;;
    --compose)
      (($# >= 2)) || die "--compose requires a value"
      COMPOSE_SOURCE=$2
      shift 2
      ;;
    --images)
      (($# >= 2)) || die "--images requires a value"
      IMAGES_SOURCE=$2
      shift 2
      ;;
    --yes)
      ASSUME_YES=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$APP_DIR" ]] || die "--app-dir is required"
[[ -n "$PACKAGE_DIR" ]] || die "--package-dir is required"
[[ -n "$VERSION" ]] || die "--version is required"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]] || die "Invalid version: $VERSION"

absolute_path() {
  local path=$1
  if [[ "$path" = /* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s/%s\n' "$(pwd -P)" "$path"
  fi
}

APP_DIR=$(absolute_path "$APP_DIR")
PACKAGE_DIR=$(absolute_path "$PACKAGE_DIR")

[[ -d "$APP_DIR" ]] || die "Application directory does not exist: $APP_DIR"
[[ -d "$PACKAGE_DIR" ]] || die "Package directory does not exist: $PACKAGE_DIR"

if [[ -z "$COMPOSE_SOURCE" ]]; then
  COMPOSE_SOURCE="$PACKAGE_DIR/docker-compose.yml"
elif [[ "$COMPOSE_SOURCE" != /* ]]; then
  COMPOSE_SOURCE="$PACKAGE_DIR/$COMPOSE_SOURCE"
fi

if [[ -z "$IMAGES_SOURCE" ]]; then
  IMAGES_SOURCE="$PACKAGE_DIR/customer-vault-images-${VERSION}.tar.gz"
elif [[ "$IMAGES_SOURCE" != /* ]]; then
  IMAGES_SOURCE="$PACKAGE_DIR/$IMAGES_SOURCE"
fi

ENV_FILE="$APP_DIR/.env"
OLD_COMPOSE="$APP_DIR/docker-compose.yml"

for command_name in docker tar gzip sha256sum awk sed mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || die "Required command is missing: $command_name"
done

[[ -f "$ENV_FILE" ]] || die "Existing .env was not found: $ENV_FILE"
[[ -f "$OLD_COMPOSE" ]] || die "Existing docker-compose.yml was not found: $OLD_COMPOSE"
[[ -f "$COMPOSE_SOURCE" ]] || die "Package compose file was not found: $COMPOSE_SOURCE"
[[ -f "$IMAGES_SOURCE" ]] || die "Image archive was not found: $IMAGES_SOURCE"

docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"

grep -q 'igor0670/customer-storage-backend:' "$COMPOSE_SOURCE" || die "Package compose file does not reference the Customer Vault backend image"
grep -q 'igor0670/customer-storage-frontend:' "$COMPOSE_SOURCE" || die "Package compose file does not reference the Customer Vault frontend image"

env_value() {
  local key=$1
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE"
}

JWT_SECRET_VALUE=$(env_value JWT_SECRET || true)
ENCRYPTION_KEY_VALUE=$(env_value ENCRYPTION_KEY || true)
[[ ${#JWT_SECRET_VALUE} -ge 32 ]] || die "JWT_SECRET must already exist in .env and be at least 32 characters"
[[ "$JWT_SECRET_VALUE" != *please-change* ]] || die "Replace the placeholder JWT_SECRET in .env before upgrading"
[[ "$ENCRYPTION_KEY_VALUE" =~ ^[0-9a-fA-F]{64}$ ]] || die "ENCRYPTION_KEY must be exactly 64 hexadecimal characters"
[[ "$ENCRYPTION_KEY_VALUE" != 0000000000000000000000000000000000000000000000000000000000000000 ]] || die "Replace the placeholder ENCRYPTION_KEY in .env before upgrading"

compose_command() {
  docker compose \
    --project-directory "$APP_DIR" \
    --env-file "$ENV_FILE" \
    -f "$APP_DIR/docker-compose.yml" \
    "$@"
}

set_env_value() {
  local key=$1
  local value=$2
  local temporary
  temporary=$(mktemp)
  awk -F= -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $1 == key {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) print key "=" value
    }
  ' "$ENV_FILE" >"$temporary"
  chmod --reference="$ENV_FILE" "$temporary" 2>/dev/null || chmod 600 "$temporary"
  mv "$temporary" "$ENV_FILE"
}

log "Application directory: $APP_DIR"
log "Package directory: $PACKAGE_DIR"
log "Target version: $VERSION"
log "Compose package: $COMPOSE_SOURCE"
log "Image archive: $IMAGES_SOURCE"

if [[ "$DRY_RUN" == 1 ]]; then
  log "Dry run passed. No images were loaded and no services or files were changed."
  exit 0
fi

DB_CONTAINER=$(compose_command ps -q db 2>/dev/null || true)
[[ -n "$DB_CONTAINER" ]] || DB_CONTAINER=customer_db
[[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" == true ]] || die "MariaDB container is not running: $DB_CONTAINER"

BACKUP_ROOT="$(dirname "$APP_DIR")/customer-vault-upgrade-backups"
STAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="$BACKUP_ROOT/${STAMP}-${VERSION}"
mkdir -p "$BACKUP_DIR"

OLD_COMPOSE_BACKUP="$BACKUP_DIR/docker-compose.before.yml"
OLD_ENV_BACKUP="$BACKUP_DIR/.env.before"
cp -p "$OLD_COMPOSE" "$OLD_COMPOSE_BACKUP"
cp -p "$ENV_FILE" "$OLD_ENV_BACKUP"

if [[ "$ASSUME_YES" != 1 ]]; then
  printf '\nThis will stop the existing services, load images, and update %s.\n' "$APP_DIR"
  printf 'Database and file backups will be written to %s.\n' "$BACKUP_DIR"
  printf 'Continue? [y/N] '
  read -r answer
  [[ "$answer" =~ ^[Yy]$ ]] || die "Upgrade cancelled"
fi

log "Checking image archive integrity"
gzip -t "$IMAGES_SOURCE"

log "Loading offline images"
docker load -i "$IMAGES_SOURCE"
for image in \
  "igor0670/customer-storage-backend:${VERSION}" \
  "igor0670/customer-storage-frontend:${VERSION}" \
  "mariadb:10.11" \
  "nginx:alpine"; do
  docker image inspect "$image" >/dev/null 2>&1 || die "Expected image was not found after docker load: $image"
done

DB_BACKUP="$BACKUP_DIR/database.sql.gz"
log "Creating MariaDB backup: $DB_BACKUP"
docker exec "$DB_CONTAINER" sh -c \
  'dump_bin=$(command -v mariadb-dump || command -v mysqldump) || exit 127; exec "$dump_bin" -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --events --triggers "$MYSQL_DATABASE"' \
  | gzip >"$DB_BACKUP"
gzip -t "$DB_BACKUP"
sha256sum "$DB_BACKUP" >"$DB_BACKUP.sha256"

BACKUP_PATHS=()
for path in .env data/mariadb uploads logs backups proxy docker-compose.yml; do
  [[ -e "$APP_DIR/$path" ]] && BACKUP_PATHS+=("$path")
done
[[ ${#BACKUP_PATHS[@]} -gt 0 ]] || die "No application files were found to back up"
FILE_BACKUP="$BACKUP_DIR/files.tar.gz"
log "Creating application file backup: $FILE_BACKUP"
tar -czf "$FILE_BACKUP" -C "$APP_DIR" "${BACKUP_PATHS[@]}"
sha256sum "$FILE_BACKUP" >"$FILE_BACKUP.sha256"

restore_old_application() {
  cp -p "$OLD_COMPOSE_BACKUP" "$OLD_COMPOSE"
  cp -p "$OLD_ENV_BACKUP" "$ENV_FILE"
}

rollback_application() {
  local rollback_log="$BACKUP_DIR/rollback.log"
  error "Attempting application rollback; database restore is intentionally not automatic"
  compose_command down >/dev/null 2>&1 || true
  restore_old_application
  if compose_command up -d --pull never >"$rollback_log" 2>&1; then
    log "Application rollback started successfully. See $rollback_log"
  else
    error "Application rollback failed. See $rollback_log"
  fi
}

UPGRADE_IN_PROGRESS=0
on_error() {
  local status=$?
  trap - ERR
  if [[ "$UPGRADE_IN_PROGRESS" == 1 ]]; then
    rollback_application || true
  fi
  exit "$status"
}
trap on_error ERR

log "Stopping existing services without removing volumes"
UPGRADE_IN_PROGRESS=1
compose_command down

log "Installing package compose file"
cp -p "$COMPOSE_SOURCE" "$OLD_COMPOSE"
set_env_value VERSION "$VERSION"
set_env_value NODE_ENV production

if ! compose_command config >/dev/null; then
  error "New Compose configuration is invalid"
  rollback_application
  exit 1
fi

log "Starting upgraded services"
if ! compose_command up -d --pull never; then
  rollback_application
  exit 1
fi

BACKEND_CONTAINER=$(compose_command ps -q backend 2>/dev/null || true)
[[ -n "$BACKEND_CONTAINER" ]] || BACKEND_CONTAINER=customer_backend
HEALTHY=0
for _ in $(seq 1 90); do
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$BACKEND_CONTAINER" 2>/dev/null || true)
  if [[ "$health" == healthy ]]; then
    HEALTHY=1
    break
  fi
  sleep 2
done

if [[ "$HEALTHY" != 1 ]]; then
  error "Backend did not become healthy"
  compose_command logs backend --tail=100 || true
  rollback_application
  exit 1
fi

PROXY_PORT=$(env_value PROXY_PORT || true)
PROXY_PORT=${PROXY_PORT:-2082}
if command -v curl >/dev/null 2>&1; then
  log "Checking proxy health endpoint on port $PROXY_PORT"
  if ! curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:${PROXY_PORT}/api/health" >/dev/null; then
    error "Proxy health endpoint failed"
    compose_command logs --tail=100 || true
    rollback_application
    exit 1
  fi
else
  log "curl is not installed; proxy HTTP check skipped"
fi

UPGRADE_IN_PROGRESS=0
log "Upgrade completed successfully"
compose_command ps
printf '\nBackups:\n  Database: %s\n  Files:    %s\n  Config:   %s\n' "$DB_BACKUP" "$FILE_BACKUP" "$BACKUP_DIR"
printf 'URL: http://127.0.0.1:%s\n' "$PROXY_PORT"
