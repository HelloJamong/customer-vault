# 고객창고 (Customer-Storage)

내부 고객사 관리 및 유지보수 점검 이력 관리를 위한 웹 기반 시스템

## 기술 스택

- **Backend**: Python Flask
- **Database**: MariaDB 10.11
- **Frontend**: Bootstrap 5, Jinja2 템플릿
- **Container**: Docker & Docker Compose
- **OS**: Rocky Linux 9 (운영 환경)

## 주요 기능

- ✅ 사용자 인증 (로그인/로그아웃)
- ✅ 고객사 정보 관리
- ✅ 점검 문서 업로드 및 관리
- ✅ 점검 이력 조회
- 🚧 대시보드 통계
- 🚧 파일 다운로드
- 🚧 검색 및 필터링

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/customer-storage.git
cd customer-storage
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정
```

### 3. Docker 컨테이너 실행

```bash
# 컨테이너 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4. 애플리케이션 접속

브라우저에서 http://localhost:5001 접속

⚠️ **운영 환경에서는 반드시 비밀번호를 변경하세요!**

## 디렉토리 구조

```
customer-storage/
├── app/                    # Flask 애플리케이션
│   ├── app.py             # 메인 애플리케이션 파일
│   ├── templates/         # HTML 템플릿
│   └── static/            # 정적 파일 (CSS, JS, 이미지)
├── uploads/               # 업로드된 파일 저장
├── data/                  # 데이터베이스 데이터
│   └── mariadb/          # MariaDB 데이터 볼륨
├── nginx/                 # Nginx 설정 (운영 환경용)
├── docker-compose.yml     # Docker Compose 설정
├── Dockerfile            # Flask 앱 Docker 이미지
├── requirements.txt      # Python 패키지 의존성
├── .env.example         # 환경 변수 템플릿
└── README.md            # 프로젝트 문서
```

## Docker 명령어

```bash
# 컨테이너 시작
docker-compose up -d

# 컨테이너 중지
docker-compose down

# 컨테이너 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f web

# 데이터베이스 접속
docker-compose exec db mysql -u customer_user -p customer_db

# Flask 컨테이너 접속
docker-compose exec web bash
```

## 데이터베이스 마이그레이션

새로운 기능 추가 시 데이터베이스 스키마 변경이 필요한 경우:

```bash
# 방법 1: cat과 파이프 사용 (권장)
cat migrations/add_sub_contacts.sql | docker-compose exec -T db mysql -u customer_user -pcustomer_password customer_db

# 방법 2: 파일을 컨테이너로 복사 후 실행
docker cp migrations/add_sub_contacts.sql customer-storage-db-1:/tmp/
docker-compose exec db mysql -u customer_user -pcustomer_password customer_db -e "source /tmp/add_sub_contacts.sql"

# 방법 3: docker exec 직접 사용
docker exec -i customer-storage-db-1 mysql -u customer_user -pcustomer_password customer_db < migrations/add_sub_contacts.sql

# 마이그레이션 확인
docker-compose exec db mysql -u customer_user -pcustomer_password customer_db -e "DESCRIBE customers;"
```

**참고**: 
- `customer_password`는 `.env` 파일의 `DB_PASSWORD` 값으로 변경하세요
- `-T` 옵션은 TTY 할당을 비활성화합니다 (파이프 사용 시 필요)
- 비밀번호를 명령어에 직접 입력하지 않으려면 방법 2를 사용하세요

### 최근 마이그레이션
- `add_sub_contacts.sql`: 고객사 부담당자 필드 추가 (정 1명, 부 3명) 및 사내 부담당 엔지니어 필드 추가

## 운영 환경 배포

### Rocky Linux 9 서버 설정

1. Docker 및 Docker Compose 설치
2. 저장소 클론
3. 환경 변수 설정 (운영용 비밀번호 사용)
4. Docker Compose로 실행

자세한 배포 가이드는 추후 추가 예정

## 개발 참고사항

- 로컬 개발 시 코드 변경사항은 볼륨 마운트로 자동 반영됩니다
- 데이터베이스 변경사항은 `data/mariadb` 디렉토리에 저장됩니다
- 업로드된 파일은 `uploads/` 디렉토리에 저장됩니다

## 보안 주의사항

- `.env` 파일은 Git에 커밋하지 마세요
- 운영 환경에서는 강력한 비밀번호 사용
- SECRET_KEY는 운영 환경에서 반드시 변경
- 업로드 파일 크기 제한 확인
- 허용된 파일 확장자만 업로드 가능하도록 설정

