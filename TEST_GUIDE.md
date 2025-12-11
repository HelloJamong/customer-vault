# NestJS 백엔드 구동 테스트 가이드

## 🎯 테스트 시나리오

이 가이드는 NestJS 백엔드를 Docker로 실행하고 테스트하는 방법을 단계별로 설명합니다.

---

## 📋 사전 준비

### 1. 필수 소프트웨어 확인

```bash
# Docker 버전 확인
docker --version
# Docker version 20.10.0 이상 필요

# Docker Compose 버전 확인
docker-compose --version
# docker-compose version 1.29.0 이상 필요
```

### 2. 기존 컨테이너 정리 (선택사항)

```bash
# 기존 Flask 컨테이너가 실행 중이라면 중지
docker-compose down

# 또는 특정 컨테이너만 중지
docker stop customer_web customer_db
```

---

## 🚀 방법 1: Docker Compose로 테스트 (권장)

### Step 1: 환경 변수 설정

```bash
# 프로젝트 루트 디렉토리에서
cd /Users/hellowook/Dev/VS_Code/customer-storage

# 환경 변수 파일 생성
cp .env.nestjs.example .env.nestjs

# 환경 변수 파일 편집
nano .env.nestjs
```

**필수 설정 항목:**
```env
# 데이터베이스 비밀번호 (강력하게!)
DB_ROOT_PASSWORD=MyStr0ng!RootPass123
DB_PASSWORD=MyStr0ng!UserPass456

# JWT 시크릿 (32자 이상, 아래 명령어로 생성 가능)
JWT_SECRET=<generate_using_command_below>
```

**JWT_SECRET 생성 방법:**
```bash
# Node.js 있는 경우
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL 있는 경우
openssl rand -hex 32

# Python 있는 경우
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Step 2: Docker 이미지 빌드 및 실행

```bash
# .env.nestjs 파일을 사용하여 실행
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d

# 또는 빌드부터 다시 하려면
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d --build
```

### Step 3: 로그 확인

```bash
# 전체 로그 확인
docker-compose -f docker-compose.nestjs.yml logs -f

# 백엔드만 로그 확인
docker-compose -f docker-compose.nestjs.yml logs -f backend

# DB만 로그 확인
docker-compose -f docker-compose.nestjs.yml logs -f db
```

### Step 4: 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker-compose -f docker-compose.nestjs.yml ps

# 예상 출력:
# NAME                  COMMAND                  STATUS          PORTS
# customer_backend      "node dist/main"         Up 30 seconds   0.0.0.0:5000->5000/tcp
# customer_db           "docker-entrypoint.s…"   Up 45 seconds   0.0.0.0:3306->3306/tcp
```

### Step 5: 데이터베이스 마이그레이션

```bash
# 최초 실행 시 Prisma 마이그레이션 필요
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma migrate deploy

# 또는 개발 모드 마이그레이션
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma migrate dev --name init
```

---

## 🧪 API 테스트

### 1. Swagger UI 접속

브라우저에서 열기:
```
http://localhost:5000/api/docs
```

### 2. Health Check

```bash
curl http://localhost:5000/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-12-12T...",
  "database": "connected"
}
```

### 3. 로그인 테스트

```bash
# 기본 관리자 계정으로 로그인 (DB에 데이터가 있는 경우)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "1111"
  }'
```

예상 응답:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "관리자",
    "role": "super_admin",
    "isFirstLogin": false
  }
}
```

### 4. 인증된 API 호출

```bash
# 위에서 받은 accessToken 사용
export TOKEN="여기에_액세스_토큰_붙여넣기"

# 사용자 목록 조회
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN"

# 고객사 목록 조회
curl -X GET http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 문제 해결

### 문제 1: 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose -f docker-compose.nestjs.yml logs backend

# 일반적인 원인:
# - 환경 변수 설정 오류
# - 포트 충돌 (5000번 포트가 이미 사용 중)
# - 데이터베이스 연결 실패
```

**해결 방법:**
```bash
# 포트 변경 (.env.nestjs)
BACKEND_PORT=5001

# 다시 시작
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d
```

### 문제 2: 데이터베이스 연결 실패

```bash
# DB 컨테이너 상태 확인
docker-compose -f docker-compose.nestjs.yml ps db

# DB 로그 확인
docker-compose -f docker-compose.nestjs.yml logs db

# DB 직접 접속 테스트
docker-compose -f docker-compose.nestjs.yml exec db mysql -u customer_user -p customer_db
```

### 문제 3: Prisma 마이그레이션 오류

```bash
# 컨테이너 내부로 들어가기
docker-compose -f docker-compose.nestjs.yml exec backend sh

# Prisma 상태 확인
npx prisma migrate status

# 강제 리셋 (주의: 데이터 손실!)
npx prisma migrate reset

# 컨테이너 나가기
exit
```

### 문제 4: 파일 업로드 오류

```bash
# uploads 디렉토리 권한 확인
ls -la uploads/

# 권한 부여
chmod -R 777 uploads/
```

---

## 🧹 정리 및 재시작

### 중지

```bash
# 컨테이너 중지 (데이터 유지)
docker-compose -f docker-compose.nestjs.yml stop

# 컨테이너 중지 및 삭제 (데이터 유지)
docker-compose -f docker-compose.nestjs.yml down

# 컨테이너 + 볼륨 모두 삭제 (주의: 데이터 손실!)
docker-compose -f docker-compose.nestjs.yml down -v
```

### 재시작

```bash
# 빠른 재시작
docker-compose -f docker-compose.nestjs.yml restart

# 완전히 다시 빌드
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d --build --force-recreate
```

---

## 📊 테스트 체크리스트

- [ ] Docker 및 Docker Compose 설치 확인
- [ ] `.env.nestjs` 파일 생성 및 설정
- [ ] `docker-compose up -d` 실행
- [ ] 컨테이너 상태 확인 (`docker-compose ps`)
- [ ] 로그 확인 (에러 없음)
- [ ] 데이터베이스 마이그레이션
- [ ] Swagger UI 접속 (http://localhost:5000/api/docs)
- [ ] Health Check API 테스트
- [ ] 로그인 API 테스트
- [ ] 인증된 API 호출 테스트
- [ ] 파일 업로드 테스트 (선택)

---

## 🚀 방법 2: 로컬 개발 환경 테스트

Docker 없이 로컬에서 직접 실행:

```bash
# 1. 백엔드 디렉토리 이동
cd backend

# 2. 환경 변수 설정
cp .env.example .env
nano .env

# 3. 의존성 설치
npm install

# 4. Prisma Client 생성
npm run prisma:generate

# 5. 데이터베이스 마이그레이션
npx prisma migrate dev --name init

# 6. 개발 서버 실행
npm run start:dev
```

---

## 📝 추가 테스트 명령어

### Postman 컬렉션 사용

Swagger UI에서 "Schemas" 다운로드 → Postman으로 Import

### 데이터베이스 직접 확인

```bash
# Prisma Studio 실행 (Docker 내부)
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma studio

# 브라우저에서 http://localhost:5555 접속
```

### 컨테이너 리소스 확인

```bash
# CPU, 메모리 사용량 확인
docker stats customer_backend customer_db
```

---

## ✅ 테스트 성공 기준

1. ✅ 모든 컨테이너가 `Up` 상태
2. ✅ Swagger UI 접속 가능
3. ✅ 로그인 API 정상 작동
4. ✅ JWT 토큰 발급 성공
5. ✅ 인증된 API 호출 성공
6. ✅ 데이터베이스 연결 정상

---

**테스트 완료 후 이슈가 있으면 로그를 확인하고 필요시 문의하세요!** 🚀
