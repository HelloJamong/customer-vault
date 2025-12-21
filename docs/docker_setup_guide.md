# Docker Setup Guide

도커/도커 컴포즈 기반으로 서비스를 구축할 때 필요한 버전, 권장 사양, 준비 절차를 정리했습니다.

## 권장 환경
- OS: Rocky Linux 9.7 이상
- Docker: 24.x 이상
- Docker Compose: v2.20 이상 (`docker compose version`으로 확인)
- 서버 사양(권장): vCPU 4 core, RAM 8GB 이상, 디스크 50GB+ (DB/로그/업로드 여유 고려)

## 사전 준비
1) Docker / Docker Compose 설치  
   - Ubuntu 예시: `sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin`  
   - 설치 확인: `docker --version`, `docker compose version`
2) 프로젝트 배포 디렉터리 준비 (예: `/opt/customer-storage`)  
   - 퍼미션: 실행 계정이 `docker` 그룹에 속해 있고, 프로젝트 디렉터리에 읽기/쓰기 권한이 있어야 합니다.
3) 필수 폴더 생성 및 권한  
   - `logs/`, `uploads/`, `data/mariadb/` (DB 볼륨), 필요 시 `backend/logs`, `backend/uploads` 등  
   - 퍼미션: `chmod -R 755 logs uploads data` (보다 엄격한 권한이 필요하면 운영 정책에 맞춰 조정)  
   - 소유자: 배포 계정 또는 `root:docker` 등 컨테이너가 쓸 수 있는 계정으로 설정
4) 방화벽/포트  
   - 기본 포트: 프론트 `3003`, 백엔드 `5005`, DB `3306` (docker-compose.yml의 포트 매핑에 따름)  
   - 필요 시 보안 그룹/방화벽에 예외 등록

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

# JWT
JWT_SECRET=...              # 충분히 긴 랜덤 값
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Backend
BACKEND_PORT=5005
MAX_UPLOAD_SIZE=16777216
CORS_ORIGIN=http://localhost:3003
LOG_DIR=./logs
UPLOAD_DIR=./uploads

# Frontend
FRONTEND_PORT=3003
VITE_API_BASE_URL=http://localhost:5005/api
VITE_ACCESS_TOKEN_KEY=access_token
VITE_REFRESH_TOKEN_KEY=refresh_token
```
- 운영 배포 시 비밀 값들은 안전한 방법으로 관리(.env는 Git에 커밋 금지).
- 포트나 CORS 도메인은 실제 배포 환경에 맞게 변경합니다.

## 이미지 빌드/다운로드
- 로컬 빌드:
  - 백엔드: `docker compose build backend --no-cache`
  - 프론트: `docker compose build frontend --no-cache` (프로필 `frontend` 사용 시)
- 레지스트리에서 받는 경우: `docker pull <registry>/customer_backend:tag` 등 이미지 태그를 맞춰 받습니다.

## 서비스 구동
```
# 모든 서비스 (DB/백엔드, 프로필에 따라 프론트 포함)
docker compose up -d          # 기본 프로필: db + backend
docker compose --profile frontend up -d   # 프론트까지 포함

# 상태 확인
docker compose ps
docker compose logs -f backend
```

## 데이터/로그 경로
- DB: `data/mariadb/` (로컬 볼륨 → 컨테이너 `/var/lib/mysql`)
- 업로드: `uploads/` (→ 컨테이너 `/app/uploads`)
- 로그: `logs/` (→ 컨테이너 `/app/logs`)
  - 필요 시 `LOG_DIR`/`UPLOAD_DIR`를 .env에서 변경

## 초기 계정/설정
- DB가 비어 있을 경우 서버 기동 시 `admin / 1111` 계정과 기본 시스템 설정이 자동 생성됩니다.

## 문제 해결 팁
- 퍼미션 오류 시: `sudo chown -R <deploy_user>:<deploy_group> logs uploads data`
- 포트 충돌 시: `.env`의 `FRONTEND_PORT`/`BACKEND_PORT` 또는 `docker-compose.yml` 포트 매핑 수정
- 빌드 실패 시: `docker compose build --no-cache`로 캐시를 비우고 재시도, 로그를 확인해 원인 해결
