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

log_info "=========================================="
log_info "Customer Vault 오프라인 배포 시작"
log_info "=========================================="

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

# 기존 서비스 확인
log_info "3단계: 기존 서비스 확인"
if docker ps -a | grep -q "customer_backend\|customer_frontend"; then
    log_warn "기존 서비스가 실행 중입니다."
    read -p "기존 서비스를 중지하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "DB 백업을 권장합니다."
        read -p "DB를 백업하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
            log_info "DB 백업 중..."
            read -p "DB root 비밀번호를 입력하세요: " -s DB_PASSWORD
            echo
            docker exec customer_db mysqldump -u root -p"${DB_PASSWORD}" customer_db > "$BACKUP_FILE" || {
                log_error "DB 백업 실패"
                exit 1
            }
            log_success "DB 백업 완료: $BACKUP_FILE"
        fi
        
        log_info "서비스 중지 중..."
        docker stop customer_backend customer_frontend customer_proxy 2>/dev/null || true
        log_success "서비스 중지 완료"
    else
        log_warn "배포를 취소합니다."
        exit 0
    fi
fi

# Docker 이미지 로드
log_info "4단계: Docker 이미지 로드"
log_info "이미지 로드 중... (시간이 걸릴 수 있습니다)"
docker load -i images.tar
log_success "이미지 로드 완료"

# 로드된 이미지 확인
log_info "로드된 이미지:"
docker images | grep -E "customer_backend|customer_frontend|nginx|mariadb" | head -10

# 환경 설정 확인
log_info "5단계: 환경 설정 확인"
if [ ! -f ".env" ]; then
    log_warn ".env 파일이 없습니다."
    log_warn "기존 운영 환경의 .env 파일을 이 디렉토리에 복사하거나,"
    log_warn "새로운 .env 파일을 생성해주세요."
    log_error "배포를 계속할 수 없습니다."
    echo ""
    log_info ".env 파일 생성 예시:"
    echo "  cp /path/to/existing/customer-vault/.env ."
    echo "  또는 직접 생성: vi .env"
    exit 1
else
    log_success ".env 파일 확인 완료"
    log_info "기존 환경 설정을 사용합니다."
fi

# 필요한 디렉토리 생성
log_info "6단계: 디렉토리 준비"
mkdir -p data/mariadb uploads logs
chmod 755 data uploads logs
log_success "디렉토리 준비 완료"

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
    
    # .env에서 DB 정보 읽기
    log_info ".env 파일에서 DB 접속 정보 읽는 중..."
    if [ ! -f ".env" ]; then
        log_error ".env 파일이 없습니다."
        exit 1
    fi
    
    # .env 파일 파싱 (주석 제외, 공백 제거)
    DB_ROOT_PASSWORD=$(grep "^DB_ROOT_PASSWORD=" .env | cut -d '=' -f2- | tr -d ' "' | tr -d "'")
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2- | tr -d ' "' | tr -d "'" || echo "customer_db")
    DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2- | tr -d ' "' | tr -d "'" || echo "customer_user")
    
    if [ -z "$DB_ROOT_PASSWORD" ]; then
        log_error "DB_ROOT_PASSWORD가 .env 파일에 설정되어 있지 않습니다."
        exit 1
    fi
    
    log_success "DB 접속 정보 확인 완료 (DB: ${DB_NAME})"
    
    # 자동 DB 백업
    BACKUP_FILE="backup_before_migration_$(date +%Y%m%d_%H%M%S).sql"
    log_info "⚠️  마이그레이션 적용 전 자동 DB 백업 시작..."
    log_info "백업 파일: ${BACKUP_FILE}"
    
    # DB 컨테이너 실행 확인
    if ! docker ps | grep -q "customer_db"; then
        log_error "DB 컨테이너(customer_db)가 실행 중이 아닙니다."
        log_info "DB를 먼저 시작합니다..."
        docker compose up -d db
        log_info "DB 시작 대기 중... (30초)"
        sleep 30
    fi
    
    # DB 백업 실행
    if docker exec customer_db mysqldump -u root -p"${DB_ROOT_PASSWORD}" "${DB_NAME}" > "$BACKUP_FILE" 2>/dev/null; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "✓ DB 백업 완료: ${BACKUP_FILE} (${BACKUP_SIZE})"
    else
        log_error "✗ DB 백업 실패!"
        log_error "DB 접속 정보를 확인하세요:"
        echo "  - DB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:0:3}***"
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
        echo "  2. docker exec -i customer_db mysql -u root -p${DB_ROOT_PASSWORD:0:3}*** ${DB_NAME} < ${BACKUP_FILE}"
        echo "  3. docker compose up -d"
    else
        log_error "✗ 마이그레이션 실패!"
        log_error "즉시 DB를 복원하세요:"
        echo ""
        echo "  docker compose stop backend"
        echo "  docker exec -i customer_db mysql -u root -p\"${DB_ROOT_PASSWORD}\" ${DB_NAME} < ${BACKUP_FILE}"
        echo "  docker compose up -d"
        echo ""
        read -p "지금 자동으로 롤백하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "롤백 진행 중..."
            docker compose stop backend
            docker exec -i customer_db mysql -u root -p"${DB_ROOT_PASSWORD}" "${DB_NAME}" < "${BACKUP_FILE}"
            docker compose up -d
            log_success "롤백 완료"
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
echo "  - 초기 계정: admin / 1111"
echo ""
log_info "유용한 명령어:"
echo "  - 서비스 상태: docker compose ps"
echo "  - 로그 확인: docker compose logs -f backend frontend"
echo "  - 서비스 중지: docker compose stop"
echo "  - 서비스 재시작: docker compose restart"
echo ""
log_info "DB 관련 명령어:"
echo "  - 마이그레이션 상태: docker compose exec backend npx prisma migrate status"
echo "  - DB 백업: docker exec customer_db mysqldump -u root -p<PASSWORD> customer_db > backup.sql"
echo ""
log_info "트러블슈팅:"
echo "  - 배포 가이드: cat DEPLOYMENT_GUIDE.md"
if [ -f "MIGRATIONS.md" ]; then
    echo "  - 마이그레이션 가이드: cat MIGRATIONS.md"
fi
echo "  - 로그 확인: docker compose logs backend"
echo ""
log_warn "문제가 있다면 로그를 확인하세요!"
