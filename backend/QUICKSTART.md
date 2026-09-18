# 🚀 NestJS 백엔드 빠른 시작

## 개발 환경 (로컬)

```bash
# 1. 디렉토리 이동
cd backend

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 DATABASE_URL, JWT_SECRET 등 설정

# 4. Prisma Client 생성
npm run prisma:generate

# 5. 데이터베이스 마이그레이션 (커밋된 migration 적용)
npx prisma migrate deploy

# 6. 개발 서버 실행
npm run start:dev
```

서버: http://localhost:5000
Swagger: http://localhost:5000/api/docs

---

## Docker 환경

```bash
# 1. 환경 변수 설정
cd backend
cp .env.example .env
# .env 파일 수정 (DB_PASSWORD, INITIAL_ADMIN_PASSWORD, JWT_SECRET,
# ENCRYPTION_KEY, BACKUP_ENCRYPTION_KEY 등)

# 2. Docker Compose 실행
docker compose up -d

# 3. 로그 확인
docker compose logs -f backend

# 4. 데이터베이스 마이그레이션 상태 확인
docker compose exec backend npx prisma migrate status

# 5. 중지
docker compose down
```

---

## 필수 환경 변수

```env
# DATABASE_URL
DATABASE_URL="mysql://user:password@localhost:3306/customer_db"

# JWT_SECRET (32자 이상 권장)
JWT_SECRET=your-very-strong-secret-key-here

# 빈 DB 최초 설치 시에만 사용
INITIAL_ADMIN_PASSWORD=설치자가_지정한_초기_비밀번호
ENCRYPTION_KEY=64자리_hex_문자열
BACKUP_ENCRYPTION_KEY=ENCRYPTION_KEY와_다른_64자리_hex_문자열

# 기타
PORT=5000
NODE_ENV=development
```

---

## 주요 명령어

```bash
# 개발
npm run start:dev          # 개발 서버 (watch)
npm run build              # 빌드
npm run start:prod         # 프로덕션 서버

# Prisma
npm run prisma:generate    # Client 생성
npm run prisma:migrate     # 마이그레이션
npm run prisma:studio      # DB GUI

# Docker
docker compose up -d       # 시작
docker compose down        # 중지
docker compose logs -f     # 로그
```

---

## 기본 API 테스트

### 로그인
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"INITIAL_ADMIN_PASSWORD에_설정한_값"}'
```

### 사용자 목록 조회 (토큰 필요)
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

더 자세한 내용은 [README.md](./README.md) 또는 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)를 참고하세요.
