# Flask → NestJS 마이그레이션 가이드

이 문서는 기존 Flask 백엔드를 NestJS로 마이그레이션한 내용과 실행 방법을 설명합니다.

## 📊 마이그레이션 완료 현황

### ✅ 완료된 모듈

| 모듈 | 상태 | 설명 |
|------|------|------|
| **Auth** | ✅ 완료 | JWT 인증, 로그인/로그아웃, 비밀번호 변경 |
| **Users** | ✅ 완료 | 사용자 CRUD, 권한 관리, 비밀번호 초기화 |
| **Customers** | ✅ 완료 | 고객사 CRUD, 점검 상태 계산 |
| **InspectionTargets** | ✅ 완료 | 점검 대상 CRUD |
| **Documents** | ✅ 완료 | 파일 업로드/다운로드, 문서 관리 |
| **Logs** | ✅ 완료 | 서비스 로그, 로그인 시도 조회 |
| **Settings** | ✅ 완료 | 시스템 설정 조회/수정 |
| **Dashboard** | ✅ 완료 | 통계 대시보드 |

### 🗄️ 데이터베이스 마이그레이션

Prisma ORM으로 모든 모델 정의 완료:
- User (사용자)
- Customer (고객사)
- UserCustomer (중간 테이블)
- InspectionTarget (점검 대상)
- Document (문서)
- SystemSettings (시스템 설정)
- LoginAttempt (로그인 시도)
- UserSession (세션)
- ServiceLog (서비스 로그)

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
cd backend
cp .env.example .env
```

`.env` 파일을 열어 다음 값을 설정하세요:

```env
# 데이터베이스 (기존 Flask DB 연결)
DATABASE_URL="mysql://customer_user:your_password@localhost:3306/customer_db"

# JWT 시크릿 (새로 생성 권장)
JWT_SECRET=your-very-strong-secret-key-minimum-32-characters

# 기타 설정
PORT=5000
NODE_ENV=development
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Prisma Client 생성

```bash
npm run prisma:generate
```

### 4. 데이터베이스 마이그레이션

⚠️ **중요**: 기존 Flask DB를 사용하는 경우

#### 옵션 A: 기존 DB 스키마 확인 (권장)

```bash
# 기존 DB 스키마 확인
npx prisma db pull

# schema.prisma와 비교하여 차이 확인
# 필요시 수동으로 스키마 조정
```

#### 옵션 B: 새로운 DB로 마이그레이션

```bash
# 새 마이그레이션 생성 및 적용
npx prisma migrate dev --name init
```

### 5. 개발 서버 실행

```bash
npm run start:dev
```

서버가 `http://localhost:5000`에서 실행됩니다.

### 6. API 문서 확인

Swagger UI: http://localhost:5000/api/docs

---

## 🐳 Docker로 실행

### 1. 환경 변수 설정

```bash
# .env 파일 수정
nano .env
```

필수 환경 변수:
```env
DB_ROOT_PASSWORD=강력한_루트_비밀번호
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=강력한_사용자_비밀번호
JWT_SECRET=최소_32자_이상의_강력한_시크릿키
```

### 2. Docker Compose 실행

```bash
# 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 중지
docker-compose down
```

### 3. 데이터베이스 마이그레이션 (Docker 환경)

```bash
# 컨테이너 내에서 마이그레이션 실행
docker-compose exec backend npx prisma migrate deploy
```

---

## 🔄 기존 Flask 데이터 마이그레이션

### 데이터 호환성

NestJS 버전은 기존 Flask DB 스키마와 **완전히 호환**됩니다.
- 테이블명, 컬럼명 동일
- 데이터 타입 동일
- 관계 구조 동일

### 마이그레이션 단계

1. **기존 DB 백업**
   ```bash
   mysqldump -u root -p customer_db > backup_$(date +%Y%m%d).sql
   ```

2. **NestJS 서버 테스트**
   - 기존 DB를 그대로 사용하여 NestJS 서버 실행
   - API 테스트 (Swagger UI 사용)
   - 데이터 조회/수정 테스트

3. **점진적 전환**
   - Flask와 NestJS 서버를 다른 포트에서 병렬 운영
   - 프론트엔드에서 단계적으로 NestJS API로 전환

4. **완전 전환**
   - Flask 서버 종료
   - NestJS 서버만 운영

---

## 📋 API 엔드포인트 비교

### Flask → NestJS 엔드포인트 매핑

| Flask | NestJS | 메서드 | 설명 |
|-------|--------|--------|------|
| `/login` | `/api/auth/login` | POST | 로그인 |
| `/logout` | `/api/auth/logout` | POST | 로그아웃 |
| `/users` | `/api/users` | GET | 사용자 목록 |
| `/users/<id>` | `/api/users/:id` | GET | 사용자 상세 |
| `/customers` | `/api/customers` | GET | 고객사 목록 |
| `/customers/<id>` | `/api/customers/:id` | GET | 고객사 상세 |
| `/documents` | `/api/documents/customer/:customerId` | GET | 문서 목록 |
| `/upload` | `/api/documents/customer/:customerId` | POST | 파일 업로드 |

**주요 변경사항:**
- 모든 API 경로에 `/api` 접두사 추가
- RESTful 구조로 변경 (예: `/documents/customer/:id`)

---

## 🔐 인증 시스템

### Flask vs NestJS

| 항목 | Flask | NestJS |
|------|-------|--------|
| 세션 관리 | Flask-Login (쿠키) | JWT Token |
| 인증 방식 | 세션 기반 | Bearer Token |
| 보안 | 세션 쿠키 | JWT + Passport |

### JWT 토큰 사용법

#### 로그인
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1111"}'
```

응답:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super_admin"
  }
}
```

#### API 호출 시 인증
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer eyJhbGci..."
```

---

## 🛠️ 개발 가이드

### 추가 모듈 개발

새로운 기능 추가 시:

```bash
# NestJS CLI 사용
cd backend
nest g module feature-name
nest g controller feature-name
nest g service feature-name
```

### 코드 스타일
- TypeScript 강제
- Prettier + ESLint 적용
- DTO 클래스 검증 (class-validator)
- Swagger 문서화 필수

### 테스트
```bash
# 유닛 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

---

## ⚠️ 주의사항

### 1. 환경 변수
- `JWT_SECRET`은 프로덕션에서 **반드시 강력한 값**으로 설정
- `.env` 파일은 Git에 커밋하지 말 것

### 2. 데이터베이스
- 기존 Flask DB 사용 시 스키마 호환성 확인 필수
- 마이그레이션 전 **반드시 백업**

### 3. 파일 업로드
- `uploads/` 디렉토리 권한 확인
- Docker 볼륨 마운트 경로 확인

### 4. CORS
- 프론트엔드 도메인을 `CORS_ORIGIN`에 설정
- 프로덕션에서는 `*` 사용 금지

---

## 🐛 문제 해결

### Prisma Client 오류
```bash
npm run prisma:generate
```

### 포트 충돌
`.env`에서 `PORT` 변경

### 데이터베이스 연결 실패
- `DATABASE_URL` 확인
- MariaDB 서비스 상태 확인
- 방화벽 설정 확인

### 파일 업로드 실패
- `UPLOAD_DIR` 경로 확인
- 디렉토리 쓰기 권한 확인
- `MAX_UPLOAD_SIZE` 설정 확인

---

## 📚 추가 리소스

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs/)
- [BACKEND_SPEC.md](../BACKEND_SPEC.md) - 백엔드 기능 정의서
- [README.md](./README.md) - 백엔드 사용 가이드

---

## ✅ 마이그레이션 체크리스트

- [ ] 환경 변수 설정 (.env)
- [ ] 의존성 설치 (npm install)
- [ ] Prisma Client 생성
- [ ] 기존 DB 백업
- [ ] 데이터베이스 연결 테스트
- [ ] API 테스트 (Swagger)
- [ ] 파일 업로드 테스트
- [ ] 인증/권한 테스트
- [ ] 프론트엔드 연동 테스트
- [ ] 프로덕션 환경 설정
- [ ] Docker 빌드 테스트
- [ ] 배포

---

**마이그레이션 완료!** 🎉
