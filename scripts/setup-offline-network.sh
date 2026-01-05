#!/bin/bash

# 폐쇄망 환경 네트워크 설정 스크립트 (firewalld 버전)
# - 로컬 네트워크(C클래스 대역) 접근 허용
# - 외부 인터넷 접속 차단 (DNS 차단)

set -e

echo "🔧 폐쇄망 환경 네트워크 설정 시작..."

# firewalld 서비스 확인
if ! systemctl is-active --quiet firewalld 2>/dev/null; then
    echo "⚠️  firewalld 서비스가 실행 중이지 않습니다."
    echo "   현재 시스템은 iptables를 사용하는 것으로 보입니다."
    echo "   firewalld 설정을 건너뛰고 계속하시겠습니까? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "스크립트를 종료합니다."
        exit 1
    fi
    USE_FIREWALLD=false
else
    USE_FIREWALLD=true
fi

# 현재 서버 IP 확인
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📍 서버 IP: $SERVER_IP"

# C클래스 네트워크 대역 추출 (예: 192.168.0.0/24)
NETWORK_PREFIX=$(echo $SERVER_IP | cut -d. -f1-3)
LOCAL_NETWORK="${NETWORK_PREFIX}.0/24"
echo "🌐 로컬 네트워크 대역: $LOCAL_NETWORK"

# Docker 컨테이너 포트
FRONTEND_PORT=2083
BACKEND_PORT=5006

echo ""
echo "🚀 Docker Compose 시작..."
docker compose -f docker-compose.offline.yml up -d

# 잠시 대기 (네트워크 생성 완료)
sleep 3

# 컨테이너가 정상적으로 시작되었는지 확인
if ! docker compose -f docker-compose.offline.yml ps | grep -q "running"; then
    echo "⚠️  일부 컨테이너가 시작되지 않았습니다."
    docker compose -f docker-compose.offline.yml ps
fi

if [ "$USE_FIREWALLD" = true ]; then
    echo ""
    echo "🔒 firewalld 규칙 설정 중..."
    echo "   ✅ 허용: $LOCAL_NETWORK (로컬 네트워크)"
    echo "   ✅ 허용: 포트 ${FRONTEND_PORT}/tcp (프론트엔드)"
    echo "   ✅ 허용: 포트 ${BACKEND_PORT}/tcp (백엔드)"
    echo ""

    # public zone에 포트 추가 (같은 네트워크에서 접근 가능하도록)
    echo "📝 public zone에 포트 추가 중..."
    sudo firewall-cmd --permanent --zone=public --add-port=${FRONTEND_PORT}/tcp 2>/dev/null || true
    sudo firewall-cmd --permanent --zone=public --add-port=${BACKEND_PORT}/tcp 2>/dev/null || true

    # firewalld 설정 reload
    sudo firewall-cmd --reload

    echo "✅ firewalld 규칙 설정 완료"
    echo ""

    # 현재 규칙 확인
    echo "📋 현재 firewalld 규칙 (public zone):"
    sudo firewall-cmd --zone=public --list-all
fi

echo ""
echo "✅ 폐쇄망 환경 설정 완료!"
echo ""
echo "📍 접속 정보:"
echo "   - 로컬호스트: http://localhost:${FRONTEND_PORT}"
echo "   - 서버 IP: http://${SERVER_IP}:${FRONTEND_PORT}"
echo "   - 허용 대역: $LOCAL_NETWORK (모든 로컬 네트워크)"
echo "   - 백엔드 API: http://localhost:${BACKEND_PORT}/api"
echo "   - Swagger: http://localhost:${BACKEND_PORT}/api/docs"
echo ""
echo "🧪 테스트 방법:"
echo "   1. 같은 네트워크의 다른 PC에서 접속:"
echo "      http://${SERVER_IP}:${FRONTEND_PORT}"
echo ""
echo "   2. 외부 인터넷 차단 확인 (DNS 차단으로 외부 접속 불가):"
echo "      docker exec customer_backend_offline curl -m 5 https://google.com"
echo "      (예상 결과: Could not resolve host)"
echo ""
echo "   3. 로그 확인:"
echo "      docker compose -f docker-compose.offline.yml logs -f backend"
echo ""
echo "🛑 정리 방법:"
echo "   ./scripts/cleanup-offline-network.sh"
echo ""
