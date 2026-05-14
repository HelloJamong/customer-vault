# Spec: 시스템 안정성 개선 (System Stability Hardening)

## Objective

Customer-Vault 프로덕션 시스템의 보안 취약점 및 안정성 문제를 단계별로 수정한다.
현재 운영 중인 시스템의 기존 기능을 손상시키지 않으면서, 데이터 유출·서비스 중단·성능 저하 위험을 제거하는 것이 목표다.

**사용자**: 내부 운영자 (데이터 보호 대상: 고객사 서버 접근 정보, 점검 문서)
**성공 기준**: P0~P2 모든 항목 수정 완료 + 기존 기능 회귀 없음

---

## 가정 (Assumptions)

1. 프로덕션 DB에 `ServerAccessInfo` 데이터가 이미 존재하므로, 암호화 마이그레이션 시 기존 평문 데이터 변환이 필요하다.
2. `ENCRYPTION_KEY`는 환경 변수로 주입되어야 하며, 기본값 없이 구동 실패가 올바른 동작이다.
3. Rate Limiting은 Nginx 또는 NestJS 레이어 중 하나에서 구현한다 (NestJS `@nestjs/throttler` 선택).
4. DB 인덱스 추가는 Prisma 마이그레이션으로 처리한다.
5. 동기 FS 작업 변경은 Node.js `fs/promises` API를 사용한다.

---

## Tech Stack

- **Backend**: NestJS 11.x, Prisma 5.x, MariaDB 10.11
- **Frontend**: React 19.x, Vite, Zustand, MUI, React Query
- **Infra**: Docker Compose, Nginx Alpine
- **암호화**: Node.js `crypto` (AES-256-CBC, 기존 방식 유지)
- **Rate Limiting**: `@nestjs/throttler`

---

## Commands

```bash
# 백엔드 빌드
cd backend && npm run build

# 백엔드 개발 실행
cd backend && npm run start:dev

# Prisma 마이그레이션 생성
cd backend && npx prisma migrate dev --name <migration-name>

# Prisma 마이그레이션 프로덕션 적용
cd backend && npx prisma migrate deploy

# 전체 Docker 빌드 및 실행
docker compose up -d --build

# 백엔드 테스트
cd backend && npm run test

# 프론트엔드 빌드
cd frontend && npm run build
```

---

## Project Structure (관련 파일)

```
backend/
├── src/
│   ├── main.ts                          # CORS 설정 수정
│   ├── app.module.ts                    # ThrottlerModule 추가
│   ├── auth/
│   │   ├── auth.module.ts               # ThrottlerGuard 적용
│   │   └── auth.controller.ts           # Rate limit 데코레이터
│   ├── backup/
│   │   └── backup.service.ts            # ENCRYPTION_KEY 필수 검증
│   ├── customers/
│   │   └── server-access-info.service.ts # 암호화/복호화 로직
│   ├── documents/
│   │   └── documents.service.ts         # 비동기 FS + 권한 검증
│   └── common/
│       └── crypto/
│           └── crypto.service.ts        # 공통 암호화 서비스 (신규)
├── prisma/
│   ├── schema.prisma                    # 인덱스 추가, 길이 확장
│   └── migrations/
│       ├── ..._add_indexes/             # DB 인덱스 마이그레이션
│       └── ..._encrypt_server_info/     # 암호화 마이그레이션
docker-compose.yml                       # 백업 볼륨 마운트 추가
```

---

## 개선 항목 상세

### Phase 1 — P0: 보안 긴급 수정

#### 1-A. CORS 설정 강화
**파일**: `backend/src/main.ts:21-30`
**현재 문제**: `callback(null, origin || '*')` — 모든 출처 허용
**수정 방향**:
```typescript
origin: process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : false,
```
- 프로덕션: `CORS_ORIGIN` 환경 변수로 허용 도메인 지정
- 개발: 명시적 `http://localhost:5173` 허용
- 미설정 시 `false` (모든 크로스 오리진 차단)

#### 1-B. ENCRYPTION_KEY 필수 검증
**파일**: `backend/src/backup/backup.service.ts:18`
**현재 문제**: `'0'.repeat(64)` 기본값으로 암호화 무의미
**수정 방향**:
```typescript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY 환경 변수가 유효하지 않습니다. 64자리 hex 문자열이 필요합니다.');
}
```
- 구동 시점에 검증하여 잘못된 설정으로 운영되는 상황 방지
- `.env.example`에 생성 명령어 추가

#### 1-C. Rate Limiting (로그인 엔드포인트)
**파일**: `backend/src/app.module.ts`, `backend/src/auth/auth.controller.ts`
**현재 문제**: 로그인 엔드포인트에 무제한 시도 가능
**수정 방향**:
- `@nestjs/throttler` 설치
- 로그인: 분당 10회 제한
- 전역: 분당 200회 제한 (DoS 방지)
- `ThrottlerExceptionFilter`로 사용자 친화적 에러 메시지

#### 1-D. ServerAccessInfo 암호화
**파일**: `backend/prisma/schema.prisma`, `backend/src/customers/`
**현재 문제**: `webPassword`, `serverSshPassword`, `serverRootPassword` 평문 DB 저장
**수정 방향**:
1. 공통 `CryptoService` 작성 (AES-256-CBC, ENCRYPTION_KEY 사용)
2. 기존 서비스에서 저장 시 암호화, 조회 시 복호화 적용
3. Prisma 마이그레이션으로 컬럼 길이 확장 (암호화 후 길이 증가: 100 → 255)
4. **프로덕션 데이터 마이그레이션 스크립트**: 기존 평문 데이터를 암호화로 일괄 변환

> ⚠️ 마이그레이션 전 DB 백업 필수

---

### Phase 2 — P1: 안정성 개선

#### 2-A. 문서 다운로드/삭제 권한 검증
**파일**: `backend/src/documents/documents.service.ts`
**수정 방향**:
- `remove(id, userId)`: userId가 있을 경우 해당 사용자의 접근 가능 고객사 소속 문서인지 검증
- 다운로드 엔드포인트: `isUserAssignedToCustomer()` 호출 명확화
- `super_admin`은 전체 접근, `admin/user`는 담당 고객사만 접근

#### 2-B. DB 인덱스 추가
**파일**: `backend/prisma/schema.prisma`
**현재 문제**: `@@index` 전혀 없음 → 데이터 증가 시 풀 스캔
**추가 인덱스**:
```prisma
model User {
  @@index([username])
  @@index([isActive])
}

model Customer {
  @@index([engineerId])
  @@index([salesId])
  @@index([contractEndDate])
  @@index([lastInspectionDate])
}

model Document {
  @@index([customerId])
  @@index([uploadedAt])
  @@index([inspectionDate])
}

model UserSession {
  @@index([userId, lastActivity])
}

model LoginAttempt {
  @@index([userId, attemptedAt])
}
```

#### 2-C. 비동기 FS 작업
**파일**: `backend/src/documents/documents.service.ts`
**현재 문제**: `fs.renameSync`, `fs.statSync`, `fs.existsSync` → 이벤트 루프 블로킹
**수정 방향**: `import { promises as fsp } from 'fs'`로 전환
```typescript
// Before
fs.renameSync(src, dest);
// After
await fsp.rename(src, dest);
```
- `existsSync` → `fsp.access(path).then(() => true).catch(() => false)`

---

### Phase 3 — P2: 운영 환경 개선

#### 3-A. 백업 볼륨 마운트
**파일**: `docker-compose.yml`
**현재 문제**: 백업 파일이 컨테이너 내부에만 저장 → 재시작 시 손실
**수정 방향**:
```yaml
backend:
  volumes:
    - ./backups:/app/backups    # 추가
    - ./uploads:/app/uploads    # 기존 유지
    - ./logs:/app/logs          # 기존 유지
```

#### 3-B. 민감 정보 콘솔 로깅 정리
**파일**: `backend/src/auth/auth.service.ts`
**현재 문제**: `console.log(`[로그인] 사용자 ${user.username}(ID: ${user.id}) 로그인 시도`)` 등
**수정 방향**:
- `console.log` → `this.logger.log()` (CustomLoggerService 사용)
- 사용자 ID만 로깅, username은 마스킹 또는 제거

#### 3-C. 환경 변수 시작 시 검증
**파일**: `backend/src/main.ts` 또는 신규 `config.validation.ts`
**수정 방향**: 앱 구동 시 필수 환경 변수 존재 여부 확인
```typescript
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DB_URL', 'CORS_ORIGIN'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`필수 환경 변수 ${key}가 설정되지 않았습니다.`);
  }
}
```

---

## Testing Strategy

| 항목 | 검증 방법 |
|------|----------|
| CORS 수정 | `curl -H "Origin: http://evil.com"` 로 거부 확인 |
| Rate Limiting | 11회 연속 로그인 시도 → 429 응답 확인 |
| ServerAccessInfo 암호화 | DB 직접 조회 시 평문 미노출 확인 |
| 마이그레이션 | 기존 데이터 복호화 정상 확인 |
| 문서 권한 | 비담당자 계정으로 다운로드 시도 → 403 확인 |
| DB 인덱스 | `EXPLAIN SELECT` 쿼리로 인덱스 사용 확인 |
| 비동기 FS | 대용량 파일 업로드 시 응답 지연 없음 |
| 백업 볼륨 | 컨테이너 재시작 후 백업 파일 보존 확인 |

---

## Boundaries

- **Always**: 각 Phase 시작 전 DB 백업 / 변경 후 기존 기능 회귀 테스트
- **Ask first**: 스키마 구조 변경 / 인증 플로우 변경 / 패키지 추가
- **Never**: 기존 API 응답 형식 변경 / 프로덕션 DB 직접 수정 (마이그레이션 스크립트로만) / 테스트 없이 배포

---

## 작업 태스크 목록

### Phase 1 (P0 — 보안 긴급)
- [ ] **Task 1-A**: CORS 설정 강화
  - Acceptance: `CORS_ORIGIN` 미설정 시 크로스 오리진 전면 차단
  - Verify: `curl -H "Origin: http://evil.com" http://localhost:5000/api/health` → CORS 헤더 없음
  - Files: `backend/src/main.ts`

- [ ] **Task 1-B**: ENCRYPTION_KEY 필수 검증
  - Acceptance: 환경 변수 미설정 시 앱 구동 실패 (명확한 에러 메시지)
  - Verify: `ENCRYPTION_KEY=""` 로 실행 시 `Error: ENCRYPTION_KEY 환경 변수...` 출력
  - Files: `backend/src/backup/backup.service.ts`, `.env.example`

- [ ] **Task 1-C**: Rate Limiting 적용
  - Acceptance: 로그인 11회 시도 시 429 응답
  - Verify: `for i in {1..12}; do curl -X POST .../auth/login ...; done` → 11번째부터 429
  - Files: `backend/src/app.module.ts`, `backend/src/auth/auth.controller.ts`, `package.json`

- [ ] **Task 1-D-1**: CryptoService 작성 (공통 암호화 모듈)
  - Acceptance: encrypt/decrypt 함수 단위 테스트 통과
  - Verify: `npm test -- crypto.service.spec`
  - Files: `backend/src/common/crypto/crypto.service.ts`

- [ ] **Task 1-D-2**: ServerAccessInfo 저장/조회 암호화 적용
  - Acceptance: DB에 저장된 비밀번호가 hex 암호문으로 저장됨
  - Verify: DB 직접 조회 후 평문 미노출 확인
  - Files: `backend/src/customers/server-access-info.service.ts` (또는 관련 서비스)

- [ ] **Task 1-D-3**: 스키마 컬럼 길이 확장 + 마이그레이션
  - Acceptance: `VarChar(100)` → `VarChar(255)`, 마이그레이션 정상 적용
  - Verify: `npx prisma migrate deploy` 성공
  - Files: `backend/prisma/schema.prisma`, `backend/prisma/migrations/`

- [ ] **Task 1-D-4**: 기존 평문 데이터 암호화 마이그레이션 스크립트
  - Acceptance: 기존 데이터 복호화 시 원래 값 반환
  - Verify: 스크립트 실행 후 API 통해 기존 서버 접근 정보 정상 조회
  - Files: `backend/prisma/seed-encrypt.ts` (일회성 스크립트)

### Phase 2 (P1 — 안정성)
- [ ] **Task 2-A**: 문서 권한 검증 강화
  - Acceptance: 비담당자 계정 문서 접근 시 403
  - Verify: `admin` 계정으로 타 담당자 고객 문서 요청 → 403
  - Files: `backend/src/documents/documents.service.ts`, `documents.controller.ts`

- [ ] **Task 2-B**: DB 인덱스 추가 마이그레이션
  - Acceptance: 주요 쿼리 `EXPLAIN` 시 `Using index` 확인
  - Verify: `npx prisma migrate deploy` + `EXPLAIN SELECT * FROM document WHERE customer_id=1`
  - Files: `backend/prisma/schema.prisma`, `backend/prisma/migrations/`

- [ ] **Task 2-C**: 비동기 FS 작업 전환
  - Acceptance: `documents.service.ts` 내 모든 `*Sync` 호출 제거
  - Verify: `grep -n "Sync" backend/src/documents/documents.service.ts` → 0건
  - Files: `backend/src/documents/documents.service.ts`

### Phase 3 (P2 — 운영)
- [ ] **Task 3-A**: 백업 볼륨 마운트 추가
  - Acceptance: 컨테이너 재시작 후 백업 파일 호스트에 보존
  - Verify: 백업 실행 → `docker compose restart backend` → `ls ./backups/`
  - Files: `docker-compose.yml`

- [ ] **Task 3-B**: 콘솔 로그 민감 정보 정리
  - Acceptance: `auth.service.ts` 내 `console.log` 전량 제거/마스킹
  - Verify: `grep -rn "console.log" backend/src/auth/` → 0건
  - Files: `backend/src/auth/auth.service.ts`

- [ ] **Task 3-C**: 앱 구동 시 환경 변수 검증
  - Acceptance: 필수 환경 변수 누락 시 명확한 에러로 구동 중단
  - Verify: `JWT_SECRET=""` 로 실행 → 에러 메시지 출력 후 프로세스 종료
  - Files: `backend/src/main.ts`

---

## 프로덕션 배포 순서

1. DB 백업 (`mysqldump`)
2. Phase 1 배포 (CORS, Rate Limit, ENCRYPTION_KEY 검증)
3. ServerAccessInfo 암호화 마이그레이션 스크립트 실행
4. Phase 2 배포 (인덱스 마이그레이션 포함)
5. Phase 3 배포
6. 전체 기능 스모크 테스트

---

## Open Questions

1. **ServerAccessInfo 복호화 키 분실 대비책**: 암호화 전 DB 스냅샷을 별도 보관해야 하는가?
2. **Rate Limiting 임계값**: 로그인 10회/분이 적절한가? (지역 사무소 등 여러 사람이 같은 IP 사용 가능)
3. **CORS_ORIGIN 미설정 시 개발 동작**: 개발 환경에서 `NODE_ENV=development`이면 자동 허용할 것인가?
