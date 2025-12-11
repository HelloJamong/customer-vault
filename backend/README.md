# Customer Storage Backend - NestJS

고객사 정보 및 유지보수 점검 이력 관리 시스템의 NestJS 백엔드 서버입니다.

## 📋 기술 스택

- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma 5
- **Database**: MariaDB 10.11
- **Authentication**: JWT (Passport)
- **Documentation**: Swagger/OpenAPI
- **Container**: Docker

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 데이터베이스 및 JWT 설정 수정
```

### 2. 개발 환경 실행

```bash
# 의존성 설치
npm install

# Prisma Client 생성
npm run prisma:generate

# 개발 서버 실행
npm run start:dev
```

서버는 `http://localhost:5000`에서 실행됩니다.

### 3. API 문서 확인

Swagger 문서: `http://localhost:5000/api/docs`

## 🐳 Docker로 실행

```bash
# Docker Compose로 실행 (백엔드 + MariaDB)
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 중지
docker-compose down
```

## 📦 사용 가능한 명령어

```bash
# 개발
npm run start:dev          # 개발 서버 (watch 모드)
npm run start:debug        # 디버그 모드

# 빌드
npm run build              # 프로덕션 빌드
npm run start:prod         # 프로덕션 서버

# Prisma
npm run prisma:generate    # Prisma Client 생성
npm run prisma:migrate     # 마이그레이션 실행
npm run prisma:studio      # Prisma Studio 실행

# 테스트
npm run test               # 유닛 테스트
npm run test:e2e           # E2E 테스트
npm run test:cov           # 테스트 커버리지
```

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── auth/                 # 인증 모듈 (JWT, Login, Guards)
│   ├── users/                # 사용자 관리 모듈
│   ├── customers/            # 고객사 관리 모듈
│   ├── inspection-targets/   # 점검 대상 모듈
│   ├── documents/            # 문서 관리 모듈
│   ├── logs/                 # 로그 모듈
│   ├── settings/             # 시스템 설정 모듈
│   ├── dashboard/            # 대시보드 모듈
│   ├── common/               # 공통 모듈
│   │   ├── prisma/          # Prisma 서비스
│   │   ├── decorators/      # 커스텀 데코레이터
│   │   └── enums/           # Enum 정의
│   ├── app.module.ts        # 루트 모듈
│   └── main.ts              # 애플리케이션 엔트리포인트
├── prisma/
│   └── schema.prisma        # Prisma 스키마
├── Dockerfile               # Docker 이미지 빌드 파일
├── docker-compose.yml       # Docker Compose 설정
└── .env                     # 환경 변수

```

## 🔐 인증 및 권한

### 역할 (Roles)

- `super_admin`: 슈퍼 관리자 (전체 시스템 관리)
- `admin`: 관리자 (사용자 관리, 고객사 조회)
- `user`: 일반 사용자 (담당 고객사만 접근)

### API 인증

모든 보호된 엔드포인트는 JWT Bearer 토큰이 필요합니다:

```bash
Authorization: Bearer <access_token>
```

## 📌 주요 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/change-password` - 비밀번호 변경

### 사용자
- `GET /api/users` - 사용자 목록
- `POST /api/users` - 사용자 생성
- `PATCH /api/users/:id` - 사용자 수정
- `DELETE /api/users/:id` - 사용자 삭제

### 고객사
- `GET /api/customers` - 고객사 목록
- `GET /api/customers/:id` - 고객사 상세
- `POST /api/customers` - 고객사 생성
- `PATCH /api/customers/:id` - 고객사 수정

## 🔧 환경 변수

주요 환경 변수:

```env
# Application
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL="mysql://user:password@localhost:3306/customer_db"

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=16777216

# CORS
CORS_ORIGIN=*
```

## 🗄️ 데이터베이스

### Prisma 마이그레이션

```bash
# 마이그레이션 생성
npx prisma migrate dev --name migration_name

# 마이그레이션 적용
npx prisma migrate deploy

# 데이터베이스 초기화 (주의!)
npx prisma migrate reset
```

### Prisma Studio

데이터베이스 GUI:

```bash
npm run prisma:studio
```

## 📝 개발 가이드

### 새 모듈 추가

```bash
# NestJS CLI 사용
nest g module module-name
nest g controller module-name
nest g service module-name
```

### 코드 스타일

- TypeScript 사용
- ESLint + Prettier 적용
- 모든 DTO에 class-validator 사용
- Swagger 문서화 필수

## 🐛 문제 해결

### Prisma Client 생성 오류

```bash
npm run prisma:generate
```

### 포트 충돌

`.env` 파일에서 `PORT` 변경

### 데이터베이스 연결 오류

`DATABASE_URL` 확인 및 MariaDB 서비스 상태 확인

## 📚 추가 문서

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs/)
- [BACKEND_SPEC.md](../BACKEND_SPEC.md) - 백엔드 기능 정의서

## ⚠️ 주의사항

- 프로덕션 환경에서는 반드시 강력한 `JWT_SECRET` 사용
- `.env` 파일은 Git에 커밋하지 말 것
- 정기적으로 의존성 업데이트 확인
- 로그 파일 용량 모니터링

## 📄 라이선스

내부 사용 프로젝트
