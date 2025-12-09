# 고객사 관리 시스템 - 환경 구성 가이드

이 문서는 다른 환경(개발/스테이징/운영)에서 시스템을 구성하는 방법을 상세히 설명합니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [환경 변수 설정](#환경-변수-설정)
3. [환경별 구성](#환경별-구성)
4. [초기 설정](#초기-설정)
5. [보안 체크리스트](#보안-체크리스트)
6. [문제 해결](#문제-해결)

---

## 사전 요구사항

### 필수 소프트웨어

- **Docker**: 20.10 이상
- **Docker Compose**: 2.0 이상
- **Git**: 최신 버전

### 시스템 요구사항

- **최소**: CPU 2코어, RAM 4GB, 디스크 20GB
- **권장**: CPU 4코어, RAM 8GB, 디스크 50GB

---

## 환경 변수 설정

### 1단계: .env 파일 생성

```bash
# 프로젝트 디렉토리로 이동
cd customer-storage

# env.example을 복사하여 .env 파일 생성
cp docs/env.example .env
```

### 2단계: 환경 변수 편집

```bash
# 원하는 텍스트 에디터로 .env 파일 편집
nano .env
# 또는
vim .env
# 또는
code .env  # VS Code
```

### 3단계: 필수 값 변경

#### 🔑 SECRET_KEY 생성

Flask 세션 암호화에 사용되는 중요한 키입니다.

```bash
# Python으로 안전한 랜덤 키 생성
python3 -c "import secrets; print(secrets.token_hex(32))"
```

출력된 문자열을 복사하여 `.env` 파일의 `SECRET_KEY` 값으로 설정하세요.

**예시:**
```bash
SECRET_KEY=4f8b9c2d1e6a7f3b5c9d2e8a1f7b3c6d9e2a5f8b1c4d7e0a3f6b9c2d5e8a1f4
```

#### 🔐 데이터베이스 비밀번호 설정

강력한 비밀번호를 생성하세요. 다음 조건을 만족해야 합니다:
- 최소 12자 이상
- 대문자, 소문자, 숫자, 특수문자 포함

**비밀번호 생성 도구:**
```bash
# Linux/macOS에서 랜덤 비밀번호 생성
openssl rand -base64 32

# 또는 Python 사용
python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(20)))"
```

---

## 환경별 구성

### 🛠️ 개발 환경

개발 환경에서는 디버깅과 코드 변경을 위해 일부 설정을 변경합니다.

**`.env.dev` 예시:**
```bash
# Flask 설정
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key-not-for-production

# 데이터베이스 설정
DB_ROOT_PASSWORD=devroot123
DB_NAME=customer_db_dev
DB_USER=dev_user
DB_PASSWORD=devpass123

# 파일 업로드 설정
MAX_UPLOAD_SIZE=16777216  # 16MB
ALLOWED_EXTENSIONS=pdf
```

**실행 방법:**
```bash
# .env.dev를 .env로 복사
cp .env.dev .env

# Docker Compose 실행
docker-compose up -d

# 로그 모니터링
docker-compose logs -f web
```

### 🧪 스테이징 환경

운영 환경과 동일한 설정을 사용하되, 별도의 데이터베이스를 사용합니다.

**`.env.staging` 예시:**
```bash
# Flask 설정
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-staging-secret-key-generated-above

# 데이터베이스 설정
DB_ROOT_PASSWORD=StrongStagingRoot@2024!
DB_NAME=customer_db_staging
DB_USER=customer_user_staging
DB_PASSWORD=StrongStagingPass@2024!

# 파일 업로드 설정
MAX_UPLOAD_SIZE=33554432  # 32MB
ALLOWED_EXTENSIONS=pdf
```

### 🚀 운영 환경

운영 환경에서는 최고 수준의 보안 설정이 필요합니다.

**`.env.production` 예시:**
```bash
# Flask 설정
FLASK_ENV=production
FLASK_DEBUG=False  # ⚠️ 절대 True로 설정하지 마세요!
SECRET_KEY=4f8b9c2d1e6a7f3b5c9d2e8a1f7b3c6d9e2a5f8b1c4d7e0a3f6b9c2d5e8a1f4

# 데이터베이스 설정
DB_ROOT_PASSWORD=VeryStrongRootPassword@2024!SecureDB#123
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=SecureCustomerPassword@2024!Production#456

# 파일 업로드 설정
MAX_UPLOAD_SIZE=52428800  # 50MB
ALLOWED_EXTENSIONS=pdf
```

**운영 환경 배포 체크리스트:**
- [ ] `FLASK_DEBUG=False`로 설정
- [ ] `SECRET_KEY`를 무작위 문자열로 변경
- [ ] 모든 데이터베이스 비밀번호 변경
- [ ] `.env` 파일 권한 설정: `chmod 600 .env`
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 방화벽 설정 (포트 5001만 허용)
- [ ] SSL/TLS 인증서 설정 (Nginx 사용 시)

---

## 초기 설정

### 1단계: Docker 컨테이너 시작

```bash
# 백그라운드에서 컨테이너 실행
docker-compose up -d

# 컨테이너 상태 확인
docker-compose ps

# 로그 확인 (문제 발생 시)
docker-compose logs -f
```

### 2단계: 데이터베이스 초기화 확인

```bash
# 데이터베이스 컨테이너가 정상 동작하는지 확인
docker-compose exec db mysql -u root -p${DB_ROOT_PASSWORD} -e "SHOW DATABASES;"

# customer_db 데이터베이스 확인
docker-compose exec db mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;"
```

### 3단계: 애플리케이션 접속 및 초기 관리자 설정

1. **브라우저에서 접속**
   ```
   http://localhost:5001
   # 또는 서버 IP
   http://your-server-ip:5001
   ```

2. **기본 관리자 계정으로 로그인**
   ```
   계정 ID: admin
   비밀번호: password1!
   ```

3. **새 슈퍼관리자 계정 생성**
   - 로그인 후 자동으로 생성 페이지로 이동됩니다
   - 다음 요구사항을 만족하는 계정을 생성하세요:
     - ✅ 계정 ID는 "admin" 사용 불가
     - ✅ 패스워드 최소 8자 이상
     - ✅ 대문자, 숫자, 특수문자 포함 필수

4. **계정 생성 완료**
   - 새 슈퍼관리자 계정이 생성되면 기본 admin 계정은 자동으로 비활성화됩니다
   - 새 계정으로 다시 로그인하세요

### 4단계: 데이터 초기화 (선택사항)

테스트 데이터를 모두 삭제하고 깨끗한 상태에서 시작하려면:

```bash
# 데이터베이스 초기화 스크립트 실행
docker-compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < migrations/reset_for_demo.sql

# 애플리케이션 재시작
docker-compose restart web
```

⚠️ **경고:** 이 작업은 모든 사용자, 고객사, 문서, 로그를 삭제합니다!

---

## 보안 체크리스트

### 필수 보안 설정

- [ ] **환경 변수 보안**
  - [ ] `SECRET_KEY` 변경 완료
  - [ ] `DB_ROOT_PASSWORD` 강력한 비밀번호로 변경
  - [ ] `DB_PASSWORD` 강력한 비밀번호로 변경
  - [ ] `.env` 파일 권한 설정: `chmod 600 .env`
  - [ ] `.env` 파일을 Git에서 제외 (`.gitignore` 확인)

- [ ] **Flask 설정**
  - [ ] 운영 환경에서 `FLASK_DEBUG=False` 설정
  - [ ] 운영 환경에서 `FLASK_ENV=production` 설정

- [ ] **데이터베이스 보안**
  - [ ] 기본 admin 계정 비활성화 확인
  - [ ] 새 슈퍼관리자 계정 생성 완료
  - [ ] 데이터베이스 정기 백업 설정

- [ ] **네트워크 보안**
  - [ ] 방화벽 설정 (필요한 포트만 허용)
  - [ ] SSL/TLS 인증서 설정 (프록시 사용 시)
  - [ ] 외부 접근 제한 (필요시 VPN 사용)

- [ ] **파일 업로드 보안**
  - [ ] `MAX_UPLOAD_SIZE` 적절히 설정
  - [ ] `ALLOWED_EXTENSIONS` 확인 (PDF만 허용)
  - [ ] 업로드 디렉토리 권한 확인

### 권장 보안 설정

- [ ] 정기적인 시스템 업데이트
- [ ] 로그 모니터링 설정
- [ ] 데이터베이스 자동 백업 스케줄
- [ ] 패스워드 정책 강화 (시스템 설정에서)
- [ ] 로그인 시도 제한 활성화
- [ ] 세션 타임아웃 설정

---

## 문제 해결

### 컨테이너 시작 실패

```bash
# 로그 확인
docker-compose logs

# 특정 서비스 로그 확인
docker-compose logs web
docker-compose logs db

# 컨테이너 재시작
docker-compose restart

# 완전 재시작 (볼륨 유지)
docker-compose down
docker-compose up -d
```

### 데이터베이스 연결 오류

```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose ps db

# 데이터베이스 접속 테스트
docker-compose exec db mysql -u root -p${DB_ROOT_PASSWORD}

# .env 파일의 DB_HOST 확인 (docker-compose.yml에서는 자동 설정됨)
# DB_HOST는 서비스명 'db'여야 합니다
```

### 환경 변수 적용 안 됨

```bash
# 환경 변수 다시 로드하려면 컨테이너 재시작 필요
docker-compose down
docker-compose up -d

# 또는
docker-compose restart web
```

### 파일 업로드 실패

```bash
# uploads 디렉토리 권한 확인
ls -la uploads/

# 권한 수정 (필요시)
chmod 755 uploads/
```

### 포트 충돌

```bash
# 5001 포트를 사용 중인 프로세스 확인
lsof -i :5001  # macOS/Linux
netstat -ano | findstr :5001  # Windows

# docker-compose.yml에서 포트 변경
# ports:
#   - "5002:5000"  # 호스트 포트를 5002로 변경
```

### 로그 확인

```bash
# 애플리케이션 로그
docker-compose logs -f web

# 데이터베이스 로그
docker-compose logs -f db

# 모든 로그
docker-compose logs -f

# 마지막 100줄만
docker-compose logs --tail=100
```

---

## 추가 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Flask 공식 문서](https://flask.palletsprojects.com/)
- [MariaDB 공식 문서](https://mariadb.org/documentation/)

---

## 지원

문제가 발생하거나 질문이 있으시면:

1. 로그 파일 확인 (`docker-compose logs`)
2. 환경 변수 설정 재확인
3. 이 문서의 문제 해결 섹션 참고
4. GitHub Issues에 문의

**이 가이드가 도움이 되었나요? ⭐ 스타를 눌러주세요!**
