# 고객창고 (Customer-Storage)

내부 고객사 관리 및 유지보수 점검 이력 관리를 위한 웹 기반 시스템

## 📖 프로젝트 소개

고객창고는 고객사 정보와 유지보수 점검 이력을 효율적으로 관리하기 위한 웹 애플리케이션입니다. Docker 기반으로 손쉽게 배포하고 운영할 수 있도록 설계되었습니다.

### 기술 스택

- **Backend**: Python Flask
- **Database**: MariaDB 10.11
- **Frontend**: Bootstrap 5, Jinja2 템플릿
- **Container**: Docker & Docker Compose
- **OS**: Rocky Linux 9 (운영 환경)

### 주요 기능

- ✅ 역할 기반 사용자 인증 (슈퍼관리자/관리자/일반사용자)
- ✅ 고객사 정보 관리 (담당자, 계약, 점검 정보)
- ✅ 점검 문서 업로드 및 관리
- ✅ 점검 이력 조회 및 통계
- ✅ 시스템 로그 및 보안 설정

---

## 🚀 빠른 시작 (Docker Hub 이미지 사용)

서버에 Docker만 설치되어 있다면, 사전 빌드된 이미지로 바로 시작할 수 있습니다.

### 1️⃣ 필요한 파일 다운로드

```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/customer-storage && cd ~/customer-storage

# docker-compose.prod.yml 다운로드
wget https://raw.githubusercontent.com/HelloJamong/customer-storage/main/docker-compose.prod.yml

# 또는 curl 사용
curl -O https://raw.githubusercontent.com/HelloJamong/customer-storage/main/docker-compose.prod.yml

# .env.example 다운로드 (설정 참고용)
wget https://raw.githubusercontent.com/HelloJamong/customer-storage/main/.env.example

# 또는 curl 사용
curl -O https://raw.githubusercontent.com/HelloJamong/customer-storage/main/.env.example
```

### 2️⃣ 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 수정
nano .env
```

**.env 파일 설정 예시:**
```bash
# Flask 설정
FLASK_ENV=production
# SECRET_KEY 생성: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=여기에_생성된_랜덤_키_입력

# 데이터베이스 설정 (강력한 비밀번호로 변경!)
DB_ROOT_PASSWORD=강력한_루트_비밀번호
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=강력한_사용자_비밀번호

# 애플리케이션 설정
HOST_PORT=5001
MAX_UPLOAD_SIZE=16777216

# Docker 이미지
DOCKER_IMAGE=igor0670/customer-storage:latest
```

**SECRET_KEY 생성 방법:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# 출력된 값을 .env의 SECRET_KEY에 붙여넣기
```

### 3️⃣ 필요한 디렉토리 생성

```bash
mkdir -p data/mariadb uploads logs
```

### 4️⃣ 서비스 실행

```bash
# Docker 이미지 다운로드
docker compose -f docker-compose.prod.yml pull

# 서비스 시작 (백그라운드)
docker compose -f docker-compose.prod.yml up -d

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f
```

### 5️⃣ 서비스 관리 명령어

```bash
# 중지
docker compose -f docker-compose.prod.yml down

# 재시작
docker compose -f docker-compose.prod.yml restart

# 상태 확인
docker compose -f docker-compose.prod.yml ps

# 업데이트 (새 버전 배포 시)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

### 3️⃣ 접속 및 초기 설정

1. 브라우저에서 http://localhost:5001 접속
2. 기본 계정으로 로그인: `admin` / `1111`
3. 보안을 위해 별도 슈퍼 관리자 생성 후 로그인 진행
4. 이후 admin 계정 비활성화 또는 삭제(권장)

---

## 📚 문서

상세한 설치 및 설정 가이드는 **[docs 폴더](docs/)**를 참고하세요.

| 문서 | 설명 | 대상 |
|------|------|------|
| **[📖 문서 센터](docs/README.md)** | 모든 문서의 시작점 | 모든 사용자 |
| **[🚀 제3자 배포 가이드](docs/DEPLOYMENT_GUIDE.md)** | 본인 서버에 처음부터 배포하기 | 신규 사용자 ⭐ |
| **[⚙️ 환경 설정 가이드](docs/SETUP_GUIDE.md)** | 환경별 상세 시스템 설정 | 신규 관리자 |
| **[🔧 환경 변수 참조](docs/ENV_VARIABLES.md)** | .env 파일 설정 빠른 참조 | 모든 사용자 |
| **[🐳 Docker 설정 가이드](docs/DOCKER_GUIDE.md)** | Docker 파일 수정 방법 | 개발자 |
| **[📦 Docker 컨테이너 환경 구성](docs/DOCKER_CONTAINER_GUIDE.md)** | Docker 명령어 및 운영 | 관리자 |
| **[🚀 Docker 배포 빠른 시작](docs/DOCKER_QUICKSTART.md)** | Docker Hub 배포 빠른 가이드 | 개발자 ⭐ |
| **[🐋 Docker 이미지 배포 가이드](docs/DOCKER_DEPLOYMENT.md)** | Docker Hub 배포 상세 가이드 | 개발자 |

### 시나리오별 추천 문서

- **🆕 완전히 처음 시작하는 경우** ⭐
  - **[🚀 제3자 배포 가이드](docs/DEPLOYMENT_GUIDE.md)** - 이 가이드 하나면 충분!
  - 서버 준비부터 완료까지 모든 과정을 단계별로 안내

- **🐳 Docker는 이미 설치된 경우**
  1. [📦 Docker 컨테이너 환경 구성](docs/DOCKER_CONTAINER_GUIDE.md) - 프로젝트 실행부터
  2. [🔧 환경 변수 참조](docs/ENV_VARIABLES.md) - .env 설정

- **⚙️ Docker 설정 변경**
  - [🐳 Docker 설정 가이드](docs/DOCKER_GUIDE.md) - 포트, 리소스 등 수정

- **🚀 Docker Hub로 배포하기** (개발자용)
  - **[🚀 Docker 배포 빠른 시작](docs/DOCKER_QUICKSTART.md)** - 빠른 시작 가이드 ⭐
  - [🐋 Docker 이미지 배포 가이드](docs/DOCKER_DEPLOYMENT.md) - 상세 가이드

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────┐
│      Docker Environment             │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  Web App     │  │  Database   │ │
│  │  (Flask)     │◄─┤  (MariaDB)  │ │
│  │  Port: 5000  │  │  Port: 3306 │ │
│  └──────────────┘  └─────────────┘ │
│         │                           │
└─────────┼───────────────────────────┘
          │
    Host: 5001
```

### 디렉토리 구조

```
customer-storage/
├── 📚 docs/                   # 문서 디렉토리 (설정 가이드, 환경변수 등)
├── 🐍 app/                    # Flask 애플리케이션 소스코드
├── 🗄️ migrations/             # 데이터베이스 스키마 변경 SQL
├── 📁 uploads/                # 사용자 업로드 파일 (gitignore)
├── 💾 data/mariadb/           # MariaDB 데이터 볼륨 (gitignore)
├── 📝 logs/                   # 애플리케이션 로그 (gitignore)
│
├── 🐳 docker-compose.yml      # Docker Compose 오케스트레이션
├── 🐳 Dockerfile              # Flask 이미지 빌드 파일
├── 📦 requirements.txt        # Python 의존성 패키지
├── 🔒 .env                    # 환경 변수 (gitignore, 직접 생성)
└── 📖 README.md               # 프로젝트 개요 (현재 파일)
```

> 💡 **Tip:** Docker 관련 파일(`docker-compose.yml`, `Dockerfile`)은 루트에 위치해야 합니다.
> 이는 Docker의 표준 관행이며, 다른 위치에 두면 명령어 실행이 복잡해집니다.

---

> 📖 **전체 명령어 및 운영 가이드는 [docs/DOCKER_CONTAINER_GUIDE.md](docs/DOCKER_CONTAINER_GUIDE.md)를 참고하세요.**


---

## 🤝 기여 및 지원

- **문제 보고**: GitHub Issues에 등록해주세요
- **기능 제안**: Pull Request 환영합니다
- **문서 개선**: [docs](docs/) 폴더의 문서 개선 제안

---

## 📄 라이선스

이 프로젝트는 내부 사용을 위한 프로젝트입니다.

---

**📚 상세한 문서는 [docs 폴더](docs/)를 참고하세요.**
