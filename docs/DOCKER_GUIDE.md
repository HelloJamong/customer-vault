# Docker 설정 가이드

이 문서는 Docker와 Docker Compose를 사용하여 고객사 관리 시스템을 구성하는 방법을 설명합니다.

## 📋 목차

1. [Docker 개요](#docker-개요)
2. [Dockerfile 설정](#dockerfile-설정)
3. [docker-compose.yml 설정](#docker-composeyml-설정)
4. [Docker 파일 수정 방법](#docker-파일-수정-방법)
5. [커스텀 설정](#커스텀-설정)
6. [문제 해결](#문제-해결)

---

## Docker 개요

### 아키텍처

이 시스템은 2개의 Docker 컨테이너로 구성됩니다:

```
┌─────────────────────────────────────┐
│         Docker Network              │
│      (customer_network)             │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  web         │  │    db       │ │
│  │  (Flask)     │←→│  (MariaDB)  │ │
│  │  Port: 5000  │  │  Port: 3306 │ │
│  └──────────────┘  └─────────────┘ │
│         ↓                           │
└─────────┼───────────────────────────┘
          ↓
    Host: 5001
```

### 컨테이너 구성

| 컨테이너 | 이미지 | 역할 | 포트 매핑 |
|---------|--------|------|----------|
| `customer_web` | 커스텀 (Dockerfile) | Flask 웹 애플리케이션 | 5001:5000 |
| `customer_db` | mariadb:10.11 | MariaDB 데이터베이스 | 3306:3306 |

---

## Dockerfile 설정

### 현재 Dockerfile 분석

프로젝트 루트의 `Dockerfile`을 확인해봅시다:

```dockerfile
# Dockerfile의 주요 구조
FROM python:3.9-slim          # 베이스 이미지
WORKDIR /app                  # 작업 디렉토리
COPY requirements.txt .       # 의존성 파일 복사
RUN pip install -r requirements.txt  # Python 패키지 설치
COPY app/ .                   # 애플리케이션 코드 복사
CMD ["python", "app.py"]      # 실행 명령
```

### Dockerfile 수정하기

#### 1. Python 버전 변경

다른 Python 버전이 필요한 경우:

```dockerfile
# Python 3.11 사용
FROM python:3.11-slim

# 또는 특정 마이너 버전
FROM python:3.9.18-slim
```

#### 2. 시스템 패키지 추가

추가 시스템 라이브러리가 필요한 경우:

```dockerfile
FROM python:3.9-slim

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# ... 나머지 설정
```

#### 3. 타임존 설정 추가

한국 시간대를 사용하려면:

```dockerfile
FROM python:3.9-slim

# 타임존 설정
ENV TZ=Asia/Seoul
RUN apt-get update && apt-get install -y tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# ... 나머지 설정
```

#### 4. 최적화된 Dockerfile 예시

```dockerfile
FROM python:3.9-slim

# 타임존 설정
ENV TZ=Asia/Seoul
ENV PYTHONUNBUFFERED=1

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 먼저 복사 및 설치 (캐싱 최적화)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY app/ .

# 포트 노출
EXPOSE 5000

# 실행 명령
CMD ["python", "app.py"]
```

#### 5. Dockerfile 빌드 테스트

```bash
# Dockerfile 수정 후 빌드 테스트
docker build -t customer-web-test .

# 테스트 이미지로 컨테이너 실행
docker run --rm -p 5001:5000 customer-web-test

# 문제가 없으면 docker-compose로 재빌드
docker-compose build --no-cache web
```

---

## docker-compose.yml 설정

### 현재 구성 분석

```yaml
version: '3.8'

services:
  db:
    image: mariadb:10.11
    # ... 데이터베이스 설정

  web:
    build: .
    # ... 웹 애플리케이션 설정
```

### 주요 설정 섹션

#### 1. 데이터베이스 서비스 (db)

```yaml
db:
  image: mariadb:10.11              # MariaDB 버전
  container_name: customer_db       # 컨테이너 이름
  restart: always                   # 자동 재시작 정책
  environment:                      # 환경 변수
    MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    MYSQL_DATABASE: ${DB_NAME}
    MYSQL_USER: ${DB_USER}
    MYSQL_PASSWORD: ${DB_PASSWORD}
  volumes:                          # 볼륨 마운트
    - ./data/mariadb:/var/lib/mysql
  ports:                            # 포트 매핑
    - "3306:3306"
  networks:                         # 네트워크
    - customer_network
  healthcheck:                      # 헬스체크
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    timeout: 5s
    retries: 10
```

#### 2. 웹 애플리케이션 서비스 (web)

```yaml
web:
  build: .                          # Dockerfile로 빌드
  container_name: customer_web
  restart: always
  environment:
    FLASK_APP: app.py
    FLASK_ENV: ${FLASK_ENV}
    DB_HOST: db                     # 서비스명으로 접근
    # ... 기타 환경 변수
  volumes:
    - ./app:/app                    # 코드 동기화
    - ./uploads:/app/uploads        # 파일 업로드
    - ./logs:/app/logs              # 로그
  ports:
    - "5001:5000"
  depends_on:                       # 의존성
    db:
      condition: service_healthy
  networks:
    - customer_network
```

---

## Docker 파일 수정 방법

### 일반적인 수정 시나리오

#### 1. 포트 변경

호스트의 5001 포트가 이미 사용 중인 경우:

```yaml
services:
  web:
    ports:
      - "5002:5000"  # 호스트 포트를 5002로 변경
```

데이터베이스 외부 접근 포트 변경:

```yaml
services:
  db:
    ports:
      - "3307:3306"  # 호스트 포트를 3307로 변경
```

#### 2. MariaDB 버전 변경

```yaml
services:
  db:
    image: mariadb:10.11  # 현재
    # image: mariadb:11.0  # 새 버전
    # image: mariadb:10.6  # 구 버전
```

⚠️ **주의:** 버전 변경 시 데이터 백업 필수!

#### 3. 리소스 제한 설정

메모리와 CPU 사용량을 제한하려면:

```yaml
services:
  web:
    build: .
    deploy:
      resources:
        limits:
          cpus: '2'        # 최대 2 CPU
          memory: 2G       # 최대 2GB RAM
        reservations:
          cpus: '0.5'      # 최소 0.5 CPU
          memory: 512M     # 최소 512MB RAM

  db:
    image: mariadb:10.11
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 1G
```

#### 4. 볼륨 설정 변경

외부 볼륨 사용:

```yaml
services:
  db:
    volumes:
      # 상대 경로 대신 명명된 볼륨 사용
      - mariadb_data:/var/lib/mysql
      # 또는 절대 경로
      # - /data/mariadb:/var/lib/mysql

volumes:
  mariadb_data:
    driver: local
```

#### 5. 네트워크 설정

고정 IP 할당:

```yaml
services:
  db:
    networks:
      customer_network:
        ipv4_address: 172.20.0.2

  web:
    networks:
      customer_network:
        ipv4_address: 172.20.0.3

networks:
  customer_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 6. 로깅 설정

로그 크기 제한:

```yaml
services:
  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"      # 최대 10MB
        max-file: "3"        # 최대 3개 파일

  db:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
```

---

## 커스텀 설정

### 개발 환경 vs 운영 환경

#### 개발 환경 (docker-compose.dev.yml)

```yaml
version: '3.8'

services:
  db:
    image: mariadb:10.11
    container_name: customer_db_dev
    environment:
      MYSQL_ROOT_PASSWORD: devroot
      MYSQL_DATABASE: customer_db_dev
      # ... 개발용 설정
    ports:
      - "3306:3306"  # 외부 접근 허용

  web:
    build: .
    container_name: customer_web_dev
    environment:
      FLASK_DEBUG: "True"
      FLASK_ENV: development
    volumes:
      - ./app:/app  # 코드 핫 리로드
    ports:
      - "5001:5000"
    command: python app.py  # 개발 서버
```

사용 방법:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

#### 운영 환경 (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  db:
    image: mariadb:10.11
    container_name: customer_db_prod
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      # ... 운영용 설정
    ports:
      - "127.0.0.1:3306:3306"  # 로컬호스트만 접근
    deploy:
      resources:
        limits:
          memory: 4G

  web:
    build: .
    container_name: customer_web_prod
    environment:
      FLASK_DEBUG: "False"
      FLASK_ENV: production
    # volumes 없음 (코드 변경 방지)
    ports:
      - "127.0.0.1:5001:5000"  # 로컬호스트만 접근
    deploy:
      resources:
        limits:
          memory: 2G
    # Nginx와 연동 시
    # expose:
    #   - "5000"
```

### Nginx 리버스 프록시 추가

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: customer_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    networks:
      - customer_network

  web:
    # expose만 설정 (외부 직접 접근 차단)
    expose:
      - "5000"
    # ports 제거
```

---

## 문제 해결

### 빌드 오류

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 특정 서비스만 빌드
docker-compose build --no-cache web

# BuildKit 사용 (더 빠른 빌드)
DOCKER_BUILDKIT=1 docker-compose build
```

### 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs web
docker-compose logs db

# 컨테이너 상태 확인
docker-compose ps

# 상세 정보 확인
docker inspect customer_web
docker inspect customer_db
```

### 네트워크 문제

```bash
# 네트워크 목록 확인
docker network ls

# 네트워크 상세 정보
docker network inspect customer-storage_customer_network

# 네트워크 재생성
docker-compose down
docker network prune
docker-compose up -d
```

### 볼륨 문제

```bash
# 볼륨 목록
docker volume ls

# 볼륨 상세 정보
docker volume inspect customer-storage_mariadb_data

# 미사용 볼륨 정리
docker volume prune
```

### 포트 충돌

```bash
# 포트 사용 확인 (Linux/macOS)
lsof -i :5001
lsof -i :3306

# 포트 사용 확인 (Windows)
netstat -ano | findstr :5001
netstat -ano | findstr :3306

# docker-compose.yml에서 포트 변경 후 재시작
docker-compose down
docker-compose up -d
```

### 데이터베이스 연결 실패

```bash
# DB 컨테이너가 준비될 때까지 대기
docker-compose up -d db
# 30초 대기
sleep 30
docker-compose up -d web

# 헬스체크 확인
docker-compose ps
# db의 STATUS가 "healthy"인지 확인
```

---

## 유용한 Docker 명령어

### 컨테이너 관리

```bash
# 전체 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart web

# 컨테이너 중지 후 제거
docker-compose down

# 볼륨까지 삭제
docker-compose down -v

# 이미지까지 삭제
docker-compose down --rmi all
```

### 로그 및 모니터링

```bash
# 실시간 로그 확인
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f web

# 마지막 100줄만
docker-compose logs --tail=100 web

# 타임스탬프 포함
docker-compose logs -t web
```

### 컨테이너 접속

```bash
# 웹 컨테이너 접속
docker-compose exec web bash

# 데이터베이스 접속
docker-compose exec db mysql -u root -p

# 루트 권한으로 접속
docker-compose exec -u root web bash
```

### 리소스 사용량 확인

```bash
# 컨테이너 리소스 사용량
docker stats

# 특정 컨테이너만
docker stats customer_web customer_db

# 디스크 사용량
docker system df
```

---

## 참고 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [MariaDB Docker Hub](https://hub.docker.com/_/mariadb)
- [Python Docker Hub](https://hub.docker.com/_/python)

---

**다음 문서:** [Docker 컨테이너 환경 구성 가이드](DOCKER_CONTAINER_GUIDE.md)
