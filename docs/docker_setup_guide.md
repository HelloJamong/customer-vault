# Docker Setup Guide

도커/도커 컴포즈 기반으로 서비스를 구축할 때 필요한 버전, 권장 사양, 준비 절차를 정리했습니다.

## 권장 환경
- OS: Rocky Linux 9.7 이상
- Docker: 24.x 이상
- Docker Compose: v2.20 이상 (`docker compose version`으로 확인)
- 서버 사양(권장): vCPU 4 core, RAM 8GB 이상, 디스크 50GB+ (DB/로그/업로드/ClamAV 데이터 여유 고려)

## 사전 준비
1) Docker / Docker Compose 설치
   - Ubuntu 예시: `sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin`
   - 설치 확인: `docker --version`, `docker compose version`
2) 프로젝트 배포 디렉터리 준비 (예: `/opt/customer-storage`)
   - 퍼미션: 실행 계정이 `docker` 그룹에 속해 있고, 프로젝트 디렉터리에 읽기/쓰기 권한이 있어야 합니다.
3) 필수 폴더 생성 및 권한
   - `logs/`, `uploads/`, `data/mariadb/` (DB 볼륨), 필요 시 `backend/logs`, `backend/uploads` 등
   - 퍼미션: 실행 계정과 컨테이너가 읽기/쓰기 가능한 최소 권한으로 설정합니다. 백업·키·로그 디렉터리는 공개 권한(`777`)을 사용하지 않습니다.
   - 소유자: 배포 계정 또는 `root:docker` 등 컨테이너가 쓸 수 있는 계정으로 설정
4) 방화벽/포트
   - 기본 외부 포트: 리버스 프록시 `2082`
   - DB `3306`은 호스트 로컬(`127.0.0.1`)에만 바인딩됩니다.
   - 백엔드 `5000`과 프론트엔드 `80`은 Docker 내부 네트워크에서만 접근합니다.
   - 외부 방화벽에는 프록시 포트만 허용하세요.

## .env 설정
루트의 `.env` 파일에 환경 변수를 설정합니다. 주요 항목:
```
NODE_ENV=production
LOG_LEVEL=info

# DB
DB_ROOT_PASSWORD=...        # MariaDB root 패스워드
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=...
DB_PORT=3306
INITIAL_ADMIN_PASSWORD=...  # 빈 DB 최초 설치 시 admin 계정 비밀번호

# JWT
JWT_SECRET=...              # 충분히 긴 랜덤 값
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Proxy
PROXY_PORT=2082
# Backend는 Docker 내부 네트워크에서 5000번으로 고정됩니다.
MAX_UPLOAD_SIZE=16777216
CLAMAV_ENABLED=true
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_SCAN_TIMEOUT_MS=30000
CORS_ORIGIN=http://localhost:2082
LOG_DIR=./logs
UPLOAD_DIR=./uploads

# 애플리케이션 필드 암호화 키와 반드시 다른 백업 파일 암호화 키
ENCRYPTION_KEY=64자리_hex_문자열
BACKUP_ENCRYPTION_KEY=별도_보관할_64자리_hex_문자열

# Frontend는 프록시를 통해 제공되므로 상대 경로를 사용합니다.
VITE_API_BASE_URL=/api
VITE_ACCESS_TOKEN_KEY=access_token
VITE_REFRESH_TOKEN_KEY=refresh_token
```
- 운영 배포 시 비밀 값들은 안전한 방법으로 관리(.env는 Git에 커밋 금지).
- `ENCRYPTION_KEY`와 `BACKUP_ENCRYPTION_KEY`는 서로 다른 64자리 hex 값이어야 하며, 기존 설치에서는 값을 변경하지 않습니다.
- `INITIAL_ADMIN_PASSWORD`는 빈 DB 최초 설치 시에만 사용됩니다. 기존 DB에서는 admin 계정을 초기화하지 않습니다.
- 포트나 CORS 도메인은 실제 배포 환경에 맞게 변경합니다.

## 이미지 빌드/다운로드
- 로컬 빌드:
  - 백엔드: `docker compose build backend --no-cache`
  - 프론트: `docker compose build frontend --no-cache`
- Release 이미지: `igor0670/customer-storage-backend:<버전>`, `igor0670/customer-storage-frontend:<버전>`
- 폐쇄망: Release의 이미지 번들을 `docker load`한 뒤 Compose를 실행합니다.

## 서비스 구동
```
# 모든 서비스 (DB/백엔드/프론트/리버스 프록시)
docker compose up -d

# 상태 확인
docker compose ps
docker compose logs -f backend
```

## 데이터/로그 경로
- DB: `data/mariadb/` (로컬 볼륨 → 컨테이너 `/var/lib/mysql`)
- 업로드: `uploads/` (→ 컨테이너 `/app/uploads`)
- 업로드 파일은 먼저 서버 내부 격리 단계에서 확장자·매직바이트·ClamAV 검사를 통과한 후 최종 저장됩니다.
- ClamAV가 준비되지 않았거나 검사에 실패하면 신규 업로드는 차단됩니다(fail-closed).
- `docker compose up -d` 시 Backend가 커밋된 Prisma migration을 자동 적용합니다. `docker compose exec backend npx prisma migrate status`로 확인하세요.
- 로그: `logs/` (→ 컨테이너 `/app/logs`)
  - 필요 시 `LOG_DIR`/`UPLOAD_DIR`를 .env에서 변경
- DB/문서 백업은 AES-256-GCM으로 암호화된 `.enc` 파일로 저장되며, 원격 SFTP에도 암호화된 파일만 전송됩니다.
- `BACKUP_ENCRYPTION_KEY`는 `ENCRYPTION_KEY`와 다른 값을 사용하고 업그레이드/복원에 필요한 별도 보안 저장소에 보관하세요. 키를 잃으면 백업을 복호화할 수 없습니다.

## 초기 계정/설정
- DB가 비어 있을 경우 서버 기동 시 `.env`의 `INITIAL_ADMIN_PASSWORD`로 `admin` 계정과 기본 시스템 설정이 자동 생성됩니다.
- `INITIAL_ADMIN_PASSWORD`가 없으면 빈 DB의 초기화가 중단됩니다.
- 생성된 admin 계정은 최초 로그인 후 비밀번호 변경이 필요합니다.

## 문제 해결 팁
- 퍼미션 오류 시: `sudo chown -R <deploy_user>:<deploy_group> logs uploads data`
- 포트 충돌 시: `.env`의 `PROXY_PORT` 또는 `DB_PORT`를 변경
- 빌드 실패 시: `docker compose build --no-cache`로 캐시를 비우고 재시도, 로그를 확인해 원인 해결
