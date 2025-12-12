# 🚀 NestJS 백엔드 마이그레이션 테스트 가이드

## 📋 현재 상황

- **기존 Flask 백엔드**: 포트 5001에서 실행 중
- **새로운 NestJS 백엔드**: 포트 5000에서 테스트 예정
- **공유 MariaDB**: 기존 컨테이너 사용 (포트 3306)

---

## 🎯 테스트 시나리오 2가지

### **방법 1: 기존 Flask와 병렬 테스트 (권장)**
기존 Flask는 그대로 두고, NestJS를 별도 DB로 새로 띄워서 테스트

### **방법 2: NestJS로 완전 전환 테스트**
Flask를 중지하고 NestJS로 완전히 교체해서 테스트

---

## 🔵 방법 1: 병렬 테스트 (기존 환경 유지)

### 장점
- ✅ 기존 Flask 백엔드 그대로 유지
- ✅ 문제 발생 시 즉시 롤백 가능
- ✅ 양쪽 API 동시 비교 가능

### 단계별 진행

#### Step 1: 환경 확인
```bash
# 현재 실행 중인 컨테이너 확인
docker ps

# 예상 출력:
# customer_web (Flask) - 포트 5001
# customer_db (MariaDB) - 포트 3306
```

#### Step 2: 포트 변경 (충돌 방지)
NestJS를 5002번 포트로 변경:
```bash
# .env.nestjs 파일 수정
nano .env.nestjs

# 아래 라인을 변경:
BACKEND_PORT=5002  # 5000 → 5002로 변경
```

#### Step 3: NestJS 전용 DB 생성
기존 DB와 분리된 새 데이터베이스 사용:
```bash
# .env.nestjs 파일에서 DB 이름 변경
DB_NAME=customer_db_nestjs  # customer_db → customer_db_nestjs
```

#### Step 4: Docker Compose 파일 수정
```bash
nano docker-compose.nestjs.yml
```

**수정할 부분:**
```yaml
services:
  db:
    # 기존 컨테이너를 재사용하는 대신 새로운 이름 사용
    container_name: customer_db_nestjs
    ports:
      - "3307:3306"  # 3306 → 3307로 변경
```

#### Step 5: NestJS 컨테이너 시작
```bash
# 스크립트 사용
./test-nestjs.sh start

# 또는 직접 실행
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d --build
```

#### Step 6: 로그 확인
```bash
# 전체 로그
./test-nestjs.sh logs

# 백엔드만
docker-compose -f docker-compose.nestjs.yml logs -f backend
```

#### Step 7: 데이터베이스 마이그레이션
```bash
./test-nestjs.sh migrate

# 또는
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma migrate deploy
```

#### Step 8: API 테스트
```bash
# Health Check
curl http://localhost:5002/api/health

# Swagger UI 접속
open http://localhost:5002/api/docs
```

#### Step 9: 양쪽 비교 테스트
```bash
# Flask (기존)
curl http://localhost:5001/health

# NestJS (새로운)
curl http://localhost:5002/api/health
```

---

## 🟢 방법 2: 완전 전환 테스트 (Flask 중지)

### 장점
- ✅ 실제 프로덕션 환경과 동일한 테스트
- ✅ 기존 데이터베이스 그대로 사용
- ✅ 포트 충돌 없음

### 단계별 진행

#### Step 1: 기존 Flask 백엔드 중지
```bash
# Flask 컨테이너만 중지 (DB는 유지)
docker stop customer_web

# 확인
docker ps
# customer_db만 실행 중이어야 함
```

#### Step 2: 기존 DB 사용 설정 확인
`.env.nestjs` 파일이 기존 DB를 사용하도록 설정:
```env
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=<기존_DB_패스워드>  # .env 파일에서 확인
```

#### Step 3: Docker Compose 파일 수정
기존 DB 컨테이너를 재사용:
```bash
nano docker-compose.nestjs.yml
```

**수정할 부분:**
```yaml
services:
  backend:
    # ... 기타 설정
    environment:
      - DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@customer_db:3306/${DB_NAME}
    networks:
      - customer-network

  # db 섹션 주석 처리 (기존 DB 사용)
  # db:
  #   ...

networks:
  customer-network:
    external: true  # 기존 네트워크 사용
```

#### Step 4: NestJS 백엔드 시작
```bash
./test-nestjs.sh start

# 또는
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d --build
```

#### Step 5: Prisma 마이그레이션
```bash
# 기존 스키마와 동기화
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma db pull
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma generate
```

#### Step 6: API 테스트
```bash
# Health Check
curl http://localhost:5000/api/health

# Swagger UI
open http://localhost:5000/api/docs

# 기존 관리자 계정으로 로그인
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "1111"
  }'
```

#### Step 7: Flask 재시작 (필요시 롤백)
문제 발생 시 즉시 Flask로 복귀:
```bash
# NestJS 중지
docker-compose -f docker-compose.nestjs.yml down

# Flask 재시작
docker start customer_web
```

---

## 🧪 공통 테스트 체크리스트

### 1. 기본 동작 확인
- [ ] 컨테이너 정상 실행 (`docker ps`)
- [ ] Health Check API 응답 확인
- [ ] Swagger UI 접속 가능
- [ ] 데이터베이스 연결 정상

### 2. 인증 테스트
- [ ] 로그인 API 테스트
- [ ] JWT 토큰 발급 확인
- [ ] 잘못된 비밀번호로 로그인 실패 확인
- [ ] 토큰 없이 보호된 API 호출 시 401 에러

### 3. CRUD 테스트
- [ ] 사용자 목록 조회
- [ ] 고객사 목록 조회
- [ ] 고객사 생성/수정/삭제
- [ ] 점검 대상 관리

### 4. 파일 업로드 테스트
- [ ] 문서 업로드 API
- [ ] 업로드된 파일 다운로드
- [ ] uploads 디렉토리 권한 확인

### 5. 비즈니스 로직 테스트
- [ ] 점검 주기 계산 (월별, 분기별, 반기별, 연간)
- [ ] 점검 필요 여부 판단
- [ ] 대시보드 통계 조회

---

## 📊 상세 API 테스트 스크립트

### 로그인 및 토큰 획득
```bash
# 로그인
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "1111"}' \
  | jq -r '.accessToken')

echo "Token: $TOKEN"
```

### 인증된 API 호출
```bash
# 사용자 목록
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN" | jq

# 고객사 목록
curl -X GET http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN" | jq

# 고객사 생성
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerCode": "TEST001",
    "companyName": "테스트 회사",
    "mainContactName": "홍길동",
    "mainContactPhone": "010-1234-5678",
    "inspectionCycleType": "월별",
    "inspectionCycleMonth": 1
  }' | jq
```

### 대시보드 통계
```bash
# 전체 통계
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" | jq

# 이번 달 점검 대상
curl -X GET http://localhost:5000/api/dashboard/inspection-needed \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🔧 문제 해결

### 문제 1: 포트 충돌
```bash
# 현재 5000번 포트 사용 확인
lsof -i :5000

# 해결: .env.nestjs에서 BACKEND_PORT 변경
```

### 문제 2: DB 연결 실패
```bash
# DB 컨테이너 확인
docker ps | grep db

# DB 로그 확인
docker logs customer_db

# DB 접속 테스트
docker exec -it customer_db mysql -u customer_user -p customer_db
```

### 문제 3: Prisma 마이그레이션 오류
```bash
# Prisma 상태 확인
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma migrate status

# 스키마 동기화
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma db push
```

### 문제 4: 컨테이너 시작 실패
```bash
# 로그 확인
docker-compose -f docker-compose.nestjs.yml logs backend

# 완전 재시작
docker-compose -f docker-compose.nestjs.yml down -v
docker-compose --env-file .env.nestjs -f docker-compose.nestjs.yml up -d --build
```

---

## 🎓 추천 테스트 순서

1. **먼저 방법 1로 병렬 테스트** (안전)
   - 기존 환경 유지하며 NestJS 동작 확인
   - 포트 5002, DB customer_db_nestjs 사용

2. **성공 후 방법 2로 전환 테스트** (실전)
   - Flask 중지하고 NestJS로 교체
   - 기존 DB 데이터로 실제 동작 확인

3. **문제 없으면 프로덕션 배포 준비**
   - 프론트엔드 API 엔드포인트 변경 (`/api` 접두사 추가)
   - 환경 변수 프로덕션 설정
   - SSL/HTTPS 설정

---

## 📝 다음 단계

테스트가 성공적으로 완료되면:

1. **프론트엔드 수정**
   - 모든 API 호출에 `/api` 접두사 추가
   - JWT 토큰 저장/관리 방식 확인

2. **배포 준비**
   - `.env.nestjs` 프로덕션 설정
   - CORS 설정 실제 도메인으로 변경
   - 로그 레벨 조정

3. **모니터링 설정**
   - 로그 수집
   - 에러 추적
   - 성능 모니터링

---

**테스트 시작할 준비가 되셨나요? 어떤 방법으로 시작하시겠습니까?** 🚀
