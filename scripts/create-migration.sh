#!/bin/bash
# =============================================================================
# Customer Vault - Prisma 마이그레이션 생성 스크립트 (개발 환경용)
# =============================================================================
# 용도: Prisma 스키마 변경 후 마이그레이션 파일 생성
# 실행: ./scripts/create-migration.sh "마이그레이션 설명"
# 예시: ./scripts/create-migration.sh "add_user_department_column"
# =============================================================================

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 마이그레이션 이름 확인
if [ -z "$1" ]; then
    log_error "마이그레이션 이름을 입력해주세요."
    echo "사용법: ./scripts/create-migration.sh \"마이그레이션_설명\""
    echo "예시: ./scripts/create-migration.sh \"add_user_department\""
    exit 1
fi

MIGRATION_NAME=$1

# 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

log_info "=========================================="
log_info "Prisma 마이그레이션 생성"
log_info "=========================================="

# Backend 디렉토리 확인
if [ ! -d "backend" ]; then
    log_error "backend 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# Prisma 스키마 확인
if [ ! -f "backend/prisma/schema.prisma" ]; then
    log_error "backend/prisma/schema.prisma 파일을 찾을 수 없습니다."
    exit 1
fi

log_info "마이그레이션 이름: ${MIGRATION_NAME}"
log_info "Prisma 스키마: backend/prisma/schema.prisma"

# 서비스 실행 확인
if ! docker compose ps | grep -q "customer_backend.*Up"; then
    log_warn "Backend 서비스가 실행 중이 아닙니다."
    read -p "서비스를 시작하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "서비스 시작 중..."
        docker compose up -d
        sleep 10
    else
        log_error "Backend 서비스가 필요합니다."
        exit 1
    fi
fi

# 스키마 변경 확인
log_info "Prisma 스키마 변경 사항 확인 중..."
echo ""
docker compose exec backend npx prisma migrate status || true

echo ""
log_warn "⚠️  주의사항:"
echo "  1. backend/prisma/schema.prisma 파일을 수정했는지 확인하세요"
echo "  2. 마이그레이션은 개발 DB에 즉시 적용됩니다"
echo "  3. 생성된 마이그레이션 파일은 Git에 커밋해야 합니다"
echo ""

read -p "마이그레이션을 생성하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "취소되었습니다."
    exit 0
fi

# 마이그레이션 생성
log_info "마이그레이션 생성 중..."
docker compose exec backend npx prisma migrate dev --name "$MIGRATION_NAME"

log_success "마이그레이션 생성 완료!"

# 생성된 마이그레이션 확인
LATEST_MIGRATION=$(find backend/prisma/migrations -type d -maxdepth 1 | sort | tail -1)
if [ -n "$LATEST_MIGRATION" ]; then
    log_info "생성된 마이그레이션: $(basename "$LATEST_MIGRATION")"
    echo ""
    log_info "마이그레이션 SQL:"
    echo "----------------------------------------"
    cat "$LATEST_MIGRATION/migration.sql"
    echo "----------------------------------------"
fi

echo ""
log_info "다음 단계:"
echo "  1. 생성된 마이그레이션 파일 확인"
echo "     ls -la backend/prisma/migrations/"
echo ""
echo "  2. Git에 커밋"
echo "     git add backend/prisma/migrations/"
echo "     git commit -m \"feat: ${MIGRATION_NAME}\""
echo ""
echo "  3. 운영 환경 배포 시 자동으로 마이그레이션 적용됨"
echo "     ./scripts/export-package.sh"
echo ""
log_warn "중요: 마이그레이션 파일을 반드시 Git에 커밋하세요!"
