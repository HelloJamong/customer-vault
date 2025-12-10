# 🚀 Docker 배포 빠른 시작 가이드

Customer Storage를 Docker 이미지로 배포하는 가장 간단한 방법입니다.

---

## 👨‍💻 개발자용 (이미지 배포자)

### 1단계: Docker Hub 준비

1. **Docker Hub 가입**
   - https://hub.docker.com 에서 계정 생성

2. **Access Token 생성**
   - Docker Hub → Account Settings → Security → New Access Token
   - 토큰 이름: `github-actions`
   - 토큰 복사 (다시 볼 수 없습니다!)

### 2단계: GitHub Secrets 설정

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭하여 2개 추가:
   - Name: `DOCKERHUB_USERNAME`, Secret: `your_dockerhub_username`
   - Name: `DOCKERHUB_TOKEN`, Secret: `복사한_access_token`

### 3단계: 설정 파일 수정

다음 파일들에서 `YOUR_DOCKERHUB_USERNAME`을 실제 Docker Hub 계정명으로 변경:

```bash
# 1. GitHub Actions 워크플로우
# 파일: .github/workflows/docker-build.yml (Line 13)
env:
  IMAGE_NAME: your_dockerhub_username/customer-storage

# 2. 프로덕션 docker-compose
# 파일: docker-compose.prod.yml (Line 24)
image: ${DOCKER_IMAGE:-your_dockerhub_username/customer-storage:latest}

# 3. Makefile
# 파일: Makefile (Line 3)
DOCKER_USERNAME ?= your_dockerhub_username

# 4. 설치 스크립트
# 파일: install.sh (Line 85)
image: your_dockerhub_username/customer-storage:latest
```

### 4단계: 배포하기

#### 옵션 A: 자동 배포 (추천 ⭐)

```bash
# 코드 수정 후 커밋
git add .
git commit -m "기능 추가"

# 버전 태그 생성 및 푸시 (자동으로 Docker 이미지 빌드됨)
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main
git push origin v1.0.0
```

**또는 Makefile 사용:**
```bash
make release VERSION=1.0.0
```

→ GitHub Actions가 자동으로 Docker Hub에 이미지 업로드

**진행 상황 확인:**
- GitHub → Actions 탭
- Docker Hub에서 이미지 확인

#### 옵션 B: 수동 배포

```bash
# 1. Docker Hub 로그인
docker login

# 2. 이미지 빌드 및 푸시
make build-push VERSION=1.0.0
```

---

## 👥 사용자용 (이미지 다운로드 및 설치)

### 원라인 설치 (가장 간편!)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/customer-storage/main/install.sh | bash
```

설치 후:
```bash
cd customer-storage
./start.sh
```

접속: http://localhost:5001
계정: `admin` / `1111`

### 관리 명령어

```bash
./start.sh      # 시작
./stop.sh       # 중지
./update.sh     # 최신 버전으로 업데이트
```

---

## 🔄 업데이트 배포 워크플로우

### 개발자가 새 기능을 배포할 때:

```bash
# 1. 코드 수정
vim app/app.py

# 2. 커밋
git add .
git commit -m "새 기능 추가"

# 3. 버전 릴리즈 (자동으로 Docker 이미지 빌드됨)
make release VERSION=1.1.0
```

### 사용자가 업데이트할 때:

```bash
./update.sh
```

이게 전부입니다! 🎉

---

## 📝 주요 명령어 치트시트

### 개발자용

| 명령어 | 설명 |
|--------|------|
| `make dev` | 로컬 개발 환경 시작 |
| `make build` | 이미지 빌드 |
| `make push` | Docker Hub에 푸시 |
| `make release VERSION=x.x.x` | 새 버전 릴리즈 |
| `make logs` | 로그 확인 |
| `make db-backup` | DB 백업 |

### 사용자용

| 명령어 | 설명 |
|--------|------|
| `./start.sh` | 시작 |
| `./stop.sh` | 중지 |
| `./update.sh` | 업데이트 |
| `docker compose logs -f` | 로그 확인 |

---

## ⚠️ 트러블슈팅

### GitHub Actions 빌드 실패?
→ Secrets 설정 확인 (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`)

### 설치 스크립트 실행 안됨?
→ Docker 설치 확인: `docker --version`

### 포트 충돌?
→ `.env` 파일에서 `HOST_PORT=5002`로 변경

---

## 🎯 배포 체크리스트

개발자가 처음 배포할 때 확인:

- [ ] Docker Hub 계정 생성
- [ ] GitHub Secrets 설정 (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`)
- [ ] 4개 파일에서 `YOUR_DOCKERHUB_USERNAME` 변경
- [ ] 첫 번째 릴리즈 태그 생성 (`v1.0.0`)
- [ ] GitHub Actions 빌드 성공 확인
- [ ] Docker Hub에 이미지 업로드 확인
- [ ] 설치 스크립트 URL 업데이트 (`YOUR_USERNAME` 변경)
- [ ] 테스트 설치 해보기

---

**더 자세한 내용은 [DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)를 참고하세요.**
