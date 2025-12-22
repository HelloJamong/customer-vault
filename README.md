# 고객창고 (Customer Vault)

내부 고객사 관리 및 유지보수 점검 이력 관리를 위한 웹 기반 시스템

## 📖 프로젝트 소개

고객창고는 고객사 정보와 유지보수 점검 이력을 효율적으로 관리하기 위한 웹 애플리케이션입니다. Docker 기반으로 손쉽게 배포하고 운영할 수 있도록 설계되었습니다.


### 기술 스택

- **Backend**: NestJS 11 (TypeScript), Swagger/OpenAPI, JWT(Access/Refresh)
- **Database**: MariaDB 10.11, Prisma
- **Frontend**: React 19, Vite 7, MUI 7, React Query, Zustand, React Hook Form, Dayjs
- **Build/Deploy**: Docker & Docker Compose

---

## 🚀 빠른 시작

### 1️⃣ 프로젝트 클론

```bash
git clone https://github.com/HelloJamong/customer-vault.git
cd customer-vault
```

### 2️⃣ 환경 변수 설정

```bash
# 환경 변수 파일 생성
cp .env.example .env

# 필요시 .env 파일 수정 (개발 환경은 기본값 사용 가능)
vi .env
```

**프로덕션 환경에서 반드시 변경해야 할 항목:**

1. **NODE_ENV**를 production으로 변경
```env
NODE_ENV=production
LOG_LEVEL=warn
```

2. **JWT_SECRET** (128자 랜덤 문자열)
- 목적: JWT 서명용 비밀키. 충분히 길고 무작위여야 함.
- 생성 명령:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
  - `randomBytes(64)` → 64바이트(512비트) 무작위 값을 생성
  - `.toString('hex')` → 2배 길이의 128자 16진 문자열로 변환

3. **DB_PASSWORD** (강력한 비밀번호)
- 목적: DB 접속용 비밀번호. 대소문자/숫자/특수문자 포함.
- 생성 명령:
```bash
node -e "
const crypto = require('crypto');
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
let password = '';
for (let i = 0; i < 32; i++) {
  password += chars[crypto.randomInt(0, chars.length)];
}
console.log(password);
"
```
  - 32자리 무작위 문자열 생성
  - 문자 집합에 대문자/소문자/숫자/특수문자를 포함해 복잡도 확보

4. **CORS_ORIGIN** (실제 프론트엔드 도메인)
```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```
   - 내부망/사설 IP 환경에서 도메인 없이 쓸 경우 예시: `http://10.0.0.5:3003`
   - HTTPS를 쓰지 않는다면 `http://<IP>:<포트>` 형태로 현재 접속에 사용하는 주소를 그대로 넣으면 됨

### 3️⃣ 서비스 실행

**백엔드만 실행 (기본):**
```bash
docker compose up -d
```

**전체 스택 실행 (Frontend 포함):**
```bash
docker compose --profile frontend up -d
```

**특정 서비스만 실행:**
```bash
# DB + Backend만
docker compose up -d db backend

# Frontend만 재시작
docker compose restart frontend
```

### 4️⃣ 접속 정보

**기본 로그인 계정:**
- ID: `admin`
- PW: `1111`

⚠️ **보안**: 프로덕션 환경에서는 반드시 비밀번호를 변경하세요!

---

## 🏗️ 프로젝트 구조

```
customer-storage/
├── backend/                      # NestJS 백엔드
│   ├── src/                      # auth/users/customers/documents/logs/settings 등 도메인 모듈
│   ├── prisma/                   # Prisma 스키마 및 마이그레이션
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                     # React 프론트엔드
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── docs/                         # 운영/구성 가이드 (로그, DB, Docker, 문서 저장 등)
├── data/                         # MariaDB 데이터 볼륨
├── uploads/                      # 업로드 파일 저장소
├── logs/                         # 애플리케이션 로그
│
├── docker-compose.yml            # 통합 Docker Compose 설정
├── .env                          # 환경 변수 (gitignore)
├── .env.example                  # 환경 변수 템플릿
└── README.md
```

---

## 🐳 Docker 명령어

### 서비스 관리

```bash
docker compose up -d
```

자세한 설정/권장 사양/로그/저장소 구조는 `docs/` 가이드를 참고하세요.

---

## 📚 추가 가이드

- Docker 설정/권장 사양: `docs/docker_setup_guide.md`
- 로그 위치/정책: `docs/logs_information.md`
- DB 테이블 역할: `docs/db_information.md`
- 점검서 저장 경로: `docs/documents_storage.md`
