# 오프라인 환경 배포 가이드

## 개요

이 가이드는 Customer Vault를 폐쇄망(오프라인) 환경에 배포하는 방법을 설명합니다.

## 워크플로우

```
[온라인 환경]                    [오프라인 환경]
    │                                 │
    ├─ 1. 이미지 빌드                 │
    ├─ 2. export-package.sh 실행      │
    ├─ 3. tar 파일 생성               │
    │                                 │
    └──── USB/파일전송 ────────────→  ├─ 4. tar 파일 압축 해제
                                      ├─ 5. import-package.sh 실행
                                      └─ 6. 서비스 시작
```

## 1. 온라인 환경 (개발/빌드 서버)

### 전제 조건
- Docker 및 Docker Compose 설치
- 프로젝트 소스 코드 접근 가능
- 인터넷 연결 가능

### 배포 패키지 생성

```bash
# 프로젝트 디렉토리로 이동
cd customer-vault

# export 스크립트 실행 (버전 지정)
./scripts/export-package.sh 2.1.7

# 또는 기본 버전 사용
./scripts/export-package.sh
```

### 생성되는 파일

`customer_vault_2.1.7_package.tar.gz` 파일이 생성됩니다.

**패키지 내용:**
- `images.tar` - Docker 이미지 (backend, frontend, nginx, mariadb)
- `docker-compose.yml` - 오프라인용 설정 (build 섹션 제거됨)
- `proxy/` - Nginx 설정
- `import-package.sh` - 오프라인 설치 스크립트
- `DEPLOYMENT_GUIDE.md` - 배포 가이드
- `MIGRATIONS.md` - DB 마이그레이션 가이드 (변경 있는 경우)
- `prisma/` - DB 마이그레이션 파일 (변경 있는 경우)

### 패키지 전송

```bash
# USB로 복사
cp customer_vault_2.1.7_package.tar.gz /media/usb/

# 또는 scp로 전송 (가능한 경우)
scp customer_vault_2.1.7_package.tar.gz user@offline-server:/tmp/
```

## 2. 오프라인 환경 (운영 서버)

### 전제 조건
- Docker 및 Docker Compose 설치 (미리 설치 필요)
- 기존 `.env` 파일 (기존 환경인 경우)

### 배포 절차

#### 1) 패키지 압축 해제

```bash
# 패키지 복사 (USB에서)
cp /media/usb/customer_vault_2.1.7_package.tar.gz ~/

# 압축 해제
tar -xzf customer_vault_2.1.7_package.tar.gz
cd customer_vault_2.1.7_package
```

#### 2) 환경 설정 준비

**신규 설치:**
```bash
# .env 파일 생성 필요
vi .env  # 설정 입력
```

**기존 환경 업데이트:**
```bash
# 기존 .env 파일 복사
cp /path/to/existing/customer-vault/.env .
```

#### 3) 자동 설치 스크립트 실행

```bash
# import 스크립트 실행
./import-package.sh
```

스크립트는 다음 작업을 자동으로 수행합니다:
- 필수 파일 확인
- Docker 설치 확인
- 기존 서비스 확인 및 중지 (선택)
- DB 백업 (선택)
- Docker 이미지 로드
- 서비스 시작
- DB 마이그레이션 적용 (필요시)

## 3. 이미지 태그 관리

### 온라인 환경에서의 이미지

**GitHub Actions 빌드 후:**
```bash
# Docker Hub 이미지
igor0670/customer-storage-backend:2.1.7
igor0670/customer-storage-frontend:2.1.7

# export 스크립트가 자동으로 로컬 태그로 변환
customer_backend:2.1.7
customer_frontend:2.1.7
```

### 오프라인 환경에서의 이미지

```bash
# import 후 확인
docker images | grep customer

# 출력 예시:
# customer_backend     2.1.7    ...
# customer_frontend    2.1.7    ...
# mariadb              10.11    ...
# nginx                alpine   ...
```

### docker-compose.yml

**온라인 환경 (docker-compose.yml):**
```yaml
backend:
  image: igor0670/customer-storage-backend:${VERSION:-latest}
  build:  # 빌드 가능
    context: ./backend
```

**오프라인 환경 (패키지의 docker-compose.yml):**
```yaml
backend:
  image: customer_backend:2.1.7
  # build 섹션 없음 - 인터넷 불필요
```

## 4. 트러블슈팅

### 이미지 로드 실패

```bash
# 수동으로 이미지 로드
docker load -i images.tar

# 이미지 확인
docker images
```

### 기존 서비스와 충돌

```bash
# 기존 서비스 확인
docker ps -a | grep customer

# 기존 서비스 중지
docker stop customer_backend customer_frontend customer_proxy
```

### DB 마이그레이션 실패

```bash
# 수동 마이그레이션
docker compose exec backend npx prisma migrate deploy

# 마이그레이션 상태 확인
docker compose exec backend npx prisma migrate status
```

### 롤백

```bash
# 서비스 중지
docker compose stop

# 이전 이미지로 복원
docker load -i <이전_버전_패키지>/images.tar

# DB 복원
docker exec -i customer_db mysql -u root -p<PASSWORD> customer_db < backup.sql

# 서비스 재시작
docker compose up -d
```

## 5. 주의사항

### ⚠️ DB 백업 필수
- **매 배포 전 반드시 DB 백업**
- import 스크립트가 자동 백업 수행
- 백업 파일 위치 확인: `backup_YYYYMMDD_HHMMSS.sql`

### ⚠️ 버전 관리
- 패키지 파일명에 버전 명시
- 여러 버전 보관 권장
- 롤백용 이전 버전 유지

### ⚠️ 환경 설정
- `.env` 파일 보안 주의
- 프로덕션 환경에서는 강력한 비밀번호 사용
- `JWT_SECRET` 변경 필수

### ⚠️ 디스크 공간
- 이미지 tar 파일: 약 1-2GB
- DB 백업 파일: 사용량에 따라 다름
- 충분한 여유 공간 확보

## 6. 빠른 참조

### 온라인 환경 (개발 서버)

```bash
# 1. 최신 코드 pull
git pull

# 2. 태그 생성 (선택)
git tag v2.1.7
git push origin v2.1.7

# 3. 패키지 생성
./scripts/export-package.sh 2.1.7

# 4. 패키지 전송
cp customer_vault_2.1.7_package.tar.gz /media/usb/
```

### 오프라인 환경 (운영 서버)

```bash
# 1. 패키지 복사 및 압축 해제
tar -xzf customer_vault_2.1.7_package.tar.gz
cd customer_vault_2.1.7_package

# 2. .env 파일 준비
cp /기존/경로/.env .

# 3. 배포 실행
./import-package.sh

# 4. 서비스 확인
docker compose ps
docker compose logs -f backend frontend
```

## 7. 참고 자료

- [Docker 설정 가이드](docker_setup_guide.md)
- [DB 마이그레이션 가이드](migration_guide.md)
- [로그 정보](logs_information.md)

