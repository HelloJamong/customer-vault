# 🚀 제3자 서버 배포 가이드

이 문서는 고객사 관리 시스템을 **처음 접하는 사람**이 **본인의 서버**에 배포하는 **전체 과정**을 설명합니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [1단계: 서버 준비](#1단계-서버-준비)
3. [2단계: Docker 설치](#2단계-docker-설치)
4. [3단계: 프로젝트 다운로드](#3단계-프로젝트-다운로드)
5. [4단계: 환경 설정](#4단계-환경-설정)
6. [5단계: 실행 및 확인](#5단계-실행-및-확인)
7. [6단계: 초기 설정](#6단계-초기-설정)
8. [7단계: 운영 설정 (선택)](#7단계-운영-설정-선택)
9. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 필수 요구사항

- ✅ **서버**: Linux 서버 (Ubuntu 20.04+, Rocky Linux 9+, CentOS 8+ 등)
- ✅ **접근 권한**: SSH 접근 및 sudo 권한
- ✅ **시스템 리소스**:
  - CPU: 최소 2코어 (권장 4코어)
  - RAM: 최소 4GB (권장 8GB)
  - Disk: 최소 20GB (권장 50GB)
- ✅ **네트워크**: 인터넷 연결 (Docker 이미지 다운로드용)

### 선택 사항

- 🔹 도메인 (예: customer.yourdomain.com)
- 🔹 SSL/TLS 인증서 (HTTPS 사용 시)
- 🔹 방화벽 설정 권한

---

## 1단계: 서버 준비

### 1-1. 서버 접속

```bash
# SSH로 서버 접속
ssh username@your-server-ip

# 예시
ssh admin@192.168.1.100
```

### 1-2. 시스템 업데이트

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Rocky Linux/CentOS
sudo dnf update -y
```

### 1-3. 필수 패키지 설치

```bash
# Ubuntu/Debian
sudo apt install -y git curl wget nano

# Rocky Linux/CentOS
sudo dnf install -y git curl wget nano
```

### 1-4. 포트 확인

```bash
# 필요한 포트가 사용 가능한지 확인
sudo lsof -i :5001    # 웹 애플리케이션
sudo lsof -i :3306    # MariaDB (외부 접근 시)

# 또는
sudo netstat -tulpn | grep -E ':(5001|3306)'
```

**사용 중이라면** 다른 포트를 사용하거나 해당 서비스를 중지해야 합니다.

---

## 2단계: Docker 설치

### 2-1. Ubuntu/Debian

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

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 변경사항 적용 (재로그인 또는)
newgrp docker

# Docker 서비스 시작 및 활성화
sudo systemctl start docker
sudo systemctl enable docker
```

### 2-2. Rocky Linux/CentOS

```bash
# Docker 저장소 추가
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Docker 설치
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker

# Docker 서비스 시작 및 활성화
sudo systemctl start docker
sudo systemctl enable docker
```

### 2-3. 설치 확인

```bash
# Docker 버전 확인
docker --version
# 예상 출력: Docker version 24.0.x, build xxxxx

# Docker Compose 버전 확인
docker compose version
# 예상 출력: Docker Compose version v2.x.x

# 테스트 컨테이너 실행
docker run hello-world
# "Hello from Docker!" 메시지가 표시되면 성공
```

---

## 3단계: 프로젝트 다운로드

### 3-1. 작업 디렉토리 생성

```bash
# 홈 디렉토리로 이동
cd ~

# 또는 특정 위치 (예: /opt)
# cd /opt
# sudo mkdir -p /opt/applications
# cd /opt/applications
```

### 3-2. GitHub에서 클론

```bash
# HTTPS 방식 (권장)
git clone https://github.com/your-username/customer-storage.git

# 또는 SSH 방식 (SSH 키 설정 필요)
# git clone git@github.com:your-username/customer-storage.git
```

### 3-3. 프로젝트 디렉토리 이동

```bash
cd customer-storage

# 디렉토리 구조 확인
ls -la
# docs/, app/, migrations/, docker-compose.yml 등이 보여야 함
```

---

## 4단계: 환경 설정

### 4-1. 환경 변수 파일 생성

```bash
# env.example을 .env로 복사
cp docs/env.example .env
```

### 4-2. SECRET_KEY 생성

```bash
# Python으로 랜덤 SECRET_KEY 생성
python3 -c "import secrets; print(secrets.token_hex(32))"

# 출력 예시
# 4f8b9c2d1e6a7f3b5c9d2e8a1f7b3c6d9e2a5f8b1c4d7e0a3f6b9c2d5e8a1f4

# 이 값을 복사해두세요!
```

### 4-3. 데이터베이스 비밀번호 생성

```bash
# 강력한 비밀번호 생성 (선택 1: OpenSSL)
openssl rand -base64 24

# 또는 (선택 2: Python)
python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(20)))"

# 출력 예시
# Xy9Kp2@mN5vL#8qR3tW!

# 두 개의 비밀번호를 생성하세요:
# 1. DB_ROOT_PASSWORD용
# 2. DB_PASSWORD용
```

### 4-4. .env 파일 편집

```bash
# nano 에디터로 열기
nano .env

# 또는 vi
# vi .env
```

**최소한 다음 값들을 변경하세요:**

```bash
# Flask 설정
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=4f8b9c2d1e6a7f3b5c9d2e8a1f7b3c6d9e2a5f8b1c4d7e0a3f6b9c2d5e8a1f4  # ← 위에서 생성한 값

# 데이터베이스 설정
DB_ROOT_PASSWORD=YourStrongRootPassword@2024!  # ← 생성한 비밀번호 1
DB_NAME=customer_db
DB_USER=customer_user
DB_PASSWORD=YourStrongUserPassword@2024!  # ← 생성한 비밀번호 2

# 파일 업로드 설정 (필요시 변경)
MAX_UPLOAD_SIZE=16777216  # 16MB
ALLOWED_EXTENSIONS=pdf
```

**저장 방법:**
- nano: `Ctrl + X` → `Y` → `Enter`
- vi: `ESC` → `:wq` → `Enter`

### 4-5. 파일 권한 설정

```bash
# .env 파일 권한 (보안상 중요!)
chmod 600 .env

# 확인
ls -la .env
# -rw------- 형태여야 함 (소유자만 읽기/쓰기)
```

### 4-6. 필요한 디렉토리 생성

```bash
# 이미 있을 수 있지만 확실하게 생성
mkdir -p data/mariadb
mkdir -p uploads
mkdir -p logs

# 권한 설정
chmod 755 uploads logs
```

---

## 5단계: 실행 및 확인

### 5-1. Docker 이미지 빌드

```bash
# 백그라운드에서 빌드 및 실행
docker compose up -d

# 진행 상황 확인 (처음이라 시간 소요)
# - Python 이미지 다운로드
# - MariaDB 이미지 다운로드
# - Flask 애플리케이션 빌드
```

**예상 소요 시간:** 3-10분 (네트워크 속도에 따라)

### 5-2. 컨테이너 상태 확인

```bash
# 컨테이너 목록 및 상태
docker compose ps

# 예상 출력:
# NAME              STATUS          PORTS
# customer_db       Up (healthy)    0.0.0.0:3306->3306/tcp
# customer_web      Up              0.0.0.0:5001->5000/tcp
```

**주의:** `customer_db`가 `healthy` 상태가 될 때까지 기다려야 합니다 (약 30초).

### 5-3. 로그 확인

```bash
# 전체 로그 확인
docker compose logs

# 실시간 로그 모니터링
docker compose logs -f

# 특정 서비스 로그만
docker compose logs web
docker compose logs db

# Ctrl + C로 종료
```

**정상 동작 확인:**
- ❌ 에러 메시지가 없어야 함
- ✅ "Running on http://0.0.0.0:5000" 메시지 확인
- ✅ 데이터베이스 연결 성공 메시지

### 5-4. 데이터베이스 초기화 확인

```bash
# 데이터베이스 접속 테스트
docker compose exec db mysql -u root -p

# 비밀번호 입력 (DB_ROOT_PASSWORD)
# MySQL 프롬프트가 나타나면 성공

# 데이터베이스 확인
SHOW DATABASES;
# customer_db가 보여야 함

# customer_db 선택
USE customer_db;

# 테이블 확인
SHOW TABLES;
# users, customers, documents 등이 보여야 함

# 종료
exit;
```

### 5-5. 방화벽 설정 (필요시)

#### Ubuntu (UFW)

```bash
# 방화벽 상태 확인
sudo ufw status

# 5001 포트 허용
sudo ufw allow 5001/tcp

# 방화벽 활성화 (비활성화 상태라면)
sudo ufw enable
```

#### Rocky Linux/CentOS (firewalld)

```bash
# 방화벽 상태 확인
sudo firewall-cmd --state

# 5001 포트 허용
sudo firewall-cmd --permanent --add-port=5001/tcp
sudo firewall-cmd --reload

# 확인
sudo firewall-cmd --list-ports
```

### 5-6. 웹 애플리케이션 접속 테스트

```bash
# 로컬에서 테스트
curl http://localhost:5001

# 또는
curl http://127.0.0.1:5001

# HTML 코드가 출력되면 성공!
```

**외부에서 접속:**
- 브라우저를 열고 `http://서버IP:5001` 입력
- 예: `http://192.168.1.100:5001`
- 로그인 페이지가 보이면 성공! 🎉

---

## 6단계: 초기 설정

### 6-1. 첫 로그인

1. **브라우저에서 접속**
   ```
   http://서버IP:5001
   ```

2. **기본 관리자 계정으로 로그인**
   ```
   계정 ID: admin
   비밀번호: password1!
   ```

3. **자동 리다이렉트**
   - 로그인하면 자동으로 "새 슈퍼관리자 생성" 페이지로 이동됩니다

### 6-2. 새 슈퍼관리자 생성

**입력 정보:**
- **계정 ID**: (원하는 ID, "admin" 제외)
- **이름**: 실명 또는 표시명
- **이메일**: (선택사항)
- **패스워드**:
  - 최소 8자 이상
  - 대문자 포함
  - 숫자 포함
  - 특수문자 포함

**예시:**
```
계정 ID: superadmin
이름: 홍길동
이메일: admin@example.com
패스워드: SecurePass@2024!
```

### 6-3. 새 계정으로 로그인

1. 계정 생성 완료 후 자동 로그아웃됨
2. 방금 생성한 계정으로 다시 로그인
3. 대시보드 페이지가 보이면 성공!

### 6-4. 기본 admin 계정 확인

```bash
# 데이터베이스에서 확인
docker compose exec db mysql -u root -p${DB_ROOT_PASSWORD} customer_db -e "SELECT username, is_active FROM users WHERE username='admin';"

# 출력:
# username | is_active
# admin    | 0          (비활성화됨)
```

---

## 7단계: 운영 설정 (선택)

### 7-1. 자동 시작 설정

시스템 재부팅 시 자동으로 시작하도록 설정:

```bash
# systemd 서비스 파일 생성
sudo nano /etc/systemd/system/customer-storage.service
```

**내용:**
```ini
[Unit]
Description=Customer Storage Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/username/customer-storage
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=username

[Install]
WantedBy=multi-user.target
```

**주의:** `WorkingDirectory`와 `User`를 실제 경로와 사용자명으로 변경!

```bash
# 서비스 활성화
sudo systemctl daemon-reload
sudo systemctl enable customer-storage.service
sudo systemctl start customer-storage.service

# 상태 확인
sudo systemctl status customer-storage.service
```

### 7-2. 백업 설정

자동 백업 스크립트 생성:

```bash
# 백업 스크립트 생성
nano ~/backup-customer-storage.sh
```

**내용:**
```bash
#!/bin/bash

# 설정
BACKUP_DIR="/backup/customer-storage"
PROJECT_DIR="/home/username/customer-storage"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"

# 백업 디렉토리 생성
mkdir -p ${BACKUP_PATH}

# 데이터베이스 백업
cd ${PROJECT_DIR}
docker compose exec -T db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} | gzip > ${BACKUP_PATH}/database.sql.gz

# 업로드 파일 백업
tar -czf ${BACKUP_PATH}/uploads.tar.gz uploads/

# 설정 파일 백업
cp .env ${BACKUP_PATH}/

# 오래된 백업 삭제 (30일 이상)
find ${BACKUP_DIR} -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: ${BACKUP_PATH}"
```

```bash
# 실행 권한 부여
chmod +x ~/backup-customer-storage.sh

# 테스트 실행
./backup-customer-storage.sh

# 크론탭 설정 (매일 새벽 2시)
crontab -e

# 추가:
0 2 * * * /home/username/backup-customer-storage.sh >> /var/log/customer-backup.log 2>&1
```

### 7-3. 모니터링 설정

리소스 사용량 모니터링:

```bash
# 실시간 모니터링
docker stats

# 또는 watch 명령어로
watch -n 2 docker stats --no-stream
```

### 7-4. 로그 로테이션

```bash
# Docker 로그 크기 제한 (docker-compose.yml 수정)
nano docker-compose.yml
```

각 서비스에 추가:
```yaml
services:
  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  db:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
```

적용:
```bash
docker compose down
docker compose up -d
```

---

## 문제 해결

### 문제 1: "port is already allocated" 에러

**증상:**
```
Error response from daemon: driver failed programming external connectivity on endpoint customer_web: Bind for 0.0.0.0:5001 failed: port is already allocated
```

**해결:**

```bash
# 포트 사용 프로세스 확인
sudo lsof -i :5001

# 프로세스 종료
sudo kill -9 <PID>

# 또는 docker-compose.yml에서 포트 변경
nano docker-compose.yml
# ports: "5002:5000"  # 5001 -> 5002로 변경

docker compose up -d
```

### 문제 2: 데이터베이스 연결 실패

**증상:**
```
Can't connect to MySQL server on 'db'
```

**해결:**

```bash
# DB 컨테이너 상태 확인
docker compose ps db

# DB 로그 확인
docker compose logs db

# DB가 healthy 상태가 될 때까지 대기 (최대 1분)
sleep 60

# 웹 컨테이너 재시작
docker compose restart web
```

### 문제 3: 권한 에러

**증상:**
```
Permission denied: '/app/uploads'
```

**해결:**

```bash
# 디렉토리 권한 확인
ls -ld uploads/

# 권한 수정
chmod 755 uploads/
sudo chown -R $USER:$USER uploads/

# 컨테이너 재시작
docker compose restart web
```

### 문제 4: 메모리 부족

**증상:**
```
Cannot allocate memory
```

**해결:**

```bash
# 메모리 사용량 확인
free -h

# 스왑 공간 추가 (임시 해결)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 또는 docker-compose.yml에서 리소스 제한
services:
  web:
    deploy:
      resources:
        limits:
          memory: 1G
```

### 문제 5: 로그인이 안 됨

**원인:** 브라우저 쿠키/세션 문제

**해결:**

1. 브라우저 캐시 삭제
2. 시크릿/프라이빗 모드로 접속
3. 다른 브라우저로 시도
4. 서버 시간 확인:
```bash
date
# 시간이 맞지 않으면 동기화
sudo timedatectl set-ntp true
```

---

## ✅ 배포 완료 체크리스트

설치가 완료되었는지 확인하세요:

- [ ] Docker 및 Docker Compose 설치 완료
- [ ] 프로젝트 다운로드 완료
- [ ] .env 파일 생성 및 모든 비밀번호 변경
- [ ] SECRET_KEY 무작위 문자열로 설정
- [ ] FLASK_DEBUG=False 설정
- [ ] 컨테이너 정상 실행 (`docker compose ps`로 확인)
- [ ] 데이터베이스 연결 확인
- [ ] 웹 페이지 접속 확인 (http://서버IP:5001)
- [ ] 새 슈퍼관리자 계정 생성 완료
- [ ] 기본 admin 계정 비활성화 확인
- [ ] 방화벽 설정 (필요시)
- [ ] 자동 시작 설정 (선택)
- [ ] 백업 설정 (선택)

---

## 📚 추가 자료

- [환경 설정 가이드](SETUP_GUIDE.md) - 상세한 환경별 설정
- [Docker 컨테이너 가이드](DOCKER_CONTAINER_GUIDE.md) - Docker 명령어 및 운영
- [환경 변수 참조](ENV_VARIABLES.md) - .env 파일 상세 설명
- [Docker 설정 가이드](DOCKER_GUIDE.md) - Docker 파일 수정 방법

---

## 🆘 도움이 필요하신가요?

1. **로그 확인**: `docker compose logs -f`
2. **문서 검색**: [docs 폴더](README.md)의 FAQ 섹션
3. **GitHub Issues**: 문제를 보고하거나 질문하기

---

**🎉 배포 성공을 축하합니다!**
