# DB 마이그레이션 및 배포 가이드

이 문서는 Customer Vault의 DB 스키마 변경, 오프라인 배포, 그리고 자동화된 마이그레이션 프로세스에 대해 설명합니다.

## 목차

1. [개요](#개요)
2. [개발 환경: DB 스키마 변경](#개발-환경-db-스키마-변경)
3. [운영 환경: 오프라인 배포](#운영-환경-오프라인-배포)
4. [스크립트 상세 설명](#스크립트-상세-설명)
5. [트러블슈팅](#트러블슈팅)
6. [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

### Prisma Migrate란?

Prisma Migrate는 데이터베이스 스키마 변경을 안전하게 관리하는 도구입니다:

- **버전 관리**: 모든 스키마 변경 이력을 추적
- **데이터 보존**: 기존 데이터를 유지하면서 스키마만 변경
- **자동 SQL 생성**: Prisma 스키마에서 SQL 마이그레이션 자동 생성
- **롤백 지원**: 백업을 통한 안전한 롤백

### 마이그레이션 프로세스

```
개발 환경 (온라인)                   운영 환경 (오프라인)
┌─────────────────┐                 ┌─────────────────┐
│ 1. 스키마 수정   │                 │ 1. 패키지 로드   │
│ 2. 마이그레이션  │  ──패키지──>    │ 2. 자동 DB 백업  │
│    생성          │                 │ 3. 마이그레이션  │
│ 3. Git 커밋     │                 │    자동 적용     │
└─────────────────┘                 └─────────────────┘
```

---

## 개발 환경: DB 스키마 변경

### 1단계: Prisma 스키마 수정

`backend/prisma/schema.prisma` 파일을 수정합니다.

#### 예시 1: 테이블에 컬럼 추가

```prisma
model User {
  id              Int      @id @default(autoincrement())
  username        String   @unique @db.VarChar(50)
  name            String   @db.VarChar(100)
  department      String?  @db.VarChar(100)  // 새로 추가 ✨
  passwordHash    String   @db.VarChar(255)
  role            UserRole @default(USER)
  isActive        Boolean  @default(true)
  isFirstLogin    Boolean  @default(true)
  // ... 기타 필드
}
```

#### 예시 2: 새 테이블 추가

```prisma
model Department {
  id          Int      @id @default(autoincrement())
  name        String   @unique @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("departments")
}
```

#### 예시 3: 관계 설정

```prisma
model User {
  id           Int         @id @default(autoincrement())
  username     String      @unique
  departmentId Int?        // 외래 키
  department   Department? @relation(fields: [departmentId], references: [id])
  // ... 기타 필드
}

model Department {
  id    Int    @id @default(autoincrement())
  name  String @unique
  users User[] // 역참조
}
```

### 2단계: 마이그레이션 생성

자동화 스크립트를 사용하여 마이그레이션을 생성합니다.

```bash
# 프로젝트 루트에서 실행
cd /home/dev/project/customer-vault

# 마이그레이션 생성
./scripts/create-migration.sh "add_user_department"
```

#### 스크립트 실행 과정

1. 서비스 실행 확인 (필요시 자동 시작)
2. Prisma 스키마 변경 사항 확인
3. 사용자 확인 후 마이그레이션 생성
4. 생성된 SQL 미리보기
5. Git 커밋 안내

#### 출력 예시

```
[INFO] ==========================================
[INFO] Prisma 마이그레이션 생성
[INFO] ==========================================
[INFO] 마이그레이션 이름: add_user_department
[INFO] Prisma 스키마: backend/prisma/schema.prisma
[INFO] Prisma 스키마 변경 사항 확인 중...

Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "customer_db"

Status: 1 pending migration

⚠️  주의사항:
  1. backend/prisma/schema.prisma 파일을 수정했는지 확인하세요
  2. 마이그레이션은 개발 DB에 즉시 적용됩니다
  3. 생성된 마이그레이션 파일은 Git에 커밋해야 합니다

마이그레이션을 생성하시겠습니까? (y/N): y
[INFO] 마이그레이션 생성 중...
[SUCCESS] 마이그레이션 생성 완료!
[INFO] 생성된 마이그레이션: 20260105070245_add_user_department

[INFO] 마이그레이션 SQL:
----------------------------------------
-- AlterTable
ALTER TABLE `users` ADD COLUMN `department` VARCHAR(100) NULL;
----------------------------------------
```

### 3단계: 마이그레이션 확인

생성된 마이그레이션 파일을 확인합니다.

```bash
# 마이그레이션 디렉토리 확인
ls -la backend/prisma/migrations/

# 출력 예시:
# drwxr-xr-x 2 dev dev 4096 Jan  5 07:02 20260105070245_add_user_department/

# SQL 파일 내용 확인
cat backend/prisma/migrations/20260105070245_add_user_department/migration.sql
```

### 4단계: Git 커밋

마이그레이션 파일을 버전 관리에 추가합니다.

```bash
# 마이그레이션 파일 추가
git add backend/prisma/migrations/

# 커밋
git commit -m "feat: add user department column"

# 푸시
git push origin main

# 태그 (배포 버전)
git tag -a v2.1.2 -m "Release version 2.1.2 - Add user department"
git push origin v2.1.2
```

---

## 운영 환경: 오프라인 배포

### 전체 프로세스 개요

```
┌─────────────────────────────────────────────────────────────┐
│ 온라인 환경 (개발 서버)                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. ./scripts/export-package.sh 2.1.2                        │
│    → Docker 이미지 빌드                                       │
│    → 마이그레이션 파일 포함                                   │
│    → 패키지 생성: customer_vault_2.1.2_package.tar.gz       │
│                                                              │
│ 2. USB/네트워크로 오프라인 서버에 복사                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 오프라인 환경 (운영 서버)                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. tar -xzf customer_vault_2.1.2_package.tar.gz            │
│ 2. cd customer_vault_2.1.2_package                          │
│ 3. cp /existing/path/.env .  (기존 .env 복사)               │
│ 4. ./import-package.sh                                      │
│    → 이미지 로드                                             │
│    → 자동 DB 백업                                            │
│    → 자동 마이그레이션 적용                                   │
│    → 서비스 시작                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1단계: 배포 패키지 생성 (온라인 환경)

```bash
cd /home/dev/project/customer-vault

# 패키지 생성
./scripts/export-package.sh 2.1.2
```

#### 스크립트 동작

1. **Docker 이미지 빌드**
   - Backend: `customer_backend:2.1.2`
   - Frontend: `customer_frontend:2.1.2`

2. **이미지 저장**
   - `images.tar` (backend, frontend, nginx, mariadb)

3. **설정 파일 복사**
   - `docker-compose.yml` (버전 자동 업데이트)
   - `proxy/nginx.conf`
   - `README.md`

4. **마이그레이션 포함** (있는 경우)
   - `prisma/migrations/` (모든 마이그레이션)
   - `prisma/schema.prisma`
   - `MIGRATIONS.md` (마이그레이션 가이드 자동 생성)

5. **패키지 압축**
   - `customer_vault_2.1.2_package.tar.gz`

#### 출력 예시

```
[INFO] ==========================================
[INFO] 1단계: Docker 이미지 빌드 시작
[INFO] ==========================================
[INFO] Backend 이미지 빌드 중...
[SUCCESS] Backend 이미지 빌드 완료
[INFO] Frontend 이미지 빌드 중...
[SUCCESS] Frontend 이미지 빌드 완료

[INFO] ==========================================
[INFO] 2단계: Docker 이미지 저장
[INFO] ==========================================
[INFO] 이미지를 tar 파일로 저장 중...
[SUCCESS] 이미지 저장 완료: 1.2G

[INFO] ==========================================
[INFO] 3단계: 설정 파일 복사
[INFO] ==========================================
[INFO] docker-compose.yml 복사 및 버전 업데이트...
[INFO] 설정 파일 복사 중...
[INFO] Prisma 마이그레이션 파일 복사...
[SUCCESS] Prisma 마이그레이션 2개 복사 완료
[INFO] 마이그레이션 요약 생성 중...
[SUCCESS] 마이그레이션 가이드 생성 완료

[INFO] ==========================================
[SUCCESS] 배포 패키지 생성 완료!
[INFO] ==========================================

[INFO] 패키지 파일: /home/dev/project/customer-vault/customer_vault_2.1.2_package.tar.gz
[INFO] 패키지 크기: 1.2G
```

### 2단계: 패키지 전송

#### USB 사용

```bash
# USB 마운트
sudo mount /dev/sdb1 /media/usb

# 패키지 복사
cp customer_vault_2.1.2_package.tar.gz /media/usb/

# 언마운트
sudo umount /media/usb
```

#### 네트워크 사용 (일시적 연결)

```bash
# SCP
scp customer_vault_2.1.2_package.tar.gz user@offline-server:/tmp/

# 또는 rsync
rsync -avz --progress customer_vault_2.1.2_package.tar.gz user@offline-server:/tmp/
```

### 3단계: 오프라인 서버에서 배포

#### 시나리오 A: 기존 운영 환경이 있는 경우 (권장)

기존에 운영 중인 `customer-vault` 폴더가 있는 경우:

```bash
# 현재 디렉토리 구조:
# /path/to/
# ├── customer-vault/              # 기존 운영 중인 서비스
# └── customer_vault_2.1.2_package.tar.gz

# 1. 패키지 압축 해제 (같은 레벨에)
tar -xzf customer_vault_2.1.2_package.tar.gz

# 디렉토리 구조:
# /path/to/
# ├── customer-vault/              # 기존 서비스 (계속 실행 중)
# └── customer_vault_2.1.2_package/  # 새 패키지

# 2. 기존 .env 파일 복사
cp customer-vault/.env customer_vault_2.1.2_package/

# 3. 기존 데이터 디렉토리 복사 (중요!)
# DB 데이터, 업로드 파일, 로그를 새 패키지로 이동
cp -r customer-vault/data customer_vault_2.1.2_package/
cp -r customer-vault/uploads customer_vault_2.1.2_package/
cp -r customer-vault/logs customer_vault_2.1.2_package/

# 4. 기존 컨테이너 완전히 제거 (중요!)
# 중지만 하면 컨테이너가 남아있어 이름 충돌 발생
cd customer-vault
docker compose down
cd ..

# 5. 새 패키지 디렉토리로 이동
cd customer_vault_2.1.2_package

# 6. 배포 스크립트 실행
./import-package.sh

# 스크립트가 자동으로:
# - 기존 customer-vault의 컨테이너 중지
# - 새 이미지로 교체
# - DB 마이그레이션 적용
# - 서비스 재시작
```

**주의사항**:
- **반드시 기존 데이터를 복사해야 합니다**:
  - `data/mariadb/` - DB 데이터 파일
  - `uploads/` - 업로드된 문서 파일
  - `logs/` - 애플리케이션 로그
- **기존 컨테이너를 완전히 제거**해야 합니다 (`docker compose down`)
  - `docker compose stop`만 하면 컨테이너가 남아있어 이름 충돌 발생
  - `docker compose down`으로 컨테이너와 네트워크까지 제거
- 배포 완료 후 `customer_vault_2.1.2_package/`가 새로운 운영 디렉토리가 됩니다

#### 시나리오 B: 신규 설치

처음 설치하는 경우:

```bash
# 패키지 압축 해제
tar -xzf customer_vault_2.1.2_package.tar.gz
cd customer_vault_2.1.2_package

# .env 파일 생성 (새로 작성)
cp .env.example .env
vi .env  # 환경에 맞게 수정

# 자동 배포 실행
./import-package.sh
```

#### 스크립트 동작 (자동화)

1. **필수 파일 확인**
   - `images.tar`, `docker-compose.yml`, `DEPLOYMENT_GUIDE.md`

2. **Docker 확인**
   - Docker 및 Docker Compose 설치 확인

3. **기존 서비스 확인**
   - 실행 중인 서비스 감지 (`customer_backend`, `customer_frontend` 등)
   - 기존 서비스 자동 중지 (사용자 확인 후)
   - **중요**: 컨테이너 이름이 같아서 자동으로 교체됨

4. **이미지 로드**
   - `images.tar`에서 Docker 이미지 추출

5. **.env 확인**
   - 없으면 에러 (기존 환경에서 복사 필요)

6. **디렉토리 준비**
   - `data/`, `uploads/`, `logs/` 생성
   - **기존 data/ 디렉토리는 유지** (DB 데이터 보존)

7. **서비스 시작**
   - `docker compose up -d`

8. **마이그레이션 자동 처리** ⭐
   - 마이그레이션 감지
   - `.env`에서 DB 정보 자동 읽기
   - **자동 DB 백업**
   - **자동 마이그레이션 적용**
   - 실패 시 자동 롤백 옵션

9. **완료 메시지**
   - 접속 정보 및 유용한 명령어 안내

#### 출력 예시

```
[INFO] ==========================================
[INFO] Customer Vault 오프라인 배포 시작
[INFO] ==========================================

[INFO] 1단계: 필수 파일 확인
[SUCCESS] 필수 파일 확인 완료

[INFO] 2단계: Docker 확인
[SUCCESS] Docker 확인 완료 (Docker version 24.0.7, build afdd53b)

[INFO] 3단계: 기존 서비스 확인
[INFO] 기존 서비스가 실행 중입니다.
기존 서비스를 중지하시겠습니까? (y/N): y
[INFO] 서비스 중지 중...
[SUCCESS] 서비스 중지 완료

[INFO] 4단계: Docker 이미지 로드
[INFO] 이미지 로드 중... (시간이 걸릴 수 있습니다)
[SUCCESS] 이미지 로드 완료
[INFO] 로드된 이미지:
customer_backend    2.1.2    abc123def456   500MB
customer_frontend   2.1.2    def456ghi789   200MB

[INFO] 5단계: 환경 설정 확인
[SUCCESS] .env 파일 확인 완료
[INFO] 기존 환경 설정을 사용합니다.

[INFO] 6단계: 디렉토리 준비
[SUCCESS] 디렉토리 준비 완료

[INFO] 7단계: 서비스 시작
[INFO] Docker Compose로 서비스 시작 중...
[INFO] 서비스 시작 대기 중... (30초)

[INFO] 8단계: 서비스 상태 확인
NAME               IMAGE                  STATUS
customer_db        mariadb:10.11          Up 30 seconds
customer_backend   customer_backend:2.1.2 Up 25 seconds
customer_frontend  customer_frontend:2.1.2 Up 25 seconds
customer_proxy     nginx:alpine           Up 20 seconds

[INFO] 9단계: DB 마이그레이션 확인
[WARN] DB 스키마 변경이 감지되었습니다! (마이그레이션 2개)
[INFO] 마이그레이션 상세 정보:
----------------------------------------
- 20260105070245_add_user_department
  ```sql
  ALTER TABLE `users` ADD COLUMN `department` VARCHAR(100) NULL;
  ```
----------------------------------------

[INFO] .env 파일에서 DB 접속 정보 읽는 중...
[SUCCESS] DB 접속 정보 확인 완료 (DB: customer_db)
[INFO] ⚠️  마이그레이션 적용 전 자동 DB 백업 시작...
[INFO] 백업 파일: backup_before_migration_20260105_143025.sql
[SUCCESS] ✓ DB 백업 완료: backup_before_migration_20260105_143025.sql (2.3M)

[INFO] 마이그레이션 상태 확인 중...
Datasource "db": MySQL database "customer_db"
Status: 2 pending migrations
Your database is 2 migrations behind.

[INFO] 마이그레이션 자동 적용 시작...
[WARN] ⚠️  운영 DB 스키마가 변경됩니다! (데이터는 유지됨)
Applying migration `20260105070245_add_user_department`
Applying migration `20260105071530_add_department_table`

[SUCCESS] ✓ DB 마이그레이션 완료!

[INFO] 마이그레이션 후 상태:
Database schema is up to date!

[INFO] ==========================================
[SUCCESS] 배포 완료!
[INFO] ==========================================

[INFO] 서비스 접속 정보:
  - URL: http://192.168.10.120:2082
  - 초기 계정: admin / 1111

[INFO] 유용한 명령어:
  - 서비스 상태: docker compose ps
  - 로그 확인: docker compose logs -f backend frontend
  - 서비스 중지: docker compose stop
  - 서비스 재시작: docker compose restart

[INFO] DB 관련 명령어:
  - 마이그레이션 상태: docker compose exec backend npx prisma migrate status
  - DB 백업: docker exec customer_db mysqldump -u root -p<PASSWORD> customer_db > backup.sql
```

---

## 스크립트 상세 설명

### create-migration.sh

**경로**: `scripts/create-migration.sh`

**용도**: 개발 환경에서 Prisma 마이그레이션 생성

**사용법**:
```bash
./scripts/create-migration.sh "마이그레이션_이름"
```

**주요 기능**:
- Backend 서비스 실행 확인
- Prisma 스키마 변경 감지
- 마이그레이션 생성 (`prisma migrate dev`)
- 생성된 SQL 미리보기
- Git 커밋 가이드 제공

**예시**:
```bash
./scripts/create-migration.sh "add_user_department"
./scripts/create-migration.sh "create_department_table"
./scripts/create-migration.sh "update_user_indexes"
```

---

### export-package.sh

**경로**: `scripts/export-package.sh`

**용도**: 온라인 환경에서 배포 패키지 생성

**사용법**:
```bash
./scripts/export-package.sh [버전]
```

**주요 기능**:
1. Docker 이미지 빌드 (backend, frontend)
2. 이미지를 tar 파일로 저장
3. 설정 파일 복사 및 버전 업데이트
4. Prisma 마이그레이션 포함
5. MIGRATIONS.md 자동 생성
6. 패키지 압축

**생성되는 파일**:
- `customer_vault_<버전>_package.tar.gz`

**패키지 내용**:
```
customer_vault_2.1.2_package/
├── images.tar                 # Docker 이미지
├── docker-compose.yml         # 버전이 업데이트된 설정
├── proxy/                     # Nginx 설정
├── prisma/                    # 마이그레이션 (있는 경우)
│   ├── migrations/
│   └── schema.prisma
├── MIGRATIONS.md              # 마이그레이션 가이드
├── DEPLOYMENT_GUIDE.md        # 배포 가이드
└── import-package.sh          # 설치 스크립트
```

**예시**:
```bash
# 버전 지정
./scripts/export-package.sh 2.1.2

# 기본 버전 (2.1.2)
./scripts/export-package.sh
```

---

### import-package.sh

**경로**: `scripts/import-package.sh` (패키지 내부)

**용도**: 오프라인 환경에서 패키지 설치 및 마이그레이션

**사용법**:
```bash
# 패키지 압축 해제 후
cd customer_vault_2.1.2_package
./import-package.sh
```

**주요 기능** (자동화):
1. 필수 파일 확인
2. Docker 설치 확인
3. 기존 서비스 확인 및 중지
4. Docker 이미지 로드
5. .env 파일 확인
6. 디렉토리 생성
7. 서비스 시작
8. **DB 마이그레이션 자동 처리**:
   - `.env`에서 DB 정보 읽기
   - 자동 DB 백업
   - 마이그레이션 자동 적용
   - 실패 시 자동 롤백 옵션

**필요 조건**:
- `.env` 파일 (기존 환경에서 복사)
- Docker 및 Docker Compose 설치

**환경 변수** (.env):
```env
DB_ROOT_PASSWORD=rootpassword  # 필수: DB 백업/마이그레이션에 사용
DB_NAME=customer_db            # 기본값: customer_db
DB_USER=customer_user          # 기본값: customer_user
```

---

## 트러블슈팅

### 마이그레이션 실패

#### 문제: 마이그레이션 적용 중 오류

**증상**:
```
[ERROR] ✗ 마이그레이션 실패!
Error: Migration failed to apply
```

**해결 방법**:

1. **즉시 롤백**:
```bash
# 자동 롤백 옵션 사용
지금 자동으로 롤백하시겠습니까? (y/N): y

# 또는 수동 롤백
docker compose stop backend
docker exec -i customer_db mysql -u root -p"<PASSWORD>" customer_db < backup_before_migration_YYYYMMDD_HHMMSS.sql
docker compose up -d
```

2. **로그 확인**:
```bash
docker compose logs backend
```

3. **마이그레이션 상태 확인**:
```bash
docker compose exec backend npx prisma migrate status
```

---

### DB 백업 실패

#### 문제: DB 백업 중 오류

**증상**:
```
[ERROR] ✗ DB 백업 실패!
mysqldump: Got error: 1045: Access denied
```

**원인**:
- `.env`의 `DB_ROOT_PASSWORD`가 잘못됨
- DB 컨테이너가 실행 중이 아님

**해결 방법**:

1. **.env 파일 확인**:
```bash
cat .env | grep DB_ROOT_PASSWORD
```

2. **DB 컨테이너 확인**:
```bash
docker ps | grep customer_db

# 실행 중이 아니면
docker compose up -d db
sleep 30
```

3. **수동 백업 시도**:
```bash
docker exec customer_db mysqldump -u root -p customer_db > manual_backup.sql
# 비밀번호 입력
```

---

### 이미지 로드 실패

#### 문제: Docker 이미지 로드 오류

**증상**:
```
Error: Error response from daemon: load metadata...
```

**원인**:
- `images.tar` 파일 손상
- 디스크 공간 부족

**해결 방법**:

1. **파일 무결성 확인**:
```bash
# 원본과 복사본 크기 비교
ls -lh images.tar

# 파일 검사
file images.tar
```

2. **디스크 공간 확인**:
```bash
df -h

# 불필요한 이미지 정리
docker image prune -a
```

3. **재다운로드/재복사**

---

### 서비스 시작 실패

#### 문제: 서비스가 시작되지 않음

**증상**:
```
customer_backend exited with code 1
```

**해결 방법**:

1. **로그 확인**:
```bash
docker compose logs backend
docker compose logs frontend
```

2. **포트 충돌 확인**:
```bash
sudo netstat -tulpn | grep :2082
sudo netstat -tulpn | grep :5005

# .env에서 포트 변경
vi .env
```

3. **환경 변수 확인**:
```bash
cat .env

# 필수 항목 확인
# - DB_ROOT_PASSWORD
# - JWT_SECRET
# - CORS_ORIGIN
```

---

### 컨테이너 이름 충돌

#### 문제: 컨테이너 이름 중복 오류

**증상**:
```
Error response from daemon: Conflict. The container name "/customer_db" is already in use
```

**원인**:
- 기존 `customer-vault` 디렉토리의 컨테이너가 중지만 되고 제거되지 않음
- `docker compose stop`은 컨테이너를 중지만 하고 제거하지 않음

**해결 방법**:

1. **기존 컨테이너 완전히 제거**:
```bash
# 기존 디렉토리로 이동
cd /path/to/customer-vault

# 컨테이너와 네트워크 제거
docker compose down

# 확인
docker ps -a | grep customer
```

2. **또는 직접 제거**:
```bash
# 특정 컨테이너만 제거
docker rm -f customer_db customer_backend customer_frontend customer_proxy

# 모든 중지된 컨테이너 제거
docker container prune
```

3. **새 패키지 재시도**:
```bash
cd /path/to/customer_vault_2.1.2_package
./import-package.sh
```

**예방**:
배포 전 항상 기존 컨테이너를 `docker compose down`으로 완전히 제거하세요.

---

### 포트 충돌 (DB 포트 이미 사용 중)

#### 문제: DB 포트가 이미 할당됨

**증상**:
```
Error response from daemon: driver failed programming external connectivity on endpoint customer_db: 
Bind for 0.0.0.0:3306 failed: port is already allocated
```

**원인**:
- 다른 DB 서비스가 이미 3306 포트를 사용 중
- 예: 기존 MariaDB, MySQL, Oracle 등

**해결 방법 1: 포트 변경 (권장)**

1. **사용 중인 포트 확인**:
```bash
docker ps | grep 3306
# 또는
sudo netstat -tulpn | grep 3306
```

출력 예시:
```bash
maria-10.11   Up 5 weeks   0.0.0.0:3306->3306/tcp
```

2. **.env 파일에서 DB 포트 변경**:
```bash
vi .env

# 다음 라인 수정 (또는 추가)
DB_PORT=3307  # 3306 → 3307로 변경
```

3. **서비스 재시작**:
```bash
docker compose up -d
```

4. **접속 정보 변경**:
이제 DB에 접속할 때 3307 포트 사용:
```bash
mysql -h localhost -P 3307 -u customer_user -p
```

**해결 방법 2: 기존 DB 서비스 중지 (주의)**

기존 DB를 사용하지 않는 경우:
```bash
# 기존 DB 컨테이너 중지
docker stop maria-10.11

# 또는 제거 (주의: 데이터 손실 가능)
docker rm -f maria-10.11

# Customer Vault 재시작
docker compose up -d
```

**주의**: 기존 DB를 사용 중이라면 포트 변경 방법을 사용하세요!

**docker-compose.yml에서 포트 매핑 확인**:
```yaml
db:
  image: mariadb:10.11
  ports:
    - "${DB_PORT:-3306}:3306"  # .env의 DB_PORT 사용
```

---

## 실전 예시

### 기존 운영 환경 업데이트 (실제 시나리오)

```bash
# 현재 상황:
# - /opt/customer-vault/ 에서 v2.1.1 운영 중
# - v2.1.2 패키지를 USB로 받음

# 1. 운영 디렉토리로 이동
cd /opt

# 현재 구조:
# /opt/
# ├── customer-vault/              # 실행 중
# └── customer_vault_2.1.2_package.tar.gz

# 2. 새 패키지 압축 해제
tar -xzf customer_vault_2.1.2_package.tar.gz

# 결과:
# /opt/
# ├── customer-vault/              # 기존 (계속 실행 중)
# └── customer_vault_2.1.2_package/  # 새 패키지

# 3. 기존 데이터 복사 (DB, 업로드 파일, 로그)
echo "기존 데이터 복사 중..."
cp -r customer-vault/data customer_vault_2.1.2_package/
cp -r customer-vault/uploads customer_vault_2.1.2_package/
cp -r customer-vault/logs customer_vault_2.1.2_package/
echo "데이터 복사 완료"

# 5. 새 패키지로 이동
cd customer_vault_2.1.2_package

# 6. 새 패키지로 이동
cd customer_vault_2.1.2_package

# 5. 배포 실행
./import-package.sh

# 출력:
# [INFO] 3단계: 기존 서비스 확인
# [WARN] 기존 서비스가 실행 중입니다.
# 기존 서비스를 중지하시겠습니까? (y/N): y
# [INFO] 서비스 중지 중...
# [SUCCESS] 서비스 중지 완료
# 
# [INFO] 9단계: DB 마이그레이션 확인
# [WARN] DB 스키마 변경이 감지되었습니다!
# [INFO] ⚠️  마이그레이션 적용 전 자동 DB 백업 시작...
# [SUCCESS] ✓ DB 백업 완료: backup_before_migration_20260105_143025.sql (2.3M)
# [SUCCESS] ✓ DB 마이그레이션 완료!
# 
# [SUCCESS] 배포 완료!

# 6. 확인
docker compose ps
# NAME               STATUS
# customer_backend   Up (새 버전 2.1.2)
# customer_frontend  Up (새 버전 2.1.2)
# customer_db        Up (데이터 유지)

# 7. 정리 (선택사항)
# 새 버전이 안정적으로 동작하면 기존 디렉토리 백업 후 삭제
cd /opt
mv customer-vault customer-vault.backup.2.1.1
mv customer_vault_2.1.2_package customer-vault

# 최종 구조:
# /opt/데이터는 복사하여 유지됩니다!

```bash
# 중요: 데이터는 컨테이너가 아닌 호스트의 디렉토리에 저장됩니다
# docker-compose.yml 설정:
volumes:
  - ./data/mariadb:/var/lib/mysql    # DB 데이터
  - ./uploads:/app/uploads            # 업로드 파일
  - ./logs:/app/logs                  # 로그 파일

# 배포 프로세스:
# 1. 기존 customer-vault/data/mariadb/ 에 실제 DB 데이터가 있음
# 2. cp -r customer-vault/data customer_vault_2.1.2_package/
#    → 모든 DB 데이터를 새 디렉토리로 복사
# 3. cp -r customer-vault/uploads customer_vault_2.1.2_package/
#    → 업로드된 모든 파일 복사
# 4. cp -r customer-vault/logs customer_vault_2.1.2_package/
#    → 기존 로그 복사
# 5. 새 컨테이너가 복사된 데이터를 마운트
# 6. 마이그레이션으로 스키마만 업데이트
# 7. 모든 데이터 보존 완료!

# 주의: cp 대신 mv를 사용하면 원본이 삭제됩니다
# 안전을 위해 cp로 복사 후, 배포 성공 확인 후 원본 삭제 권장
```

### 데이터 복사 vs 이동

**복사 (권장)**:
```bash
# 안전: 원본 유지
cp -r customer-vault/data customer_vault_2.1.2_package/
cp -r customer-vault/uploads customer_vault_2.1.2_package/
cp -r customer-vault/logs customer_vault_2.1.2_package/

# 장점: 문제 발생 시 기존 데이터로 즉시 롤백 가능
# 단점: 디스크 공간 2배 필요 (일시적)
```

**이동 (디스크 공간 부족 시)**:
```bash
# 주의: 원본 삭제됨
mv customer-vault/data customer_vault_2.1.2_package/
mv customer-vault/uploads customer_vault_2.1.2_package/
mv customer-vault/logs customer_vault_2.1.2_package/

# 장점: 디스크 공간 절약
# 단점: 문제 발생 시 복구 어려움
# 권장: 반드시 DB 백업 후 진행
```

### 디스크 공간 확인

```bash
# 현재 데이터 크기 확인
du -sh customer-vault/data
du -sh customer-vault/uploads
du -sh customer-vault/logs

# 사용 가능한 디스크 공간 확인
df -h .

# 예시 출력:
# customer-vault/data: 2.5G
# customer-vault/uploads: 500M
# customer-vault/logs: 100M
# 사용 가능: 10G → 복사 가능
# 기존 customer-vault/data/mariadb/ 에 실제 DB 데이터 파일이 있음
# 새 패키지를 실행해도:
# 1. 기존 DB 컨테이너는 중지되지만
# 2. 호스트의 data/ 디렉토리는 그대로 유지
# 3. 새 DB 컨테이너가 같은 데이터를 마운트
# 4. 마이그레이션으로 스키마만 업데이트
# 5. 모든 데이터는 보존됨!
```

### 롤백이 필요한 경우

```bash
# 배포 후 문제가 발생한 경우
cd /opt/customer_vault_2.1.2_package

# 1. 현재 서비스 중지
docker compose stop backend frontend

# 2. DB 복원
docker exec -i customer_db mysql -u root -p"PASSWORD" customer_db < backup_before_migration_20260105_143025.sql

# 3. 이전 버전 디렉토리로 이동
cd /opt/customer-vault.backup.2.1.1

# 4. 이전 버전 재시작
docker compose up -d

# 완료! 이전 버전으로 롤백됨
```

---

## 

## 베스트 프랙티스

### 개발 환경

#### 1. 마이그레이션 네이밍

**좋은 예**:
```bash
./scripts/create-migration.sh "add_user_department"
./scripts/create-migration.sh "create_department_table"
./scripts/create-migration.sh "add_user_department_fk"
./scripts/create-migration.sh "remove_deprecated_fields"
```

**나쁜 예**:
```bash
./scripts/create-migration.sh "update"
./scripts/create-migration.sh "fix"
./scripts/create-migration.sh "test"
```

#### 2. 마이그레이션 크기

- **작은 단위로 분리**: 하나의 마이그레이션은 하나의 논리적 변경만
- **복잡한 변경은 단계별로**: 여러 개의 작은 마이그레이션으로 분리

**예시**:
```bash
# 좋음: 단계별 마이그레이션
./scripts/create-migration.sh "add_department_table"
./scripts/create-migration.sh "add_user_department_fk"

# 나쁨: 한 번에 모든 것
./scripts/create-migration.sh "major_refactoring"
```

#### 3. 테스트

개발 환경에서 충분히 테스트:
```bash
# 마이그레이션 생성
./scripts/create-migration.sh "add_feature"

# 애플리케이션 테스트
docker compose logs -f backend

# 롤백 테스트 (개발 DB)
docker compose exec backend npx prisma migrate reset
```

---

### 운영 환경

#### 1. 항상 백업

마이그레이션 전 **반드시** 백업 (자동으로 수행됨):
```bash
# import-package.sh가 자동으로 수행
# backup_before_migration_YYYYMMDD_HHMMSS.sql
```

추가 수동 백업:
```bash
docker exec customer_db mysqldump -u root -p customer_db > manual_backup_$(date +%Y%m%d).sql
```

#### 2. 점진적 배포

대규모 변경은 단계적으로:

1. **1단계**: 호환 가능한 변경 (컬럼 추가 등)
2. **2단계**: 데이터 마이그레이션
3. **3단계**: 구조적 변경 (컬럼 삭제 등)

#### 3. 모니터링

배포 후 모니터링:
```bash
# 서비스 상태
docker compose ps

# 로그 실시간 확인
docker compose logs -f backend frontend

# DB 연결 확인
docker compose exec backend npx prisma db pull
```

#### 4. 롤백 계획

항상 롤백 계획 준비:
```bash
# 1. 이전 버전 이미지 보관
docker save -o previous_version.tar customer_backend:2.1.1 customer_frontend:2.1.1

# 2. DB 백업 보관
cp backup_before_migration_*.sql /safe/location/

# 3. 롤백 스크립트 준비
cat > rollback.sh << 'EOF'
#!/bin/bash
docker compose stop backend frontend
docker load -i previous_version.tar
docker exec -i customer_db mysql -u root -p"<PASSWORD>" customer_db < backup.sql
# docker-compose.yml 버전 변경 필요
docker compose up -d
EOF
chmod +x rollback.sh
```

---

## 부록

### Prisma Migrate 명령어

개발 환경:
```bash
# 마이그레이션 생성 및 적용
docker compose exec backend npx prisma migrate dev --name "migration_name"

# 마이그레이션 리셋 (주의!)
docker compose exec backend npx prisma migrate reset
```

운영 환경:
```bash
# 마이그레이션 상태 확인
docker compose exec backend npx prisma migrate status

# 마이그레이션 적용
docker compose exec backend npx prisma migrate deploy

# Prisma Client 재생성
docker compose exec backend npx prisma generate
```

### DB 관리 명령어

백업:
```bash
# 전체 DB
docker exec customer_db mysqldump -u root -p customer_db > backup.sql

# 특정 테이블
docker exec customer_db mysqldump -u root -p customer_db users customers > tables_backup.sql

# 압축 백업
docker exec customer_db mysqldump -u root -p customer_db | gzip > backup.sql.gz
```

복원:
```bash
# 백업 복원
docker exec -i customer_db mysql -u root -p customer_db < backup.sql

# 압축 백업 복원
gunzip < backup.sql.gz | docker exec -i customer_db mysql -u root -p customer_db
```

### 유용한 쿼리

마이그레이션 이력 확인:
```sql
-- Prisma 마이그레이션 테이블 확인
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

-- 적용된 마이그레이션 개수
SELECT COUNT(*) FROM _prisma_migrations WHERE success = 1;

-- 실패한 마이그레이션
SELECT * FROM _prisma_migrations WHERE success = 0;
```

---

## 참고 자료

- [Prisma Migrate 공식 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker 공식 문서](https://docs.docker.com/)
- [MariaDB 마이그레이션 가이드](https://mariadb.com/kb/en/upgrading/)

---

**작성일**: 2026-01-05  
**버전**: 1.0  
**담당자**: Customer Vault Development Team
