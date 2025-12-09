# 환경 변수 빠른 참조

다른 환경에서 시스템을 구성할 때 필요한 환경 변수 설정 가이드입니다.

## 📝 환경 변수 목록

| 변수명 | 필수 여부 | 기본값 | 설명 | 예시 |
|--------|----------|--------|------|------|
| `FLASK_ENV` | 선택 | `production` | Flask 실행 환경 모드 | `development`, `production` |
| `FLASK_DEBUG` | 선택 | `False` | Flask 디버그 모드 | `True`, `False` |
| `SECRET_KEY` | **필수** | `dev-secret-key...` | 세션 암호화 키 (운영에서 필수 변경) | 64자 랜덤 문자열 |
| `DB_ROOT_PASSWORD` | **필수** | `rootpassword` | MariaDB root 비밀번호 | `StrongPass@2024!` |
| `DB_NAME` | **필수** | `customer_db` | 데이터베이스 이름 | `customer_db`, `customer_db_prod` |
| `DB_USER` | **필수** | `customer_user` | DB 사용자 이름 | `customer_user`, `app_user` |
| `DB_PASSWORD` | **필수** | `customerpass` | DB 사용자 비밀번호 | `SecureDBPass@2024!` |
| `DB_HOST` | 자동 설정 | `db` | DB 호스트 (docker-compose에서 자동) | `db`, `localhost` |
| `DB_PORT` | 자동 설정 | `3306` | DB 포트 | `3306` |
| `MAX_UPLOAD_SIZE` | 선택 | `16777216` | 최대 업로드 크기 (바이트) | `33554432` (32MB) |
| `ALLOWED_EXTENSIONS` | 선택 | `pdf` | 허용 파일 확장자 | `pdf`, `pdf,doc,docx` |

## 🚀 빠른 시작

### 1. .env 파일 생성

```bash
cp docs/env.example .env
```

### 2. 필수 값만 변경 (최소 구성)

```bash
nano .env
```

다음 3가지만 변경하면 기본 실행 가능:
- `SECRET_KEY` - 아래 명령어로 생성
- `DB_ROOT_PASSWORD` - 강력한 비밀번호
- `DB_PASSWORD` - 강력한 비밀번호

```bash
# SECRET_KEY 생성
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. 실행

```bash
docker-compose up -d
```

## 📋 환경별 설정 예시

### 개발 환경 (.env.dev)

```bash
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key
DB_ROOT_PASSWORD=devroot123
DB_NAME=customer_db_dev
DB_USER=dev_user
DB_PASSWORD=devpass123
MAX_UPLOAD_SIZE=16777216
ALLOWED_EXTENSIONS=pdf
```

### 운영 환경 (.env.prod)

```bash
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=4f8b9c2d1e6a7f3b5c9d2e8a1f7b3c6d9e2a5f8b1c4d7e0a3f6b9c2d5e8a1f4
DB_ROOT_PASSWORD=VeryStrongRoot@2024!DB#789
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=SecurePass@2024!Prod#456
MAX_UPLOAD_SIZE=52428800
ALLOWED_EXTENSIONS=pdf
```

## 🔐 보안 가이드

### SECRET_KEY 생성

```bash
# 방법 1: Python secrets 모듈 (권장)
python3 -c "import secrets; print(secrets.token_hex(32))"

# 방법 2: OpenSSL
openssl rand -hex 32

# 방법 3: /dev/urandom
head -c 32 /dev/urandom | base64
```

### 강력한 비밀번호 생성

```bash
# 20자 랜덤 비밀번호 (영문, 숫자, 특수문자 포함)
python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(20)))"

# OpenSSL 사용
openssl rand -base64 24
```

### 비밀번호 강도 요구사항

운영 환경 비밀번호는 다음을 만족해야 합니다:
- ✅ 최소 12자 이상
- ✅ 대문자 포함
- ✅ 소문자 포함
- ✅ 숫자 포함
- ✅ 특수문자 포함 (!@#$%^&* 등)

## 📊 파일 크기 단위 변환

`MAX_UPLOAD_SIZE` 설정을 위한 바이트 단위 변환표:

| 크기 | 바이트 | 설정값 |
|------|--------|--------|
| 10 MB | 10,485,760 | `10485760` |
| 16 MB | 16,777,216 | `16777216` (기본값) |
| 32 MB | 33,554,432 | `33554432` |
| 50 MB | 52,428,800 | `52428800` |
| 100 MB | 104,857,600 | `104857600` |

**계산 공식:** 크기(MB) × 1,048,576 = 바이트

```bash
# Python으로 계산
python3 -c "print(50 * 1024 * 1024)"  # 50MB를 바이트로 변환
```

## 🔍 Docker Compose 연동

Docker Compose는 `.env` 파일을 자동으로 읽어 환경 변수를 설정합니다.

### 사용되는 곳

1. **데이터베이스 컨테이너 (db)**
   - `MYSQL_ROOT_PASSWORD`: `DB_ROOT_PASSWORD`
   - `MYSQL_DATABASE`: `DB_NAME`
   - `MYSQL_USER`: `DB_USER`
   - `MYSQL_PASSWORD`: `DB_PASSWORD`

2. **웹 애플리케이션 컨테이너 (web)**
   - `FLASK_ENV`: Flask 실행 모드
   - `FLASK_DEBUG`: 디버그 모드
   - `SECRET_KEY`: 세션 암호화
   - `DB_HOST`: `db` (자동 설정)
   - `DB_PORT`: `3306` (자동 설정)
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### 환경 변수 확인

```bash
# 실행 중인 컨테이너의 환경 변수 확인
docker-compose exec web env | grep -E 'FLASK|DB|SECRET'

# 특정 변수만 확인
docker-compose exec web printenv FLASK_ENV
docker-compose exec web printenv DB_NAME
```

## ⚠️ 주의사항

### 절대 하지 말아야 할 것

- ❌ `.env` 파일을 Git에 커밋
- ❌ 운영 환경에서 `FLASK_DEBUG=True` 사용
- ❌ 기본 비밀번호(`rootpassword`, `customerpass`) 그대로 사용
- ❌ 운영/개발 환경에서 동일한 `SECRET_KEY` 사용
- ❌ `.env` 파일을 공개 저장소에 업로드

### 반드시 해야 할 것

- ✅ `.env` 파일 권한 제한: `chmod 600 .env`
- ✅ `.gitignore`에 `.env` 포함 확인
- ✅ 운영 환경에서 모든 비밀번호 변경
- ✅ `SECRET_KEY` 무작위 생성
- ✅ 정기적인 비밀번호 변경 (3개월마다 권장)

## 🛠️ 문제 해결

### 환경 변수가 적용되지 않음

```bash
# 컨테이너 재시작 (환경 변수 다시 로드)
docker-compose down
docker-compose up -d
```

### .env 파일 문법 오류

```bash
# 공백, 따옴표 확인
# 올바른 예:
DB_NAME=customer_db

# 잘못된 예:
DB_NAME = customer_db  # = 양쪽에 공백
DB_NAME="customer_db"  # 따옴표 불필요 (특수문자 포함 시에만)
```

### 비밀번호에 특수문자가 있을 때

```bash
# 특수문자가 포함된 경우 따옴표로 감싸기
DB_PASSWORD="Pass@2024!#With$pecial"

# 또는 이스케이프 처리
DB_PASSWORD=Pass\@2024\!\#With\$pecial
```

## 📚 추가 자료

- [env.example](env.example) - 환경 변수 템플릿 파일
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - 상세 설정 가이드
- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Docker 설정 가이드
- [docker-compose.yml](../docker-compose.yml) - Docker 구성 파일
- [메인 README](../README.md) - 프로젝트 개요

---

**질문이나 문제가 있으신가요?** GitHub Issues에서 문의해주세요!
