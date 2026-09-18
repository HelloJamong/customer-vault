#!/bin/bash
# =============================================================================
# Customer Vault - 배포 패키지 설치 스크립트 (오프라인 환경용)
# =============================================================================
# 용도: 오프라인 환경에서 Docker 이미지를 로드하고 서비스 배포
# 실행: ./import-package.sh
# =============================================================================

set -e  # 에러 발생 시 스크립트 중단

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 스크립트 실행 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKUP_CRYPTO_ENV=""
DB_BACKUP_PLAIN=""

cleanup_temporary_backup_material() {
    [[ -z "$DB_BACKUP_PLAIN" || ! -f "$DB_BACKUP_PLAIN" ]] || rm -f "$DB_BACKUP_PLAIN"
    [[ -z "$BACKUP_CRYPTO_ENV" || ! -f "$BACKUP_CRYPTO_ENV" ]] || rm -f "$BACKUP_CRYPTO_ENV"
}
trap cleanup_temporary_backup_material EXIT

log_info "=========================================="
log_info "Customer Vault 오프라인 배포 시작"
log_info "=========================================="
log_info "이 스크립트는 오프라인 환경에서 실행됩니다."
log_info "인터넷 연결 없이 사전 빌드된 이미지를 사용합니다."

# 필수 파일 확인
log_info "1단계: 필수 파일 확인"
REQUIRED_FILES=("images.tar" "docker-compose.yml" "DEPLOYMENT_GUIDE.md")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    log_error "필수 파일이 없습니다:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
fi
log_success "필수 파일 확인 완료"
if [ ! -d "prisma/migrations" ] || ! find prisma/migrations -mindepth 1 -maxdepth 1 -type f -name migration.sql -print -quit | grep -q .; then
    log_error "Prisma 마이그레이션 파일이 없는 패키지는 운영 설치/업그레이드에 사용할 수 없습니다."
    exit 1
fi

# Docker 설치 확인
log_info "2단계: Docker 확인"
if ! command -v docker &> /dev/null; then
    log_error "Docker가 설치되어 있지 않습니다."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    log_error "Docker Compose가 설치되어 있지 않습니다."
    exit 1
fi

log_success "Docker 확인 완료 ($(docker --version))"

# 환경 설정 확인 (암호화 백업 키는 기존 운영 .env에서 유지해야 함)
log_info "3단계: 환경 설정 확인"
if [ ! -f ".env" ]; then
    log_warn ".env 파일이 없습니다. 기존 운영 환경의 .env 파일을 복사해주세요."
    exit 1
fi

env_value() {
    local key=$1
    awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' .env
}

ENCRYPTION_KEY_VALUE=$(env_value ENCRYPTION_KEY || true)
BACKUP_ENCRYPTION_KEY_VALUE=$(env_value BACKUP_ENCRYPTION_KEY || true)
if [[ ! "$ENCRYPTION_KEY_VALUE" =~ ^[0-9a-fA-F]{64}$ ]]; then
    log_error "ENCRYPTION_KEY가 .env에 없거나 64자리 hex 형식이 아닙니다."
    exit 1
fi
if [[ ! "$BACKUP_ENCRYPTION_KEY_VALUE" =~ ^[0-9a-fA-F]{64}$ || "${BACKUP_ENCRYPTION_KEY_VALUE,,}" == "${ENCRYPTION_KEY_VALUE,,}" ]]; then
    log_error "BACKUP_ENCRYPTION_KEY가 .env에 없거나 64자리 hex 형식이 아닙니다."
    log_error "기존 운영 백업을 복원할 수 있도록 업그레이드 전 키를 반드시 유지해야 합니다."
    exit 1
fi
log_success ".env 및 백업 암호화 키 확인 완료"

# Docker 이미지 로드 (사전 백업 암호화 CLI를 사용하기 위해 먼저 로드)
log_info "4단계: Docker 이미지 로드"
log_info "이미지 로드 중... (시간이 걸릴 수 있습니다)"
docker load -i images.tar
log_success "이미지 로드 완료"

BACKEND_IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'customer-storage-backend|customer_backend' | head -1 || true)
if [ -z "$BACKEND_IMAGE" ]; then
    log_error "백업 암호화 CLI를 포함한 백엔드 이미지를 찾을 수 없습니다."
    exit 1
fi

BACKUP_CRYPTO_ENV=$(mktemp)
chmod 600 "$BACKUP_CRYPTO_ENV"
printf 'BACKUP_ENCRYPTION_KEY=%s\n' "$BACKUP_ENCRYPTION_KEY_VALUE" >"$BACKUP_CRYPTO_ENV"

run_backup_crypto() {
    docker run --rm \
        --network none \
        --entrypoint node \
        --env-file "$BACKUP_CRYPTO_ENV" \
        --user "$(id -u):$(id -g)" \
        -v "$SCRIPT_DIR:/backup" \
        "$BACKEND_IMAGE" \
        /app/dist/backup/backup-crypto-cli.js "$@"
}

# DB 비밀번호는 컨테이너 내부 환경에서만 사용한다.
DB_CONTAINER=$(docker compose ps -q db 2>/dev/null || true)
DB_CONTAINER=${DB_CONTAINER:-customer_db}

create_database_backup() {
    local output_path=$1
    docker exec "$DB_CONTAINER" sh -c \
        'set -eu; dump_bin=$(command -v mariadb-dump || command -v mysqldump) || exit 127; config=$(mktemp); trap '\''rm -f "$config"'\'' EXIT; chmod 600 "$config"; printf "[client]\nuser=root\npassword=%s\n" "$MYSQL_ROOT_PASSWORD" >"$config"; "$dump_bin" --defaults-extra-file="$config" --single-transaction --routines --events --triggers "$MYSQL_DATABASE"' \
        | gzip >"$output_path"
    gzip -t "$output_path"
}

wait_for_database() {
    DB_CONTAINER=$(docker compose ps -q db 2>/dev/null || true)
    DB_CONTAINER=${DB_CONTAINER:-customer_db}
    for _ in $(seq 1 90); do
        if [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' "$DB_CONTAINER" 2>/dev/null || true)" = "healthy" ]; then
            return 0
        fi
        sleep 2
    done
    log_error "DB 컨테이너가 healthy 상태가 되지 않았습니다."
    return 1
}

prepare_migrations() {
    log_info "마이그레이션 사전 점검을 위해 DB만 시작합니다."
    docker compose up -d db
    wait_for_database

    PREMIGRATION_BACKUP_PLAIN="$SCRIPT_DIR/backup_before_migration_$(date +%Y%m%d_%H%M%S).sql.gz"
    PREMIGRATION_BACKUP_FILE="${PREMIGRATION_BACKUP_PLAIN}.enc"
    DB_BACKUP_PLAIN="$PREMIGRATION_BACKUP_PLAIN"
    create_database_backup "$PREMIGRATION_BACKUP_PLAIN"
    run_backup_crypto encrypt "/backup/$(basename "$PREMIGRATION_BACKUP_PLAIN")"
    DB_BACKUP_PLAIN=""
    log_success "마이그레이션 전 암호화 DB 백업 완료: $PREMIGRATION_BACKUP_FILE"

    local migration_log="$SCRIPT_DIR/migration-preflight.log"
    local status
    local initial_migration
    set +e
    docker compose run --rm --no-deps --entrypoint npx backend prisma migrate deploy >"$migration_log" 2>&1
    status=$?
    set -e
    cat "$migration_log"
    if [ "$status" -eq 0 ]; then
        return 0
    fi
    if ! grep -q "P3005" "$migration_log"; then
        return "$status"
    fi

    initial_migration=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | head -n 1)
    if [ -z "$initial_migration" ]; then
        log_error "기존 DB 기준점 처리를 위한 초기 마이그레이션을 찾을 수 없습니다."
        return 1
    fi
    log_info "기존 DB에 마이그레이션 이력이 없어 기준 마이그레이션만 적용 처리합니다: $initial_migration"
    docker compose run --rm --no-deps --entrypoint npx backend prisma migrate resolve --applied "$initial_migration"
    docker compose run --rm --no-deps --entrypoint npx backend prisma migrate deploy
}

# 기존 서비스 확인
log_info "5단계: 기존 서비스 확인"
if docker ps -a | grep -q "customer_backend\|customer_frontend"; then
    log_warn "기존 서비스가 실행 중입니다."
    read -p "기존 서비스를 중지하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "DB 백업을 권장합니다."
        read -p "DB를 백업하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            BACKUP_FILE_PLAIN="$SCRIPT_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz"
            BACKUP_FILE="${BACKUP_FILE_PLAIN}.enc"
            log_info "DB 백업 중..."
            if ! create_database_backup "$BACKUP_FILE_PLAIN"; then
                log_error "DB 백업 실패"
                exit 1
            fi
            run_backup_crypto encrypt "/backup/$(basename "$BACKUP_FILE_PLAIN")"
            DB_BACKUP_PLAIN=""
            log_success "암호화 DB 백업 완료: $BACKUP_FILE"
        fi
        
        log_info "서비스 중지 중..."
        docker stop customer_backend customer_frontend customer_proxy 2>/dev/null || true
        log_success "서비스 중지 완료"
    else
        log_warn "배포를 취소합니다."
        exit 0
    fi
fi

# 로드된 이미지 확인
log_info "로드된 이미지:"
docker images | grep -E "customer_backend|customer_frontend|nginx|mariadb|clamav" | head -10

# 필요한 디렉토리 생성
log_info "6단계: 디렉토리 준비"
mkdir -p data/mariadb uploads logs
chmod 755 data uploads logs
log_success "디렉토리 준비 완료"

prepare_migrations

# 서비스 시작
log_info "7단계: 서비스 시작"
log_info "Docker Compose로 서비스 시작 중..."
docker compose up -d

log_info "서비스 시작 대기 중... (30초)"
sleep 30

# 서비스 상태 확인
log_info "8단계: 서비스 상태 확인"
docker compose ps

# DB 마이그레이션 확인 및 적용
log_info "9단계: DB 마이그레이션 확인"
if [ -d "prisma/migrations" ]; then
    MIGRATION_COUNT=$(find prisma/migrations -type d -mindepth 1 | wc -l)
    log_warn "DB 스키마 변경이 감지되었습니다! (마이그레이션 ${MIGRATION_COUNT}개)"
    
    if [ -f "MIGRATIONS.md" ]; then
        log_info "마이그레이션 상세 정보:"
        echo "----------------------------------------"
        cat MIGRATIONS.md | head -30
        echo "----------------------------------------"
        echo ""
    fi
    
    # DB 정보는 메타데이터만 읽고, 비밀번호는 DB 컨테이너 내부에서 사용한다.
    DB_NAME=$(env_value DB_NAME || echo "customer_db")
    log_success "DB 접속 정보 확인 완료 (DB: ${DB_NAME})"
    
    # 마이그레이션 사전 점검 단계에서 생성한 백업을 사용한다.
    BACKUP_FILE="${PREMIGRATION_BACKUP_FILE:-}"
    log_info "⚠️  마이그레이션 적용 전 자동 DB 백업 시작..."
    log_info "백업 파일: ${BACKUP_FILE}"
    
    # DB 백업은 prepare_migrations에서 이미 생성되었다.
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "✓ DB 백업 완료: ${BACKUP_FILE} (${BACKUP_SIZE})"
    else
        log_error "✗ DB 백업 실패!"
        log_error "DB 컨테이너의 MYSQL_ROOT_PASSWORD와 접속 상태를 확인하세요."
        echo "  - DB_NAME: ${DB_NAME}"
        read -p "백업 없이 계속 진행하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "마이그레이션을 중단합니다."
            exit 1
        fi
        log_warn "백업 없이 진행합니다. (위험!)"
    fi
    
    # 마이그레이션 상태 확인
    echo ""
    log_info "마이그레이션 상태 확인 중..."
    docker compose exec backend npx prisma migrate status || {
        log_warn "마이그레이션 상태 확인 실패 (정상일 수 있음)"
    }
    
    # 자동 마이그레이션 적용
    echo ""
    log_info "마이그레이션 자동 적용 시작..."
    log_warn "⚠️  운영 DB 스키마가 변경됩니다! (데이터는 유지됨)"
    
    if docker compose exec backend npx prisma migrate deploy; then
        log_success "✓ DB 마이그레이션 완료!"
        echo ""
        log_info "마이그레이션 후 상태:"
        docker compose exec backend npx prisma migrate status
        echo ""
        log_info "백업 파일 위치: ${BACKUP_FILE}"
        log_info "롤백이 필요한 경우:"
        echo "  1. docker compose stop backend"
        echo "  2. 백업 암호화 키로 ${BACKUP_FILE}을 복호화한 뒤, DB 컨테이너 내부 자격 증명으로 복원"
        echo "  3. docker compose up -d"
    else
        log_error "✗ 마이그레이션 실패!"
        log_error "즉시 DB를 복원하세요:"
        echo ""
        echo "  docker compose stop backend"
        echo "  백업 암호화 키로 ${BACKUP_FILE}을 별도 안전한 디렉터리에서 복호화한 뒤, DB 클라이언트의 안전한 인증 설정 파일로 복원"
        echo "  docker compose up -d"
        echo ""
        read -p "지금 자동으로 롤백하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "애플리케이션 롤백 진행 중..."
            docker compose stop backend
            docker compose up -d
            log_warn "애플리케이션만 롤백했습니다. DB는 암호화 백업을 검증한 후 수동 복원하세요."
        fi
        exit 1
    fi
else
    log_info "DB 스키마 변경 없음 - 마이그레이션 불필요"
fi

# 완료
log_info "=========================================="
log_success "배포 완료!"
log_info "=========================================="
echo ""
log_info "서비스 접속 정보:"
PROXY_PORT=$(grep PROXY_PORT .env | cut -d '=' -f2 || echo "2082")
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "  - URL: http://${SERVER_IP}:${PROXY_PORT}"
echo "  - 초기 계정: admin / .env의 INITIAL_ADMIN_PASSWORD 값 (최초 설치 시에만 사용)"
echo ""
log_info "유용한 명령어:"
echo "  - 서비스 상태: docker compose ps"
echo "  - 로그 확인: docker compose logs -f backend frontend"
echo "  - 서비스 중지: docker compose stop"
echo "  - 서비스 재시작: docker compose restart"
echo ""
log_info "DB 관련 명령어:"
echo "  - 마이그레이션 상태: docker compose exec backend npx prisma migrate status"
echo "  - DB 백업: 이 스크립트가 백업 암호화 키로 .sql.gz.enc 파일을 생성합니다."
echo ""
log_info "트러블슈팅:"
echo "  - 배포 가이드: cat DEPLOYMENT_GUIDE.md"
if [ -f "MIGRATIONS.md" ]; then
    echo "  - 마이그레이션 가이드: cat MIGRATIONS.md"
fi
echo "  - 로그 확인: docker compose logs backend"
echo ""
log_warn "문제가 있다면 로그를 확인하세요!"
