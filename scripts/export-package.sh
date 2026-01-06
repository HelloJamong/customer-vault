#!/bin/bash
# =============================================================================
# Customer Vault - 배포 패키지 생성 스크립트 (온라인 환경용)
# =============================================================================
# 용도: Docker 이미지를 빌드하고 오프라인 환경으로 이전할 패키지 생성
# 실행: ./scripts/export-package.sh [버전]
# 예시: ./scripts/export-package.sh 2.1.2
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

# 버전 인자 확인
VERSION=${1:-"2.1.2"}
log_info "배포 패키지 버전: ${VERSION}"

# 프로젝트 루트 디렉토리로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

log_info "프로젝트 루트: $PROJECT_ROOT"

# 패키지 디렉토리 생성
PACKAGE_NAME="customer_vault_${VERSION}_package"
PACKAGE_DIR="${PROJECT_ROOT}/${PACKAGE_NAME}"
TAR_FILE="${PROJECT_ROOT}/customer_vault_${VERSION}_package.tar.gz"

log_info "패키지 디렉토리 생성 중: ${PACKAGE_DIR}"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 1. Docker 이미지 빌드 및 태그 변환
log_info "=========================================="
log_info "1단계: Docker 이미지 빌드 및 태그 변환"
log_info "=========================================="

log_info "Backend 이미지 빌드 중..."
docker build -t customer_backend:${VERSION} ./backend
log_success "Backend 이미지 빌드 완료"

log_info "Frontend 이미지 빌드 중..."
docker build -t customer_frontend:${VERSION} ./frontend
log_success "Frontend 이미지 빌드 완료"

# Docker Hub 이미지가 있다면 로컬 태그로도 생성
log_info "Docker Hub 이미지 확인 중..."
if docker images | grep -q "igor0670/customer-storage-backend"; then
    log_info "Docker Hub 이미지를 로컬 태그로 변환 중..."
    docker tag igor0670/customer-storage-backend:${VERSION} customer_backend:${VERSION} 2>/dev/null || true
    docker tag igor0670/customer-storage-frontend:${VERSION} customer_frontend:${VERSION} 2>/dev/null || true
    log_success "이미지 태그 변환 완료"
fi

# 2. Docker 이미지 저장
log_info "=========================================="
log_info "2단계: Docker 이미지 저장"
log_info "=========================================="

IMAGE_TAR="${PACKAGE_DIR}/images.tar"
log_info "이미지를 tar 파일로 저장 중..."
docker save -o "$IMAGE_TAR" \
    customer_backend:${VERSION} \
    customer_frontend:${VERSION} \
    nginx:alpine \
    mariadb:10.11

log_success "이미지 저장 완료: $(du -h "$IMAGE_TAR" | cut -f1)"

# 3. 필요한 파일 복사
log_info "=========================================="
log_info "3단계: 설정 파일 복사"
log_info "=========================================="

# docker-compose.offline.yml 복사 (버전 업데이트)
log_info "오프라인용 docker-compose.yml 생성 중..."
sed "s/VERSION_PLACEHOLDER/${VERSION}/g" docker-compose.offline.yml > "${PACKAGE_DIR}/docker-compose.yml"
log_success "docker-compose.yml 생성 완료 (버전: ${VERSION})"

# 기타 설정 파일 복사
log_info "설정 파일 복사 중..."
cp -r proxy "${PACKAGE_DIR}/"
cp README.md "${PACKAGE_DIR}/" 2>/dev/null || true

# Prisma 마이그레이션 파일 복사 (DB 스키마 변경이 있는 경우)
if [ -d "backend/prisma/migrations" ]; then
    log_info "Prisma 마이그레이션 파일 복사..."
    mkdir -p "${PACKAGE_DIR}/prisma"
    cp -r backend/prisma/migrations "${PACKAGE_DIR}/prisma/"
    cp backend/prisma/schema.prisma "${PACKAGE_DIR}/prisma/"
    
    # 마이그레이션 개수 확인
    MIGRATION_COUNT=$(find backend/prisma/migrations -type d -mindepth 1 | wc -l)
    log_success "Prisma 마이그레이션 ${MIGRATION_COUNT}개 복사 완료"
    
    # 마이그레이션 요약 생성
    log_info "마이그레이션 요약 생성 중..."
    cat > "${PACKAGE_DIR}/MIGRATIONS.md" << 'MIGRATIONS_EOF'
# DB 마이그레이션 가이드

## 포함된 마이그레이션

MIGRATIONS_EOF
    
    # 각 마이그레이션 디렉토리 나열
    find backend/prisma/migrations -type d -mindepth 1 -maxdepth 1 | sort | while read -r migration_dir; do
        migration_name=$(basename "$migration_dir")
        echo "- $migration_name" >> "${PACKAGE_DIR}/MIGRATIONS.md"
        if [ -f "$migration_dir/migration.sql" ]; then
            echo "  \`\`\`sql" >> "${PACKAGE_DIR}/MIGRATIONS.md"
            head -20 "$migration_dir/migration.sql" >> "${PACKAGE_DIR}/MIGRATIONS.md"
            echo "  \`\`\`" >> "${PACKAGE_DIR}/MIGRATIONS.md"
            echo "" >> "${PACKAGE_DIR}/MIGRATIONS.md"
        fi
    done
    
    cat >> "${PACKAGE_DIR}/MIGRATIONS.md" << 'MIGRATIONS_EOF'

## 마이그레이션 적용 방법

### 자동 적용 (권장)
```bash
./import-package.sh
# 스크립트가 자동으로 마이그레이션 확인 및 적용
```

### 수동 적용
```bash
# 1. DB 백업
docker exec customer_db mysqldump -u root -p<PASSWORD> customer_db > backup_before_migration.sql

# 2. 마이그레이션 상태 확인
docker compose exec backend npx prisma migrate status

# 3. 마이그레이션 적용
docker compose exec backend npx prisma migrate deploy

# 4. 적용 확인
docker compose exec backend npx prisma migrate status
```

## 롤백 방법

Prisma Migrate는 자동 롤백을 지원하지 않습니다. 롤백이 필요한 경우:

```bash
# 1. 서비스 중지
docker compose stop backend

# 2. DB 복원
docker exec -i customer_db mysql -u root -p<PASSWORD> customer_db < backup_before_migration.sql

# 3. 이전 버전 컨테이너로 복원
docker compose up -d
```

## 주의사항

- **반드시 배포 전 DB 백업 필수!**
- 마이그레이션은 운영 DB의 데이터를 유지하면서 스키마만 변경합니다
- 대규모 테이블의 컬럼 추가/변경은 시간이 걸릴 수 있습니다
- 마이그레이션 실패 시 즉시 롤백하세요

MIGRATIONS_EOF
    
    log_success "마이그레이션 가이드 생성 완료"
else
    log_info "Prisma 마이그레이션 없음 - DB 스키마 변경 없음"
fi

# 4. 배포 가이드 생성
log_info "배포 가이드 생성 중..."
cat > "${PACKAGE_DIR}/DEPLOYMENT_GUIDE.md" << 'EOF'
# Customer Vault 오프라인 배포 가이드

## 버전: VERSION_PLACEHOLDER

## 배포 절차

### 1. 패키지 압축 해제
```bash
tar -xzf customer_vault_VERSION_PLACEHOLDER_package.tar.gz
cd customer_vault_VERSION_PLACEHOLDER_package
```

### 2. Docker 이미지 로드
```bash
docker load -i images.tar
docker images | grep customer  # 이미지 확인
```

### 3. 환경 설정
```bash
cp .env.example .env
vi .env  # 운영 환경에 맞게 수정
```

**필수 수정 항목:**
- `NODE_ENV=production`
- `JWT_SECRET` (128자 랜덤 문자열)
- `DB_PASSWORD` (강력한 비밀번호)
- `CORS_ORIGIN` (실제 도메인 또는 IP)

### 4. 기존 서비스 중지 (기존 환경인 경우)
```bash
# DB 백업 먼저!
docker exec customer_db mysqldump -u root -p<PASSWORD> customer_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 서비스 중지 (DB는 중지하지 않음)
docker stop customer_backend customer_frontend customer_proxy
```

### 5. 서비스 시작
```bash
docker compose up -d
```

### 6. DB 마이그레이션 (스키마 변경이 있는 경우)
```bash
docker compose exec backend npm run prisma:migrate:deploy
```

### 7. 서비스 확인
```bash
docker compose ps
docker compose logs -f backend frontend
```

### 8. 접속 테스트
- URL: http://<SERVER_IP>:2082
- 초기 계정: admin / 1111

## 롤백 방법

### 이전 이미지로 복원
```bash
docker compose stop backend frontend proxy
docker load -i <이전_버전_images.tar>
# docker-compose.yml에서 이미지 버전 변경
docker compose up -d
```

### DB 복원 (필요시)
```bash
docker exec -i customer_db mysql -u root -p<PASSWORD> customer_db < backup_YYYYMMDD_HHMMSS.sql
```

## 트러블슈팅

### 포트 충돌
```bash
# 사용 중인 포트 확인
sudo netstat -tulpn | grep :2082
# .env에서 PROXY_PORT 변경
```

### 권한 문제
```bash
sudo chown -R $(whoami):$(whoami) ./data ./uploads ./logs
chmod 755 ./data ./uploads ./logs
```

### 로그 확인
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs db
```
EOF

sed -i "s/VERSION_PLACEHOLDER/${VERSION}/g" "${PACKAGE_DIR}/DEPLOYMENT_GUIDE.md"
log_success "배포 가이드 생성 완료"

# 5. import 스크립트 복사
log_info "import 스크립트 복사..."
cp "${SCRIPT_DIR}/import-package.sh" "${PACKAGE_DIR}/"
chmod +x "${PACKAGE_DIR}/import-package.sh"

# 6. 패키지 압축
log_info "=========================================="
log_info "4단계: 패키지 압축"
log_info "=========================================="

log_info "패키지 압축 중... (시간이 걸릴 수 있습니다)"
tar -czf "$TAR_FILE" -C "$PROJECT_ROOT" "$PACKAGE_NAME"

# 임시 디렉토리 삭제
rm -rf "$PACKAGE_DIR"

# 7. 완료 메시지
log_info "=========================================="
log_success "배포 패키지 생성 완료!"
log_info "=========================================="
echo ""
log_info "패키지 파일: ${TAR_FILE}"
log_info "패키지 크기: $(du -h "$TAR_FILE" | cut -f1)"
echo ""
log_info "다음 단계:"
echo "  1. 패키지를 오프라인 서버로 복사"
echo "     scp $TAR_FILE user@offline-server:/path/"
echo "     또는 USB 등 물리적 매체 사용"
echo ""
echo "  2. 오프라인 서버에서 압축 해제"
echo "     tar -xzf customer_vault_${VERSION}_package.tar.gz"
echo "     cd customer_vault_${VERSION}_package"
echo ""
echo "  3. import 스크립트 실행"
echo "     ./import-package.sh"
echo ""
log_warn "배포 전 반드시 DB를 백업하세요!"
