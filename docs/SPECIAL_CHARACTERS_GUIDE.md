# 🔐 특수문자 포함 비밀번호 사용 가이드

`.env` 파일에서 `@`, `$`, `!` 등의 특수문자를 포함한 비밀번호를 사용할 때의 주의사항과 해결 방법입니다.

## 📋 목차

1. [문제 증상](#문제-증상)
2. [올바른 사용 방법](#올바른-사용-방법)
3. [피해야 할 실수](#피해야-할-실수)
4. [특수문자별 주의사항](#특수문자별-주의사항)
5. [테스트 방법](#테스트-방법)
6. [문제 해결](#문제-해결)

---

## 문제 증상

### 일반적인 에러 메시지

```bash
# Docker Compose 실행 시
ERROR: Invalid interpolation format

# 데이터베이스 연결 실패
Can't connect to MySQL server
Access denied for user 'customer_user'@'%'
```

### 원인

`.env` 파일에서 특수문자를 잘못 처리하면:
- Docker Compose가 환경 변수를 잘못 해석
- 쉘에서 특수문자가 이스케이프됨
- 비밀번호가 의도와 다르게 전달됨

---

## 올바른 사용 방법

### ✅ 방법 1: 따옴표 없이 그대로 사용 (권장)

`.env` 파일:
```bash
DB_ROOT_PASSWORD=MyPass@2024!#Strong
DB_PASSWORD=password12!@#Secure
```

**장점:**
- 가장 간단하고 직관적
- Docker Compose와 완벽 호환
- 대부분의 특수문자 사용 가능

**사용 가능한 특수문자:**
- `@` (at)
- `!` (exclamation)
- `#` (hash)
- `$` (dollar) - 주의 필요 (아래 참고)
- `%` (percent)
- `^` (caret)
- `&` (ampersand)
- `*` (asterisk)
- `-` (hyphen)
- `_` (underscore)
- `=` (equals)
- `+` (plus)

### ✅ 방법 2: 작은따옴표 사용 (특정 상황)

`.env` 파일:
```bash
DB_ROOT_PASSWORD='MyPass@2024!#Strong'
DB_PASSWORD='password12!@#Secure'
```

**주의:** Docker Compose는 따옴표를 제거하지만, 일부 환경에서는 따옴표가 포함될 수 있습니다.

---

## 피해야 할 실수

### ❌ 잘못된 방법 1: 큰따옴표 사용

```bash
# 이렇게 하면 안 됩니다!
DB_PASSWORD="password12!@"
```

**문제:**
- 큰따옴표 안에서 `$`, `!` 등이 쉘에서 해석됨
- 비밀번호가 의도와 다르게 변경됨

### ❌ 잘못된 방법 2: 백슬래시 이스케이프

```bash
# 이렇게 하면 안 됩니다!
DB_PASSWORD=password12\!\@
```

**문제:**
- 백슬래시가 비밀번호에 포함됨
- 실제 비밀번호: `password12\!\@`

### ❌ 잘못된 방법 3: 공백 포함

```bash
# 이렇게 하면 안 됩니다!
DB_PASSWORD = password12!@    # = 양쪽 공백
DB_PASSWORD=password12!@       # 끝에 공백
```

**문제:**
- 공백이 비밀번호에 포함됨
- 로그인 실패

---

## 특수문자별 주의사항

### `$` (달러) 기호 - 특별 주의 필요!

**문제:**
```bash
DB_PASSWORD=test$123
```

Docker Compose는 `$`를 환경 변수 참조로 해석합니다.
- `$123` → 환경 변수 `123`을 찾으려 시도
- 결과: `test` (빈 값으로 치환)

**해결책 1: `$$` 사용 (권장)**
```bash
DB_PASSWORD=test$$123
```
- Docker Compose는 `$$`를 `$`로 해석
- 실제 비밀번호: `test$123`

**해결책 2: 다른 특수문자 사용**
```bash
DB_PASSWORD=test#123
DB_PASSWORD=test@123
```

### `#` (해시) 기호 - 주석 아님!

**안전:**
```bash
DB_PASSWORD=password#123
```

행의 중간에 있는 `#`는 주석이 아닙니다. 안전하게 사용 가능!

**주의:**
```bash
DB_PASSWORD=password  # 이것은 주석입니다
```
위 경우 실제 비밀번호는 `password`만 포함됩니다.

### `@` (at) 기호 - 완전 안전

```bash
DB_PASSWORD=password12!@
DB_ROOT_PASSWORD=MyPass@2024!
```

`@`는 `.env` 파일과 Docker Compose에서 안전하게 사용 가능합니다!

### `!` (느낌표) 기호 - 대부분 안전

```bash
DB_PASSWORD=password12!
DB_PASSWORD=Strong!Pass
```

`.env` 파일에서는 안전합니다. (Bash 히스토리 확장과는 무관)

---

## 테스트 방법

### 1. 환경 변수 확인

```bash
# .env 파일 설정 후
docker compose config

# 출력에서 비밀번호 확인 (실제 값이 보여야 함)
# environment:
#   DB_PASSWORD: password12!@
```

### 2. 컨테이너 내부 확인

```bash
# 웹 컨테이너에서 환경 변수 확인
docker compose exec web printenv DB_PASSWORD

# 예상 출력: password12!@
```

### 3. 데이터베이스 접속 테스트

```bash
# 비밀번호로 직접 접속 테스트
docker compose exec db mysql -u customer_user -p

# 비밀번호 입력: password12!@
# MySQL 프롬프트가 나타나면 성공!
```

### 4. 자동화된 테스트

```bash
# 비밀번호를 환경 변수로 전달하여 테스트
docker compose exec db mysql -u customer_user -p${DB_PASSWORD} -e "SELECT 1;"

# 출력:
# +---+
# | 1 |
# +---+
# | 1 |
# +---+
# 성공!
```

---

## 문제 해결

### 문제 1: "Access denied" 에러

**증상:**
```
ERROR 1045 (28000): Access denied for user 'customer_user'@'%'
```

**원인:**
- 비밀번호에 특수문자가 잘못 해석됨
- `.env` 파일의 비밀번호와 실제 사용한 비밀번호가 다름

**해결:**

1. **현재 설정된 비밀번호 확인**
   ```bash
   docker compose exec web printenv DB_PASSWORD
   ```

2. **예상과 다르면 .env 파일 수정**
   ```bash
   nano .env

   # 모든 따옴표 제거
   DB_PASSWORD=password12!@

   # $ 기호가 있다면 $$ 로 변경
   # DB_PASSWORD=test$123  →  DB_PASSWORD=test$$123
   ```

3. **컨테이너 재시작**
   ```bash
   docker compose down
   docker compose up -d
   ```

### 문제 2: "Invalid interpolation format" 에러

**증상:**
```
ERROR: Invalid interpolation format for "DB_PASSWORD" option
```

**원인:**
- `.env` 파일에 문법 오류
- 따옴표 불일치

**해결:**

1. **.env 파일 문법 확인**
   ```bash
   cat .env | grep DB_PASSWORD
   ```

2. **올바른 형식으로 수정**
   ```bash
   # 잘못된 예:
   DB_PASSWORD="password12!@"   # ❌ 큰따옴표
   DB_PASSWORD = password12!@   # ❌ = 양쪽 공백

   # 올바른 예:
   DB_PASSWORD=password12!@     # ✅
   ```

### 문제 3: 비밀번호에 `$`가 포함된 경우

**증상:**
- 로그인 실패
- 비밀번호가 잘려서 저장됨

**예시:**
```bash
# .env 파일
DB_PASSWORD=test$123

# 실제 저장된 값
$ docker compose exec web printenv DB_PASSWORD
test
# $123 부분이 사라짐!
```

**해결:**
```bash
# .env 파일 수정
DB_PASSWORD=test$$123

# 확인
$ docker compose exec web printenv DB_PASSWORD
test$123
# 정상!
```

### 문제 4: 데이터베이스가 이미 생성된 경우

**증상:**
- `.env` 파일을 수정했지만 여전히 로그인 실패
- 이전 비밀번호가 계속 사용됨

**원인:**
- MariaDB 컨테이너가 처음 생성될 때 비밀번호 설정
- 이후 `.env` 변경만으로는 비밀번호가 변경되지 않음

**해결:**

1. **데이터베이스 볼륨 삭제 및 재생성**
   ```bash
   # 컨테이너 중지 및 삭제
   docker compose down

   # 데이터베이스 볼륨 삭제 (데이터 전체 삭제됨!)
   rm -rf data/mariadb/*

   # 또는 Docker 볼륨 삭제
   docker volume rm customer-storage_mariadb_data

   # .env 파일 수정
   nano .env

   # 재시작 (새로운 비밀번호로 생성됨)
   docker compose up -d
   ```

2. **데이터베이스 내부에서 비밀번호 변경 (데이터 유지)**
   ```bash
   # root로 접속
   docker compose exec db mysql -u root -p

   # 비밀번호 입력 (현재 DB_ROOT_PASSWORD)

   # MySQL 프롬프트에서:
   ALTER USER 'customer_user'@'%' IDENTIFIED BY 'password12!@';
   FLUSH PRIVILEGES;
   exit;

   # .env 파일도 동일하게 수정
   nano .env
   DB_PASSWORD=password12!@

   # 웹 컨테이너 재시작
   docker compose restart web
   ```

---

## 📝 올바른 .env 예시

### 예시 1: 다양한 특수문자 사용

```bash
# Flask 설정
SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# 데이터베이스 설정
DB_ROOT_PASSWORD=RootPass@2024!Strong#Secure
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=UserPass@2024!#Secure
```

### 예시 2: $ 기호 포함

```bash
# $ 기호는 $$ 로 작성
DB_ROOT_PASSWORD=MyPass$$2024!
DB_PASSWORD=SecureP$$w0rd@123
```

### 예시 3: 최대한 안전한 조합

```bash
# 권장 특수문자: @ ! # % ^ & * - _ = +
DB_ROOT_PASSWORD=Rt!P@ss#2024^Str0ng
DB_PASSWORD=Us3r!P@ss#2024&S3cur3
```

---

## ✅ 체크리스트

비밀번호 설정 전 확인사항:

- [ ] 따옴표를 사용하지 않았나요?
- [ ] `=` 양쪽에 공백이 없나요?
- [ ] `$` 기호는 `$$`로 작성했나요?
- [ ] 비밀번호 끝에 공백이 없나요?
- [ ] 테스트 명령어로 확인했나요?

---

## 📚 추가 자료

- [환경 변수 참조](ENV_VARIABLES.md) - 전체 환경 변수 가이드
- [제3자 배포 가이드](DEPLOYMENT_GUIDE.md) - 배포 과정
- [문제 해결](DEPLOYMENT_GUIDE.md#문제-해결) - 일반적인 문제

---

## 🆘 여전히 문제가 있나요?

1. **환경 변수 출력 확인**
   ```bash
   docker compose config | grep -A 5 environment
   ```

2. **비밀번호 직접 확인**
   ```bash
   docker compose exec web printenv | grep DB
   ```

3. **로그 확인**
   ```bash
   docker compose logs db | grep -i error
   ```

4. **GitHub Issues에 문의**
   - 에러 메시지 전체 복사
   - `.env` 파일 내용 (비밀번호는 `***`로 가림)
   - 사용한 특수문자 명시

---

**💡 Tip:** 가장 안전한 특수문자는 `@`, `!`, `#`, `^`, `&`, `*`, `_`, `-` 입니다!
