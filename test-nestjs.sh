#!/bin/bash

# NestJS 백엔드 테스트 스크립트
# 사용법: ./test-nestjs.sh [start|stop|restart|logs|clean]

set -e

COMPOSE_FILE="docker-compose.nestjs.yml"
ENV_FILE=".env.nestjs"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 파일 확인
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo_warn "$ENV_FILE 파일이 없습니다. .env.nestjs.example에서 복사합니다..."
        cp .env.nestjs.example "$ENV_FILE"
        echo_info "$ENV_FILE 파일이 생성되었습니다. 필요시 수정하세요."
    fi
}

# Docker 및 Docker Compose 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo_error "Docker가 설치되어 있지 않습니다."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo_error "Docker Compose가 설치되어 있지 않습니다."
        exit 1
    fi

    echo_info "Docker 버전: $(docker --version)"
    echo_info "Docker Compose 버전: $(docker-compose --version)"
}

# 컨테이너 시작
start() {
    echo_info "NestJS 백엔드 컨테이너를 시작합니다..."
    check_env
    check_docker

    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

    echo_info "컨테이너가 시작되었습니다. 상태를 확인합니다..."
    sleep 5
    docker-compose -f "$COMPOSE_FILE" ps

    echo ""
    echo_info "========================================="
    echo_info "서버 접속 정보:"
    echo_info "  - API: http://localhost:5000"
    echo_info "  - Swagger: http://localhost:5000/api/docs"
    echo_info "  - Database: localhost:3306"
    echo_info "========================================="
    echo ""
    echo_warn "데이터베이스 마이그레이션이 필요하면 다음 명령어를 실행하세요:"
    echo "  docker-compose -f $COMPOSE_FILE exec backend npx prisma migrate deploy"
    echo ""
    echo_info "로그를 보려면: ./test-nestjs.sh logs"
}

# 컨테이너 중지
stop() {
    echo_info "NestJS 백엔드 컨테이너를 중지합니다..."
    docker-compose -f "$COMPOSE_FILE" stop
    echo_info "컨테이너가 중지되었습니다."
}

# 컨테이너 재시작
restart() {
    echo_info "NestJS 백엔드 컨테이너를 재시작합니다..."
    docker-compose -f "$COMPOSE_FILE" restart
    echo_info "컨테이너가 재시작되었습니다."
}

# 로그 확인
logs() {
    echo_info "로그를 출력합니다 (Ctrl+C로 종료)..."
    docker-compose -f "$COMPOSE_FILE" logs -f
}

# 완전 정리
clean() {
    echo_warn "모든 컨테이너와 볼륨을 삭제합니다. (데이터 손실 주의!)"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo_info "정리 중..."
        docker-compose -f "$COMPOSE_FILE" down -v
        echo_info "정리가 완료되었습니다."
    else
        echo_info "취소되었습니다."
    fi
}

# 상태 확인
status() {
    echo_info "컨테이너 상태:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# 마이그레이션
migrate() {
    echo_info "데이터베이스 마이그레이션을 실행합니다..."
    docker-compose -f "$COMPOSE_FILE" exec backend npx prisma migrate deploy
    echo_info "마이그레이션이 완료되었습니다."
}

# 테스트
test_api() {
    echo_info "API 테스트를 시작합니다..."

    echo ""
    echo_info "1. Health Check 테스트..."
    curl -s http://localhost:5000/api/health | jq . || echo "Health check 실패"

    echo ""
    echo_info "2. 비밀번호 요구사항 조회 테스트..."
    curl -s http://localhost:5000/api/auth/password-requirements | jq . || echo "비밀번호 요구사항 조회 실패"

    echo ""
    echo_info "테스트 완료!"
    echo_warn "로그인 테스트를 하려면 먼저 데이터베이스에 사용자 데이터가 있어야 합니다."
}

# 사용법 출력
usage() {
    echo "사용법: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - 컨테이너 시작 (빌드 포함)"
    echo "  stop      - 컨테이너 중지"
    echo "  restart   - 컨테이너 재시작"
    echo "  logs      - 로그 확인"
    echo "  status    - 컨테이너 상태 확인"
    echo "  migrate   - 데이터베이스 마이그레이션"
    echo "  test      - API 테스트"
    echo "  clean     - 모든 컨테이너 및 볼륨 삭제"
    echo ""
}

# 메인 로직
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    migrate)
        migrate
        ;;
    test)
        test_api
        ;;
    clean)
        clean
        ;;
    *)
        usage
        exit 1
        ;;
esac
