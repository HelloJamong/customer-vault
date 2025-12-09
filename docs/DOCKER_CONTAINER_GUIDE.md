# Docker 컨테이너로 환경 구성하기

이 문서는 Docker 컨테이너를 사용하여 처음부터 끝까지 고객사 관리 시스템 환경을 구성하는 방법을 단계별로 설명합니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [단계별 구성 가이드](#단계별-구성-가이드)
3. [컨테이너 운영](#컨테이너-운영)
4. [데이터 관리](#데이터-관리)
5. [백업 및 복원](#백업-및-복원)
6. [모니터링](#모니터링)
7. [문제 해결](#문제-해결)

---

## 사전 준비

### 1. Docker 설치

#### Linux (Ubuntu/Debian)

```bash
# 기존 Docker 제거 (있는 경우)
sudo apt-get remove docker docker-engine docker.io containerd runc

# 필수 패키지 설치
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker GPG 키 추가
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 로그아웃 후 다시 로그인하거나 아래 명령어 실행
newgrp docker

# 설치 확인
docker --version
docker compose version
```

#### Rocky Linux / CentOS

```bash
# Docker 저장소 추가
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Docker 설치
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 설치 확인
docker --version
docker compose version
```

#### macOS

```bash
# Homebrew로 설치
brew install --cask docker

# 또는 Docker Desktop 다운로드
# https://www.docker.com/products/docker-desktop

# 설치 확인
docker --version
docker compose version
```

#### Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop) 다운로드
2. 설치 파일 실행
3. WSL 2 설정 (권장)
4. Docker Desktop 실행
5. PowerShell에서 확인:
```powershell
docker --version
docker compose version
```

### 2. 시스템 요구사항 확인

```bash
# CPU 코어 수 확인 (최소 2코어 권장)
nproc

# 메모리 확인 (최소 4GB 권장)
free -h

# 디스크 공간 확인 (최소 20GB 권장)
df -h
```

---

## 단계별 구성 가이드

### Step 1: 프로젝트 준비

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-username/customer-storage.git
cd customer-storage

# 2. 디렉토리 구조 확인
ls -la

# 3. 필요한 디렉토리가 있는지 확인
# - app/ (애플리케이션 코드)
# - migrations/ (DB 마이그레이션)
# - Dockerfile
# - docker-compose.yml
# - env.example
```

### Step 2: 환경 변수 설정

```bash
# 1. env.example을 복사하여 .env 생성
cp docs/env.example .env

# 2. SECRET_KEY 생성
python3 -c "import secrets; print(secrets.token_hex(32))"
# 출력된 값을 복사

# 3. .env 파일 편집
nano .env
# 또는
vim .env

# 4. 필수 값 변경
# - SECRET_KEY: 위에서 생성한 값으로 변경
# - DB_ROOT_PASSWORD: 강력한 비밀번호로 변경
# - DB_PASSWORD: 강력한 비밀번호로 변경
```

**최소 .env 설정 예시:**
```bash
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=4f8b9c2d1e6a7f3b5c9d2e8a1f7b3c6d9e2a5f8b1c4d7e0a3f6b9c2d5e8a1f4
DB_ROOT_PASSWORD=StrongRootPassword@2024!
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=SecureUserPassword@2024!
MAX_UPLOAD_SIZE=16777216
ALLOWED_EXTENSIONS=pdf
```

### Step 3: 데이터 디렉토리 생성

```bash
# 필요한 디렉토리 생성 (이미 있으면 생략)
mkdir -p data/mariadb
mkdir -p uploads
mkdir -p logs

# 권한 설정
chmod 755 uploads
chmod 755 logs
```

### Step 4: Docker 이미지 빌드

```bash
# 1. Docker Compose로 이미지 빌드
docker compose build

# 2. 빌드 진행 상황 확인
# "Successfully built" 메시지가 나올 때까지 대기

# 3. 빌드된 이미지 확인
docker images | grep customer
```

### Step 5: 컨테이너 실행

```bash
# 1. 백그라운드에서 컨테이너 시작
docker compose up -d

# 2. 컨테이너 상태 확인
docker compose ps

# 예상 출력:
# NAME              STATUS          PORTS
# customer_db       Up (healthy)    0.0.0.0:3306->3306/tcp
# customer_web      Up              0.0.0.0:5001->5000/tcp

# 3. 로그 확인 (문제 발생 시)
docker compose logs -f
```

### Step 6: 데이터베이스 초기화 확인

```bash
# 1. 데이터베이스 컨테이너가 준비될 때까지 대기 (약 30초)
sleep 30

# 2. 데이터베이스 접속 테스트
docker compose exec db mysql -u root -p${DB_ROOT_PASSWORD} -e "SHOW DATABASES;"

# 3. customer_db 데이터베이스 확인
docker compose exec db mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;"

# 4. 테이블이 자동 생성되었는지 확인
# users, customers, documents 등이 표시되어야 함
```

### Step 7: 웹 애플리케이션 접속

```bash
# 1. 브라우저에서 접속
# http://localhost:5001

# 2. 또는 curl로 테스트
curl http://localhost:5001

# 3. 로그인 페이지가 보이면 성공!
```

### Step 8: 초기 관리자 계정 설정

1. **브라우저에서 http://localhost:5001 접속**

2. **기본 admin 계정으로 로그인**
   ```
   계정 ID: admin
   비밀번호: password1!
   ```

3. **자동으로 새 슈퍼관리자 생성 페이지로 이동됨**

4. **새 슈퍼관리자 계정 정보 입력**
   - 계정 ID: (admin 제외한 원하는 ID)
   - 이름: 실명 또는 표시명
   - 이메일: (선택사항)
   - 패스워드: 8자 이상, 대문자/숫자/특수문자 포함

5. **계정 생성 완료 후 새 계정으로 로그인**

---

## 컨테이너 운영

### 기본 명령어

```bash
# 컨테이너 시작
docker compose start

# 컨테이너 중지
docker compose stop

# 컨테이너 재시작
docker compose restart

# 특정 서비스만 재시작
docker compose restart web

# 컨테이너 중지 및 제거
docker compose down

# 로그 확인
docker compose logs -f web
docker compose logs -f db
```

### 컨테이너 상태 확인

```bash
# 전체 컨테이너 상태
docker compose ps

# 상세 정보
docker compose ps -a

# 리소스 사용량
docker stats customer_web customer_db

# 포트 확인
docker compose port web 5000
docker compose port db 3306
```

### 컨테이너 내부 접속

```bash
# 웹 컨테이너 접속
docker compose exec web bash

# 데이터베이스 컨테이너 접속
docker compose exec db bash

# 데이터베이스 직접 접속
docker compose exec db mysql -u root -p

# 또는 사용자 계정으로
docker compose exec db mysql -u customer_user -p customer_db
```

### 애플리케이션 업데이트

```bash
# 1. 코드 변경 후 Git Pull
git pull origin main

# 2. 이미지 재빌드
docker compose build web

# 3. 컨테이너 재시작
docker compose up -d web

# 또는 한 번에
docker compose up -d --build web
```

---

## 데이터 관리

### 데이터베이스 작업

#### SQL 파일 실행

```bash
# 마이그레이션 파일 실행
docker compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < migrations/add_sub_contacts.sql

# 초기화 스크립트 실행
docker compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < migrations/reset_for_demo.sql
```

#### 데이터베이스 직접 조작

```bash
# MySQL 셸 접속
docker compose exec db mysql -u root -p

# 데이터베이스 선택
USE customer_db;

# 테이블 목록
SHOW TABLES;

# 사용자 목록 조회
SELECT id, username, name, role, is_active FROM users;

# 고객사 목록 조회
SELECT id, name, location FROM customers;
```

### 업로드 파일 관리

```bash
# 업로드된 파일 목록 확인
ls -lh uploads/

# 특정 고객사 폴더 확인
ls -lh uploads/customer_1/

# 파일 크기 확인
du -sh uploads/

# 오래된 파일 찾기 (90일 이상)
find uploads/ -type f -mtime +90 -ls
```

### 로그 관리

```bash
# 애플리케이션 로그 확인
docker compose logs web --tail=100

# 실시간 로그 모니터링
docker compose logs -f web

# 특정 날짜의 로그
docker compose logs --since="2024-01-01" web

# 로그 파일 확인 (컨테이너 내부)
docker compose exec web ls -lh /app/logs/
```

---

## 백업 및 복원

### 데이터베이스 백업

```bash
# 전체 데이터베이스 백업
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup_$(date +%Y%m%d).sql

# 압축하여 백업
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} | gzip > backup_$(date +%Y%m%d).sql.gz

# 특정 테이블만 백업
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} users customers > backup_users_customers.sql
```

### 데이터베이스 복원

```bash
# SQL 파일로 복원
docker compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < backup_20240101.sql

# 압축된 파일 복원
gunzip < backup_20240101.sql.gz | docker compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME}
```

### 전체 시스템 백업

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/customer-storage"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"

mkdir -p ${BACKUP_PATH}

# 1. 데이터베이스 백업
docker compose exec -T db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} | gzip > ${BACKUP_PATH}/database.sql.gz

# 2. 업로드 파일 백업
tar -czf ${BACKUP_PATH}/uploads.tar.gz uploads/

# 3. 설정 파일 백업
cp .env ${BACKUP_PATH}/
cp docker-compose.yml ${BACKUP_PATH}/

# 4. 로그 백업
tar -czf ${BACKUP_PATH}/logs.tar.gz logs/

echo "Backup completed: ${BACKUP_PATH}"
```

사용 방법:
```bash
# 실행 권한 부여
chmod +x backup.sh

# 백업 실행
./backup.sh

# 크론탭에 등록 (매일 새벽 2시)
crontab -e
# 추가: 0 2 * * * /path/to/backup.sh
```

### 전체 시스템 복원

```bash
#!/bin/bash
# restore.sh

BACKUP_PATH="/backup/customer-storage/20240101_020000"

# 1. 컨테이너 중지
docker compose down

# 2. 데이터베이스 데이터 삭제
rm -rf data/mariadb/*

# 3. 업로드 파일 복원
tar -xzf ${BACKUP_PATH}/uploads.tar.gz

# 4. 설정 파일 복원
cp ${BACKUP_PATH}/.env .env

# 5. 컨테이너 시작
docker compose up -d

# 6. 데이터베이스가 준비될 때까지 대기
sleep 30

# 7. 데이터베이스 복원
gunzip < ${BACKUP_PATH}/database.sql.gz | docker compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME}

echo "Restore completed"
```

---

## 모니터링

### 컨테이너 헬스체크

```bash
# docker-compose.yml에 헬스체크 추가
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 5s
      retries: 10
```

### 리소스 모니터링

```bash
# 실시간 리소스 사용량
docker stats

# JSON 형식으로 출력
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# 특정 컨테이너만
docker stats customer_web
```

### 로그 모니터링

```bash
# 에러 로그만 필터링
docker compose logs web | grep -i error

# 특정 시간 이후 로그
docker compose logs --since="2024-01-01T00:00:00" web

# 실시간 로그 + 타임스탬프
docker compose logs -f -t web
```

### 디스크 사용량 모니터링

```bash
# Docker 전체 디스크 사용량
docker system df

# 상세 정보
docker system df -v

# 컨테이너별 크기
docker ps -s
```

---

## 문제 해결

### 컨테이너가 시작되지 않음

```bash
# 1. 로그 확인
docker compose logs

# 2. 이전 컨테이너 완전 제거
docker compose down -v

# 3. 이미지 재빌드
docker compose build --no-cache

# 4. 재시작
docker compose up -d
```

### 데이터베이스 연결 실패

```bash
# 1. DB 컨테이너 상태 확인
docker compose ps db

# 2. DB 헬스체크 상태 확인
docker inspect customer_db | grep -A 10 Health

# 3. DB 로그 확인
docker compose logs db

# 4. 연결 테스트
docker compose exec web nc -zv db 3306

# 5. 환경 변수 확인
docker compose exec web env | grep DB
```

### 파일 업로드 실패

```bash
# 1. uploads 디렉토리 권한 확인
ls -ld uploads/

# 2. 권한 수정
chmod 755 uploads/

# 3. 컨테이너 내부에서 확인
docker compose exec web ls -ld /app/uploads

# 4. 디스크 공간 확인
df -h
```

### 메모리 부족

```bash
# 1. 현재 메모리 사용량 확인
docker stats --no-stream

# 2. docker-compose.yml에 메모리 제한 추가
services:
  web:
    deploy:
      resources:
        limits:
          memory: 1G

# 3. 재시작
docker compose up -d
```

### 포트 충돌

```bash
# 1. 포트 사용 확인
sudo lsof -i :5001
sudo lsof -i :3306

# 2. docker-compose.yml에서 포트 변경
services:
  web:
    ports:
      - "5002:5000"  # 5001 -> 5002로 변경

# 3. 재시작
docker compose up -d
```

---

## 운영 환경 체크리스트

### 배포 전

- [ ] `.env` 파일의 모든 비밀번호 변경
- [ ] `SECRET_KEY` 무작위 문자열로 설정
- [ ] `FLASK_DEBUG=False` 설정
- [ ] `FLASK_ENV=production` 설정
- [ ] `.env` 파일 권한 설정: `chmod 600 .env`
- [ ] 방화벽 설정 (필요한 포트만 허용)
- [ ] SSL/TLS 인증서 설정
- [ ] 백업 스크립트 설정 및 테스트

### 배포 후

- [ ] 모든 컨테이너가 정상 실행 중인지 확인
- [ ] 웹 애플리케이션 접속 확인
- [ ] 데이터베이스 연결 확인
- [ ] 파일 업로드 테스트
- [ ] 로그 정상 기록 확인
- [ ] 백업 자동화 설정
- [ ] 모니터링 도구 설정
- [ ] 관리자 계정 생성 완료

---

## 참고 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [환경 변수 설정 가이드](ENV_VARIABLES.md)
- [Docker 설정 가이드](DOCKER_GUIDE.md)

---

**이전 문서:** [Docker 설정 가이드](DOCKER_GUIDE.md) | **다음 문서:** [환경 설정 가이드](SETUP_GUIDE.md)
