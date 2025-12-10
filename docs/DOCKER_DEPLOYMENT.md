# 🐳 Docker 이미지 배포 가이드

이 문서는 Customer Storage 애플리케이션을 Docker 이미지로 배포하는 방법을 설명합니다.

---

## 📋 목차

1. [개발자용: 이미지 빌드 및 배포](#개발자용-이미지-빌드-및-배포)
2. [사용자용: 간편 설치 가이드](#사용자용-간편-설치-가이드)
3. [업데이트 방법](#업데이트-방법)
4. [트러블슈팅](#트러블슈팅)

---

## 개발자용: 이미지 빌드 및 배포

### 1️⃣ 사전 준비

#### Docker Hub 계정 준비
1. [Docker Hub](https://hub.docker.com) 가입
2. Access Token 생성:
   - Docker Hub → Account Settings → Security → New Access Token
   - 이름: `github-actions` (또는 원하는 이름)
   - 권한: Read, Write, Delete
   - 생성된 토큰 복사 (다시 볼 수 없음!)

#### GitHub Secrets 설정
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 Secrets 추가:
   - `DOCKERHUB_USERNAME`: Docker Hub 사용자명
   - `DOCKERHUB_TOKEN`: 위에서 생성한 Access Token

#### 코드 수정
다음 파일들에서 `YOUR_DOCKERHUB_USERNAME`을 실제 Docker Hub 사용자명으로 변경:
- `.github/workflows/docker-build.yml` (Line 13)
- `docker-compose.prod.yml` (Line 24)
- `Makefile` (Line 3)
- `install.sh` (Docker Hub 이미지 이름)

---

### 2️⃣ 자동 배포 워크플로우

코드를 수정하면 자동으로 Docker 이미지가 빌드되어 Docker Hub에 배포됩니다.

#### 방법 1: 커밋 & 푸시 (개발 버전)
```bash
# 코드 수정 후
git add .
git commit -m "기능 개선"
git push origin main
```

→ GitHub Actions가 자동으로 `latest` 태그로 이미지 빌드 및 푸시

#### 방법 2: 버전 태그 릴리즈 (프로덕션 버전) ⭐ 추천
```bash
# Makefile 사용 (간편)
make release VERSION=1.0.0

# 또는 수동으로
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main
git push origin v1.0.0
```

→ GitHub Actions가 자동으로 다음 태그들로 이미지 빌드 및 푸시:
- `yourusername/customer-storage:1.0.0`
- `yourusername/customer-storage:1.0`
- `yourusername/customer-storage:1`
- `yourusername/customer-storage:latest`

#### 빌드 진행 상황 확인
- GitHub 저장소 → Actions 탭에서 실시간 확인
- 빌드 완료 후 [Docker Hub](https://hub.docker.com)에서 이미지 확인

---

### 3️⃣ 수동 배포 (옵션)

GitHub Actions 없이 로컬에서 직접 빌드/푸시:

```bash
# 1. Docker Hub 로그인
docker login

# 2. 이미지 빌드
make build VERSION=1.0.0

# 3. Docker Hub에 푸시
make push VERSION=1.0.0

# 또는 한 번에
make build-push VERSION=1.0.0
```

---

### 4️⃣ 개발자 명령어 모음 (Makefile)

```bash
# 도움말 보기
make help

# 개발 환경 시작 (로컬 빌드)
make dev

# 프로덕션 환경 시작 (Docker Hub 이미지)
make prod

# 로그 확인
make logs

# 이미지 빌드 및 푸시
make build-push VERSION=1.0.0

# 새 버전 릴리즈
make release VERSION=1.0.0

# 데이터베이스 백업
make db-backup

# 정리
make clean
```

---

## 사용자용: 간편 설치 가이드

### 방법 1: 자동 설치 스크립트 (가장 간편!) ⭐

#### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/customer-storage/main/install.sh | bash
```

#### Windows (Git Bash 또는 WSL)
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/customer-storage/main/install.sh | bash
```

설치 스크립트가 자동으로:
- ✅ Docker 설치 확인
- ✅ 필요한 디렉토리 생성
- ✅ 설정 파일 다운로드
- ✅ 랜덤 패스워드 자동 생성
- ✅ 관리 스크립트 생성

---

### 방법 2: 수동 설치

#### 1. 필요한 파일 다운로드
```bash
mkdir customer-storage && cd customer-storage

# docker-compose.yml 다운로드
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/customer-storage/main/docker-compose.prod.yml

# .env 파일 생성
cat > .env <<EOF
DB_ROOT_PASSWORD=rootpassword_$(openssl rand -hex 8)
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=customerpass_$(openssl rand -hex 8)
SECRET_KEY=$(openssl rand -hex 32)
FLASK_ENV=production
FLASK_DEBUG=False
HOST_PORT=5001
MAX_UPLOAD_SIZE=16777216
EOF
```

#### 2. 디렉토리 생성
```bash
mkdir -p data/mariadb uploads logs
```

#### 3. 실행
```bash
docker compose -f docker-compose.prod.yml up -d
```

#### 4. 접속
- URL: http://localhost:5001
- 계정: `admin` / `1111`

---

### 사용자 관리 명령어

자동 설치 스크립트를 사용한 경우:

```bash
# 시작
./start.sh

# 중지
./stop.sh

# 업데이트
./update.sh

# 로그 확인
docker compose logs -f
```

수동 설치의 경우:

```bash
# 시작
docker compose -f docker-compose.prod.yml up -d

# 중지
docker compose -f docker-compose.prod.yml down

# 업데이트
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f
```

---

## 업데이트 방법

### 사용자: 최신 버전으로 업데이트

#### 자동 설치 사용자
```bash
./update.sh
```

#### 수동 설치 사용자
```bash
docker compose -f docker-compose.prod.yml pull web
docker compose -f docker-compose.prod.yml up -d
```

### 개발자: 새 버전 배포

1. **코드 수정 및 커밋**
```bash
git add .
git commit -m "기능 개선"
```

2. **버전 태그 생성 및 푸시**
```bash
make release VERSION=1.1.0
```

3. **GitHub Actions 확인**
   - GitHub → Actions 탭에서 빌드 진행 확인
   - 빌드 완료 후 사용자들이 업데이트 가능

---

## 트러블슈팅

### 문제 1: Docker Hub 푸시 실패
```
Error: denied: requested access to the resource is denied
```

**해결 방법:**
```bash
# Docker Hub 재로그인
docker logout
docker login

# 이미지 이름 확인 (사용자명이 올바른지 확인)
docker images
```

---

### 문제 2: GitHub Actions 빌드 실패

**원인:**
- DOCKERHUB_USERNAME 또는 DOCKERHUB_TOKEN 시크릿이 설정되지 않음

**해결 방법:**
1. GitHub → Settings → Secrets → Actions
2. 시크릿 추가/확인
3. 워크플로우 재실행

---

### 문제 3: 설치 스크립트가 실행되지 않음

**원인:**
- Docker가 설치되지 않음

**해결 방법:**
```bash
# Docker 설치 (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh

# Docker 설치 (macOS)
# https://docs.docker.com/desktop/install/mac-install/

# Docker 설치 (Windows)
# https://docs.docker.com/desktop/install/windows-install/
```

---

### 문제 4: 포트 충돌

```
Error: Bind for 0.0.0.0:5001 failed: port is already allocated
```

**해결 방법:**
```bash
# .env 파일에서 포트 변경
echo "HOST_PORT=5002" >> .env

# 재시작
docker compose -f docker-compose.prod.yml up -d
```

---

## 추가 리소스

- **Docker Hub 저장소**: https://hub.docker.com/r/YOUR_USERNAME/customer-storage
- **GitHub 저장소**: https://github.com/YOUR_USERNAME/customer-storage
- **이슈 및 버그 리포트**: https://github.com/YOUR_USERNAME/customer-storage/issues

---

## 버전 관리 전략

### 태그 전략
- `latest`: 항상 최신 안정 버전
- `v1.0.0`: 특정 버전 (세맨틱 버전닝)
- `main-abc1234`: 개발 중인 브랜치별 빌드 (SHA 포함)

### 추천 사용 패턴
- **개발/테스트**: `latest` 태그 사용
- **프로덕션**: 특정 버전 태그 사용 (예: `v1.0.0`)

---

## 보안 주의사항

### Docker Hub 이미지 사용 시
✅ **DO:**
- 반드시 `.env` 파일의 모든 비밀번호 변경
- `SECRET_KEY`를 무작위 문자열로 설정
- 최초 로그인 후 admin 계정을 새 슈퍼관리자로 교체

❌ **DON'T:**
- 기본 비밀번호 그대로 사용
- .env 파일을 git에 커밋
- SECRET_KEY를 공유

---

**문서 최종 업데이트:** 2024-12-10
