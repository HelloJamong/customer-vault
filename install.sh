#!/bin/bash

# Customer Storage 자동 설치 스크립트
# 사용법: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/customer-storage/main/install.sh | bash

set -e

echo "======================================"
echo "Customer Storage 자동 설치"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker 설치 확인
echo "1. Docker 설치 확인 중..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker가 설치되지 않았습니다.${NC}"
    echo "Docker 설치 가이드: https://docs.docker.com/engine/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker 설치 확인 완료${NC}"

# Docker Compose 설치 확인
echo "2. Docker Compose 설치 확인 중..."
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose가 설치되지 않았습니다.${NC}"
    echo "Docker Compose 설치 가이드: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose 설치 확인 완료${NC}"

# 설치 디렉토리 생성
INSTALL_DIR="customer-storage"
echo ""
echo "3. 설치 디렉토리 설정 중..."
read -p "설치 경로를 입력하세요 (기본값: ./customer-storage): " USER_DIR
INSTALL_DIR="${USER_DIR:-$INSTALL_DIR}"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠ 디렉토리가 이미 존재합니다: $INSTALL_DIR${NC}"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치를 취소합니다."
        exit 1
    fi
else
    mkdir -p "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
echo -e "${GREEN}✓ 설치 디렉토리: $(pwd)${NC}"

# 필요한 디렉토리 생성
echo ""
echo "4. 필요한 디렉토리 생성 중..."
mkdir -p data/mariadb uploads logs
echo -e "${GREEN}✓ 디렉토리 생성 완료${NC}"

# docker-compose.yml 다운로드
echo ""
echo "5. 설정 파일 다운로드 중..."
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  db:
    image: mariadb:10.11
    container_name: customer_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${DB_NAME:-customer_db}
      MYSQL_USER: ${DB_USER:-customer_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-customerpass}
    volumes:
      - ./data/mariadb:/var/lib/mysql
    networks:
      - customer_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 5s
      retries: 10

  web:
    image: hellojamong/customer-storage:latest
    container_name: customer_web
    restart: always
    environment:
      FLASK_APP: app.py
      FLASK_ENV: production
      FLASK_DEBUG: "False"
      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-customer_db}
      DB_USER: ${DB_USER:-customer_user}
      DB_PASSWORD: ${DB_PASSWORD:-customerpass}
      SECRET_KEY: ${SECRET_KEY}
      MAX_UPLOAD_SIZE: ${MAX_UPLOAD_SIZE:-16777216}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    ports:
      - "${HOST_PORT:-5001}:5000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - customer_network

networks:
  customer_network:
    driver: bridge
EOF
echo -e "${GREEN}✓ docker-compose.yml 생성 완료${NC}"

# .env 파일 생성
echo ""
echo "6. 환경 변수 파일 생성 중..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)

cat > .env <<EOF
# 데이터베이스 설정
DB_ROOT_PASSWORD=rootpassword_$(openssl rand -hex 8)
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=customerpass_$(openssl rand -hex 8)

# Flask 설정
SECRET_KEY=${SECRET_KEY}
FLASK_ENV=production
FLASK_DEBUG=False

# 포트 설정
HOST_PORT=5001

# 파일 업로드 크기 제한 (바이트, 기본값: 16MB)
MAX_UPLOAD_SIZE=16777216
EOF

chmod 600 .env
echo -e "${GREEN}✓ .env 파일 생성 완료 (랜덤 패스워드 자동 생성)${NC}"

# 업데이트 스크립트 생성
cat > update.sh <<'EOF'
#!/bin/bash
echo "======================================"
echo "Customer Storage 업데이트"
echo "======================================"
echo ""
echo "최신 이미지를 다운로드합니다..."
docker compose pull web
echo ""
echo "컨테이너를 재시작합니다..."
docker compose up -d
echo ""
echo "✓ 업데이트 완료!"
docker compose ps
EOF
chmod +x update.sh

# 실행 스크립트 생성
cat > start.sh <<'EOF'
#!/bin/bash
echo "Customer Storage 시작 중..."
docker compose up -d
echo ""
echo "✓ 시작 완료!"
echo ""
echo "접속 정보:"
echo "- URL: http://localhost:5001"
echo "- 기본 계정: admin / 1111"
echo ""
echo "로그 확인: docker compose logs -f"
EOF
chmod +x start.sh

# 중지 스크립트 생성
cat > stop.sh <<'EOF'
#!/bin/bash
echo "Customer Storage 중지 중..."
docker compose down
echo "✓ 중지 완료!"
EOF
chmod +x stop.sh

echo -e "${GREEN}✓ 관리 스크립트 생성 완료${NC}"

# 설치 완료
echo ""
echo "======================================"
echo -e "${GREEN}설치가 완료되었습니다!${NC}"
echo "======================================"
echo ""
echo "다음 단계:"
echo "1. 시작하기:"
echo "   cd $INSTALL_DIR"
echo "   ./start.sh"
echo ""
echo "2. 접속하기:"
echo "   http://localhost:5001"
echo "   기본 계정: admin / 1111"
echo ""
echo "3. 관리 명령어:"
echo "   - 시작: ./start.sh"
echo "   - 중지: ./stop.sh"
echo "   - 업데이트: ./update.sh"
echo "   - 로그 확인: docker compose logs -f"
echo ""
echo -e "${YELLOW}⚠ 보안 주의사항:${NC}"
echo "   - 최초 로그인 후 반드시 새 슈퍼관리자 계정을 생성하세요"
echo "   - .env 파일의 비밀번호를 변경하세요"
echo ""

# 자동 시작 여부 확인
read -p "지금 바로 시작하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start.sh
fi
