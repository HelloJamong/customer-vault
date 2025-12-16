# 고객창고 (Customer-Storage)

내부 고객사 관리 및 유지보수 점검 이력 관리를 위한 웹 기반 시스템

## 📖 프로젝트 소개

고객창고는 고객사 정보와 유지보수 점검 이력을 효율적으로 관리하기 위한 웹 애플리케이션입니다. Docker 기반으로 손쉽게 배포하고 운영할 수 있도록 설계되었습니다.

### 기술 스택

- **Backend**: NestJS (TypeScript)
- **Database**: MariaDB 10.11
- **ORM**: Prisma
- **Authentication**: JWT (Access Token + Refresh Token)
- **API Documentation**: Swagger/OpenAPI
- **Container**: Docker & Docker Compose

### 주요 기능

- ✅ 역할 기반 사용자 인증 (슈퍼관리자/관리자/일반사용자)
- ✅ 고객사 정보 관리 (담당자, 계약, 점검 정보)
- ✅ 점검 문서 업로드 및 관리
- ✅ 점검 이력 조회 및 통계
- ✅ 시스템 로그 및 보안 설정
- ✅ RESTful API 제공
- ✅ Health Check 엔드포인트

---

## 🚀 빠른 시작

### 필수 요구사항

- Docker 20.10 이상
- Docker Compose 2.0 이상

### 1️⃣ 프로젝트 클론

```bash
git clone https://github.com/HelloJamong/customer-storage.git
cd customer-storage
```

### 2️⃣ 환경 변수 설정

```bash
# 환경 변수 파일 생성
cp .env.example .env

# 필요시 .env 파일 수정 (개발 환경은 기본값 사용 가능)
nano .env
```

**프로덕션 환경에서 반드시 변경해야 할 항목:**

1. **NODE_ENV**를 production으로 변경
```env
NODE_ENV=production
LOG_LEVEL=warn
```

2. **JWT_SECRET** (128자 랜덤 문자열)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. **DB_PASSWORD** (강력한 비밀번호)
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

4. **CORS_ORIGIN** (실제 프론트엔드 도메인)
```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

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

### 4️⃣ 서비스 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f backend

# 모든 서비스 로그
docker compose logs -f

# Health Check
curl http://localhost:5001/api/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-12T13:25:00.000Z",
  "database": "connected",
  "uptime": 123.456
}
```

### 5️⃣ 접속 정보

**API 서버:**
- Base URL: http://localhost:5001/api
- Swagger 문서: http://localhost:5001/api/docs
- Health Check: http://localhost:5001/api/health

**기본 로그인 계정:**
- ID: `vmadm`
- PW: `1111`

⚠️ **보안**: 프로덕션 환경에서는 반드시 비밀번호를 변경하세요!

---

## 🏗️ 프로젝트 구조

```
customer-storage/
├── backend/                      # NestJS 백엔드
│   ├── src/
│   │   ├── auth/                # 인증 모듈 (JWT)
│   │   ├── users/               # 사용자 관리
│   │   ├── customers/           # 고객사 관리
│   │   ├── inspection-targets/  # 점검 대상 관리
│   │   ├── documents/           # 문서 관리
│   │   ├── logs/                # 로그 관리
│   │   ├── settings/            # 설정 관리
│   │   ├── dashboard/           # 대시보드
│   │   ├── health/              # Health Check
│   │   └── common/              # 공통 모듈 (Prisma, Guards 등)
│   ├── prisma/
│   │   └── schema.prisma        # 데이터베이스 스키마
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                     # React 프론트엔드 (선택적)
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
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
# 백엔드 시작 (DB + Backend)
docker compose up -d

# 전체 스택 시작 (DB + Backend + Frontend)
docker compose --profile frontend up -d

# 중지
docker compose down

# 재시작
docker compose restart

# 특정 서비스 재시작
docker compose restart backend

# 로그 확인
docker compose logs -f backend

# 모든 로그 확인
docker compose logs -f

# 컨테이너 접속
docker exec -it customer_backend sh
```

### 데이터베이스 관리

```bash
# MariaDB 접속
docker exec -it customer_db mysql -u customer_user -p customer_db

# 데이터베이스 백업
docker exec customer_db mysqldump -u customer_user -p customer_db > backup.sql

# 데이터베이스 복원
docker exec -i customer_db mysql -u customer_user -p customer_db < backup.sql
```

### Prisma 관리

```bash
# Prisma Client 재생성
docker exec customer_backend npx prisma generate

# 데이터베이스 스키마 확인
docker exec customer_backend npx prisma db pull
```

---

## 📡 API 문서

API 문서는 Swagger UI를 통해 제공됩니다.

**접속 방법:**
```
http://localhost:5001/api/docs
```

### 주요 엔드포인트

| 카테고리 | 엔드포인트 | 설명 |
|---------|-----------|------|
| **인증** | POST /api/auth/login | 로그인 |
| | POST /api/auth/refresh | 토큰 갱신 |
| | POST /api/auth/logout | 로그아웃 |
| **사용자** | GET /api/users | 사용자 목록 |
| | GET /api/users/:id | 사용자 조회 |
| | POST /api/users | 사용자 생성 |
| | PATCH /api/users/:id | 사용자 수정 |
| | DELETE /api/users/:id | 사용자 삭제 |
| **고객사** | GET /api/customers | 고객사 목록 |
| | GET /api/customers/:id | 고객사 상세 |
| | POST /api/customers | 고객사 생성 |
| **문서** | POST /api/documents/upload/:customerId | 문서 업로드 |
| | GET /api/documents/customer/:customerId | 고객사 문서 목록 |
| **Health** | GET /api/health | 서버 상태 확인 |

### 인증 방식

API는 JWT Bearer 토큰 인증을 사용합니다.

**로그인:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"vmadm","password":"1111"}'
```

**응답:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "vmadm",
    "role": "SUPER_ADMIN"
  }
}
```

**인증이 필요한 API 호출:**
```bash
curl -X GET http://localhost:5001/api/users \
  -H "Authorization: Bearer {access_token}"
```

---

## 🔒 보안 설정

### 프로덕션 체크리스트

배포 전 반드시 확인하세요:

- [ ] `.env.production` 파일 생성 및 값 설정
- [ ] JWT_SECRET 새로 생성 (128자)
- [ ] DB 비밀번호 변경 (32자 이상)
- [ ] CORS_ORIGIN에 실제 도메인 설정
- [ ] LOG_LEVEL=warn 확인
- [ ] Health Check 엔드포인트 확인
- [ ] SSL/TLS 인증서 설정 (Nginx/Apache)
- [ ] 방화벽 규칙 설정
- [ ] 백업 전략 수립

### 토큰 만료 시간

**개발 환경:**
- Access Token: 1시간
- Refresh Token: 7일

**프로덕션 환경:**
- Access Token: 15분 (보안 강화)
- Refresh Token: 7일

---

## 🔧 개발 가이드

### 로컬 개발 환경 설정

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치
npm install

# Prisma Client 생성
npx prisma generate

# 개발 서버 실행 (hot reload)
npm run start:dev
```

### 데이터베이스 마이그레이션

```bash
# Prisma 스키마 변경 후
npx prisma db push

# 또는 마이그레이션 파일 생성
npx prisma migrate dev --name migration_name
```

### 코드 스타일

프로젝트는 ESLint와 Prettier를 사용합니다.

```bash
# Lint 검사
npm run lint

# 자동 수정
npm run lint:fix

# 포맷팅
npm run format
```

---

## 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│              Docker Compose Environment                 │
│                                                         │
│  ┌──────────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ React Frontend   │  │   NestJS    │  │  MariaDB  │ │
│  │   (Optional)     │─►│  Backend    │◄─┤   10.11   │ │
│  │                  │  │ (TypeScript)│  │           │ │
│  │  - Vite + React  │  │             │  │  - Prisma │ │
│  │  - Nginx         │  │ - REST API  │  │  - Data   │ │
│  │  Port: 80        │  │ - JWT Auth  │  │  Storage  │ │
│  │                  │  │ - Swagger   │  │           │ │
│  └──────────────────┘  │ Port: 5000  │  │Port: 3306 │ │
│         │              └─────────────┘  └───────────┘ │
│    Host: 3000               │                          │
│                        Host: 5001                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🚧 개선 계획

### 로깅 및 모니터링
- [ ] Winston 로거 통합
- [ ] 파일 로그 로테이션
- [ ] 에러 추적 시스템 (Sentry 등)
- [ ] API 응답 시간 모니터링

### 성능 최적화
- [ ] 데이터베이스 인덱스 최적화
- [ ] Redis 캐싱 구현
- [ ] 쿼리 성능 분석 및 개선
- [ ] API Rate Limiting

### 추가 보안
- [ ] Helmet.js 미들웨어 적용
- [ ] CSRF 보호
- [ ] Request Validation 강화
- [ ] IP 화이트리스트 관리

### 프론트엔드 개선
- [ ] UI/UX 개선
- [ ] 반응형 디자인 최적화
- [ ] PWA 지원
- [ ] 오프라인 모드

---

## 🤝 기여 및 지원

- **문제 보고**: GitHub Issues에 등록해주세요
- **기능 제안**: Pull Request 환영합니다
- **문서 개선**: README 및 코드 주석 개선 제안

---

## 📄 라이선스

이 프로젝트는 내부 사용을 위한 프로젝트입니다.
