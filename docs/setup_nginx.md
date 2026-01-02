# Nginx Reverse Proxy Setup

이 문서는 프런트엔드/백엔드 앞단에 별도 Nginx 프록시 컨테이너를 두어 외부 포트를 단일화하는 방법을 설명합니다. 프런트는 `/api` 상대 경로를 사용한다는 가정이며, Cloudflare 프록시 환경에서도 동작하도록 헤더/타임아웃을 포함합니다.

## 개요
- 외부 노출 포트: 예시 `2082 -> nginx:80`
- 라우팅:
  - `/api/` → `backend:5000`
  - `/` (정적 포함) → `frontend:80`
- 필수 헤더: `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Upgrade/Connection`(WebSocket/SSE)
- 업로드/타임아웃: `client_max_body_size 20m`, `proxy_*_timeout 60s`
- **오프라인 환경 지원**: CSP 및 보안 헤더를 통해 외부 리소스(CDN, 폰트 등) 차단

## 1) Nginx 설정 파일 준비
1. `proxy` 디렉토리를 루트에 생성하고, `docs/nginx.conf.example` 내용을 복사해 `proxy/nginx.conf`로 저장합니다.
2. 필요 시 포트/도메인만 수정합니다(기본은 모든 호스트 허용).

## 2) docker-compose.yml 예시 변경
```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: customer_proxy
    volumes:
      - ./proxy/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      frontend:
        condition: service_started
      backend:
        condition: service_healthy
    ports:
      - "2082:80"   # 외부 노출 포트 하나만 사용
    networks:
      - customer_network

  backend:
    # 기존 설정 유지
    # ports:           # 운영 시 비노출 권장
    #   - "5005:5000"

  frontend:
    # 기존 설정 유지
    # ports:           # 운영 시 비노출 권장
    #   - "3003:80"

networks:
  customer_network:
    driver: bridge
```

## 3) 적용/테스트 절차
1. `docker compose build` (필요 시 `backend`, `frontend`, `nginx` 대상)
2. `docker compose up -d nginx backend frontend`
3. 헬스체크: `curl http://<domain>:2082/api/health`
4. 프런트 접속: `http://<domain>:2082`
5. Cloudflare 사용 시: DNS 레코드 프록시(오렌지 구름) 상태에서 2082가 허용되는지 확인. 방화벽은 2082만 개방.

## 4) 오프라인 환경 보안 헤더
`nginx.conf.example`에는 폐쇄망 환경을 위한 보안 헤더가 포함되어 있습니다:

- **Content-Security-Policy**: 모든 외부 CDN, 폰트, 스크립트 차단
  - `default-src 'self'` - 기본 리소스는 자신만 허용
  - `font-src 'self' data:` - 폰트는 로컬 또는 data URI만
  - `connect-src 'self'` - API 호출은 자신만

- **추가 보안 헤더**:
  - `X-Content-Type-Options: nosniff` - MIME 타입 스니핑 방지
  - `X-Frame-Options: SAMEORIGIN` - 클릭재킹 방지
  - `X-XSS-Protection: 1; mode=block` - XSS 공격 차단
  - `Referrer-Policy: strict-origin-when-cross-origin` - Referrer 정보 제한

이러한 설정으로 인터넷 연결 없이도 애플리케이션이 정상 작동합니다.

## 5) 트러블슈팅
- `/api/health`가 프런트로 리디렉트 → `location /api/` 블록이 `/`보다 앞에 있는지 확인.
- 504/타임아웃 → `proxy_read_timeout`, `proxy_connect_timeout`, `proxy_send_timeout`을 60s 이상으로 조정. 백엔드 처리 시간도 점검.
- `ERR_BLOCKED_BY_CLIENT` → 브라우저 광고/추적 차단 확장 가능성. Cloudflare beacon이 차단되는 경우가 있음.
- 업로드 413 → `client_max_body_size`가 충분한지 확인(기본 20m, `MAX_UPLOAD_SIZE` 16MB 기준 여유).
- **CSP 위반 경고** → 외부 리소스를 로드하려고 시도하는 경우. 브라우저 개발자 도구 콘솔에서 확인 가능. 모든 리소스가 로컬에서 제공되어야 함.
