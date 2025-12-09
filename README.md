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

## 🚀 빠른 시작

### 1️⃣ 환경 변수 설정

```bash
# env.example을 복사하여 .env 생성
cp docs/env.example .env

# SECRET_KEY 생성 후 .env 파일에 설정
python -c "import secrets; print(secrets.token_hex(32))"

# .env 파일 편집 (필수!)
nano .env
```

### 2️⃣ Docker 실행

```bash
# 컨테이너 빌드 및 실행
docker compose up -d

# 로그 확인
docker compose logs -f
```

### 3️⃣ 접속 및 초기 설정

1. 브라우저에서 http://localhost:5001 접속
2. 기본 계정으로 로그인: `admin` / `password1!`
3. 자동으로 표시되는 페이지에서 새 슈퍼관리자 계정 생성
4. 새 계정으로 다시 로그인

---

## 📚 문서

상세한 설치 및 설정 가이드는 **[docs 폴더](docs/)**를 참고하세요.

| 문서 | 설명 | 대상 |
|------|------|------|
| **[📖 문서 센터](docs/README.md)** | 모든 문서의 시작점 | 모든 사용자 |
| **[⚙️ 환경 설정 가이드](docs/SETUP_GUIDE.md)** | 전체 시스템 설정 가이드 | 신규 관리자 |
| **[🔧 환경 변수 참조](docs/ENV_VARIABLES.md)** | .env 파일 설정 빠른 참조 | 모든 사용자 |
| **[🐳 Docker 설정 가이드](docs/DOCKER_GUIDE.md)** | Docker 파일 수정 방법 | 개발자 |
| **[📦 Docker 컨테이너 환경 구성](docs/DOCKER_CONTAINER_GUIDE.md)** | Docker로 환경을 구성하는 전체 과정 | 관리자 |

### 시나리오별 추천 문서

- **🆕 처음 설치하는 경우**
  1. [📦 Docker 컨테이너 환경 구성](docs/DOCKER_CONTAINER_GUIDE.md) - Docker 설치부터 시작
  2. [🔧 환경 변수 참조](docs/ENV_VARIABLES.md) - .env 파일 설정

- **🔄 다른 서버에 배포**
  - [⚙️ 환경 설정 가이드](docs/SETUP_GUIDE.md) - 환경별 설정 방법

- **⚙️ Docker 설정 변경**
  - [🐳 Docker 설정 가이드](docs/DOCKER_GUIDE.md) - 포트, 리소스 등 수정

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

## 💡 주요 명령어

```bash
# 시작
docker compose up -d

# 중지
docker compose down

# 로그 확인
docker compose logs -f web

# 재시작
docker compose restart

# 데이터베이스 백업
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup.sql
```

> 📖 **전체 명령어 및 운영 가이드는 [docs/DOCKER_CONTAINER_GUIDE.md](docs/DOCKER_CONTAINER_GUIDE.md)를 참고하세요.**

---

## ⚠️ 보안 주의사항

운영 환경 배포 전 **필수 확인**:

- [ ] `.env` 파일의 모든 비밀번호 변경
- [ ] `SECRET_KEY` 무작위 문자열로 설정
- [ ] `FLASK_DEBUG=False` 설정
- [ ] `.env` 파일 권한: `chmod 600 .env`
- [ ] 기본 admin 계정 비활성화 (최초 로그인 시 자동)

> 📖 **전체 보안 체크리스트는 [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md#보안-체크리스트)를 참고하세요.**

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
