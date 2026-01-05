#!/bin/bash

# 폐쇄망 환경 정리 스크립트 (firewalld 버전)
# - firewalld 규칙 삭제
# - Docker 컨테이너 중지

set -e

echo "🧹 폐쇄망 환경 정리 시작..."

# Docker 컨테이너 포트
FRONTEND_PORT=2083
BACKEND_PORT=5006

# firewalld 서비스 확인
if systemctl is-active --quiet firewalld 2>/dev/null; then
    USE_FIREWALLD=true
    echo "🔓 firewalld 규칙 삭제 중..."

    # public zone에서 포트 제거
    sudo firewall-cmd --permanent --zone=public --remove-port=${FRONTEND_PORT}/tcp 2>/dev/null || true
    sudo firewall-cmd --permanent --zone=public --remove-port=${BACKEND_PORT}/tcp 2>/dev/null || true

    # firewalld 설정 reload
    sudo firewall-cmd --reload

    echo "✅ firewalld 규칙 삭제 완료"
else
    echo "ℹ️  firewalld가 실행 중이지 않습니다. 규칙 삭제를 건너뜁니다."
fi

echo "🛑 Docker 컨테이너 중지..."
docker compose -f docker-compose.offline.yml down

echo ""
echo "✅ 폐쇄망 환경 정리 완료!"
echo ""
echo "💡 참고: 기존 개발 환경을 다시 시작하려면:"
echo "   docker compose up -d"
echo ""
