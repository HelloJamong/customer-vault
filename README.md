# 고객창고 (Customer Vault)

내부 고객사 관리 및 유지보수 점검 이력 관리를 위한 웹 기반 시스템

## 📖 프로젝트 소개

고객창고는 고객사 정보와 유지보수 점검 이력을 효율적으로 관리하기 위한 웹 애플리케이션입니다. Docker 기반으로 손쉽게 배포하고 운영할 수 있도록 설계되었습니다.

## 🖼️ Preview

![Preview](docs/preview.png)

## 🛠️ 기술 스택

### Backend
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

### Database
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white)
![Day.js](https://img.shields.io/badge/Day.js-FF5F4C?style=for-the-badge)
![ExcelJS](https://img.shields.io/badge/ExcelJS-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)

### Build/Deploy
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

### 오프라인 환경 지원

이 프로젝트는 **폐쇄망(오프라인) 환경**에서도 정상 작동하도록 설계되었습니다:

- ✅ **외부 CDN 제거**: 모든 리소스가 로컬에서 제공됨
- ✅ **외부 폰트 의존성 제거**: 시스템 기본 폰트 사용
- ✅ **Content Security Policy**: Nginx에서 외부 리소스 차단 정책 적용
- ✅ **완전한 자체 포함**: 인터넷 연결 없이 모든 기능 사용 가능

---

## 🚀 빠른 시작

> Git 클론 없이 배포 파일 두 개만 받아 바로 실행할 수 있습니다.

### 1️⃣ 배포 파일 다운로드

```bash
# 배포 디렉토리 생성
mkdir customer-vault && cd customer-vault

# 최신 릴리즈 배포 파일 자동 다운로드
curl -LO https://github.com/HelloJamong/customer-vault/releases/latest/download/docker-compose.yml
curl -LO https://github.com/HelloJamong/customer-vault/releases/latest/download/.env.example
```

### 2️⃣ 환경 변수 설정

```bash
cp .env.example .env
vi .env
```

**운영 환경에서 반드시 변경해야 할 항목:**

| 항목 | 설명 |
|------|------|
| `NODE_ENV` | `production` 으로 변경 |
| `JWT_SECRET` | 128자 이상 랜덤 문자열 (아래 생성 명령 참고) |
| `DB_ROOT_PASSWORD` | 강력한 DB root 비밀번호 |
| `DB_PASSWORD` | 강력한 DB 사용자 비밀번호 |
| `INITIAL_ADMIN_PASSWORD` | 빈 DB 최초 설치 시 생성되는 admin 계정의 초기 비밀번호 |
| `ENCRYPTION_KEY` | 서버 접속정보·SFTP 자격증명 암호화용 64자리 hex 키 |
| `BACKUP_ENCRYPTION_KEY` | DB·문서 백업 암호화용 별도 64자리 hex 키 |
| `CLAMAV_ENABLED` | 악성코드 검사 활성화 여부 (운영 환경에서는 항상 활성화) |
| `CORS_ORIGIN` | 실제 접속 도메인 또는 IP (예: `http://10.0.0.5:2082`) |
| `VERSION` | 다운로드한 릴리즈 버전과 동일하게 설정 (예: `26.9.0`) |

```bash
# JWT_SECRET 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 초기 관리자 비밀번호 생성 (최초 설치 시에만 사용)
openssl rand -base64 24

# 애플리케이션 암호화 키
openssl rand -hex 32

# 백업 암호화 키 — ENCRYPTION_KEY와 다른 값을 사용
openssl rand -hex 32
```

> `INITIAL_ADMIN_PASSWORD`는 빈 DB 최초 설치 시에만 사용됩니다. 기존 DB가 있으면 계정이나 비밀번호를 초기화하지 않으므로 기존 운영값을 유지해야 합니다. `ENCRYPTION_KEY`와 `BACKUP_ENCRYPTION_KEY`는 백업·복호화에 필요하므로 서로 다른 안전한 장소에 보관하세요.

### 3️⃣ 서비스 실행

```bash
docker compose pull
docker compose up -d
```

Backend 컨테이너가 기동될 때 커밋된 Prisma 마이그레이션을 자동 적용합니다. 마이그레이션 실패 시 애플리케이션은 기동하지 않으며, DB를 자동 롤백하지 않습니다.

### 4️⃣ 접속 정보

**최초 로그인 계정:**
- ID: `admin`
- PW: `.env`의 `INITIAL_ADMIN_PASSWORD` 값

> ⚠️ 최초 로그인 후 반드시 비밀번호를 변경하세요.

---

## 🔄 업그레이드

```bash
# 최신 docker-compose.yml 다운로드
curl -LO https://github.com/HelloJamong/customer-vault/releases/latest/download/docker-compose.yml

# .env의 VERSION을 최신 버전으로 업데이트 (Releases 페이지에서 확인)
vi .env

# 이미지 pull 및 재시작
docker compose pull
docker compose up -d
```

---

## 🏗️ 프로젝트 구조
```
customer-vault/
├── backend/                      # Backend 소스 (Docker 이미지로 빌드됨)
├── frontend/                     # Frontend 소스 (Docker 이미지로 빌드됨)
│
├── proxy/                        # Nginx 리버스 프록시 설정
│   └── nginx.conf                # Nginx 설정 파일
│
├── docs/                         # 운영/구성 가이드 문서
│   ├── docker_setup_guide.md     # Docker/Compose 설치·운영
│   ├── migration_guide.md        # Prisma 마이그레이션·오프라인 업그레이드
│   ├── offline_deployment_guide.md # 폐쇄망 배포
│   └── backend_testing.md        # lint·보안 테스트·E2E
│
├── data/                         # MariaDB 데이터 볼륨 (영구 저장)
├── uploads/                      # 보안 검사 통과 후 저장되는 점검서 파일 저장소 (영구 저장)
├── logs/                         # 애플리케이션 로그 파일 (영구 저장)
│
├── docker-compose.yml            # Docker Compose 설정 파일
├── .env                          # 환경 변수 설정
└── .env.example                  # 환경 변수 샘플
```

**주요 디렉토리 설명:**
- `proxy/`: Nginx 컨테이너에서 사용하는 리버스 프록시 설정
- `data/`: MariaDB 데이터베이스 파일이 저장되는 볼륨 (백업 필수)
- `uploads/`: 보안 검사(매직바이트·ClamAV) 통과 후 저장된 점검서 파일 (백업 필수)
- `logs/`: 애플리케이션 로그 파일 (문제 발생 시 확인)
---

## 📚 추가 가이드

- [Docker 설정/권장 사양](docs/docker_setup_guide.md)
- [로그 위치/정책](docs/logs_information.md)
- [DB 테이블 역할](docs/db_information.md)
- [점검서 저장 경로](docs/documents_storage.md)
- [DB 마이그레이션 및 배포](docs/migration_guide.md)
- [오프라인 배포](docs/offline_deployment_guide.md)
- [원격 SFTP 백업](docs/backup_remote_setup_guide.md)
- [Backend 테스트·E2E](docs/backend_testing.md)
- [릴리즈 절차](docs/RELEASE_GUIDE.md)
