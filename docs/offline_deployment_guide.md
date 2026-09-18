# 오프라인 환경 배포 가이드

Customer Vault를 인터넷이 없는 운영 서버에 신규 설치하거나 기존 설치에서 업그레이드하는 방법입니다.

## 배포 파일

GitHub Release에서 버전별로 다음 파일을 제공합니다.

- docker-compose.yml
- env.example
- customer-vault-images-<버전>.tar.gz
- offline-upgrade.sh

이미지 번들은 Backend, Frontend, MariaDB, Nginx, ClamAV를 포함합니다. 폐쇄망 서버에는 Docker Engine과 Docker Compose v2가 미리 설치되어 있어야 합니다.

## 신규 설치

### 1. 파일 반입

온라인 환경에서 Release 파일을 다운로드해 USB 등으로 운영 서버에 반입합니다.

~~~bash
V=26.9.0
mkdir -p /opt/customer-vault-$V
cd /opt/customer-vault-$V
~~~

### 2. 이미지 로드와 환경 설정

~~~bash
docker load -i customer-vault-images-$V.tar.gz
cp env.example .env
vi .env
~~~

운영 환경에서 반드시 설정할 값:

- NODE_ENV=production
- VERSION=26.9.0
- DB_ROOT_PASSWORD
- DB_PASSWORD
- INITIAL_ADMIN_PASSWORD
- JWT_SECRET
- ENCRYPTION_KEY
- BACKUP_ENCRYPTION_KEY
- CORS_ORIGIN
- PROXY_PORT

ENCRYPTION_KEY와 BACKUP_ENCRYPTION_KEY는 서로 다른 64자리 hex 값이어야 합니다. 두 키는 백업 파일과 분리된 보안 저장소에 보관합니다.

### 3. 서비스 시작

~~~bash
docker compose up -d
docker compose ps
docker compose exec backend npx prisma migrate status
curl --fail http://127.0.0.1:2082/api/health
~~~

Backend entrypoint가 커밋된 Prisma migration을 자동 적용합니다. ClamAV가 healthy가 되지 않으면 신규 파일 업로드는 차단됩니다.

## 기존 설치 업그레이드

### 1. 사전 준비

기존 운영 디렉터리의 다음 값을 보존합니다.

- .env
- data/mariadb
- uploads
- logs
- backups
- proxy/nginx.conf

특히 기존 ENCRYPTION_KEY와 BACKUP_ENCRYPTION_KEY를 변경하지 않습니다.

Release에서 다음 파일을 기존 운영 서버 또는 별도 작업 디렉터리로 반입합니다.

- docker-compose.yml
- customer-vault-images-<버전>.tar.gz
- offline-upgrade.sh

### 2. Dry run

~~~bash
chmod +x offline-upgrade.sh
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer-vault-26.9.0 \
  --version 26.9.0 \
  --dry-run
~~~

### 3. 업그레이드 실행

~~~bash
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer-vault-26.9.0 \
  --version 26.9.0
~~~

자동화 환경에서는 --yes를 추가할 수 있습니다.

~~~bash
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer-vault-26.9.0 \
  --version 26.9.0 \
  --yes
~~~

스크립트는 다음 순서로 동작합니다.

1. .env의 JWT_SECRET, ENCRYPTION_KEY, BACKUP_ENCRYPTION_KEY 검증
2. 이미지 번들 무결성·필수 이미지 확인
3. MariaDB와 애플리케이션 파일 암호화 백업
4. 기존 서비스 종료 및 Compose 파일 교체
5. migration 사전 적용
6. 서비스 시작과 Backend/Proxy health check
7. 실패 시 Compose와 .env 복원

DB는 자동 복원하지 않습니다. 업그레이드 전 생성된 .enc 백업과 체크섬을 보관하고, 복원이 필요할 때 백업 키를 검증한 뒤 별도 절차로 복원합니다.

## export-package.sh로 전체 패키지 생성

온라인 개발 서버에서 저장소 전체와 migration 파일이 포함된 패키지를 만들 수 있습니다.

~~~bash
./scripts/export-package.sh 26.9.0
~~~

생성물:

~~~text
customer_vault_26.9.0_package.tar.gz
└── customer_vault_26.9.0_package/
    ├── images.tar
    ├── docker-compose.yml
    ├── proxy/
    ├── prisma/
    ├── DEPLOYMENT_GUIDE.md
    ├── MIGRATIONS.md
    └── import-package.sh
~~~

오프라인 서버에서는 패키지를 풀고 images.tar를 로드합니다.

~~~bash
tar -xzf customer_vault_26.9.0_package.tar.gz
cd customer_vault_26.9.0_package
docker load -i images.tar
cp .env.example .env
vi .env
docker compose up -d
~~~

기존 설치 업그레이드에는 Release의 offline-upgrade.sh를 우선 사용합니다. 전체 패키지의 images.tar를 사용할 경우 다음처럼 이미지 파일을 명시할 수 있습니다.

~~~bash
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer_vault_26.9.0_package \
  --images /mnt/usb/customer_vault_26.9.0_package/images.tar \
  --version 26.9.0
~~~

## 문제 해결

### 이미지가 없는 경우

~~~bash
docker images
docker load -i customer-vault-images-26.9.0.tar.gz
~~~

Compose의 이미지 이름과 실제 로드된 이미지 태그가 일치하는지 확인합니다.

### Backend가 기동하지 않는 경우

~~~bash
docker compose logs backend --tail=200
docker compose exec backend npx prisma migrate status
~~~

필수 환경변수, migration 실패, ClamAV 연결 실패를 순서대로 확인합니다.

### Health check 실패

~~~bash
docker compose ps
curl --fail http://127.0.0.1:2082/api/health
docker compose logs proxy backend db clamav --tail=100
~~~

### 롤백

1. 서비스를 중지합니다.
2. 이전 릴리즈 Compose와 이미지를 복원합니다.
3. DB 복원이 필요하면 .enc 백업을 BACKUP_ENCRYPTION_KEY로 복호화합니다.
4. DB 클라이언트의 안전한 인증 설정을 사용해 복원합니다.
5. 이전 Compose로 서비스를 시작하고 health check를 확인합니다.

Prisma migration은 자동 롤백하지 않습니다. DB 복원은 백업 상태와 데이터 변경 범위를 확인한 뒤 수행합니다.

## 보안 주의사항

- .env와 두 암호화 키를 Git·문서·메신저에 저장하지 않습니다.
- 백업 키를 잃으면 .enc 백업을 복원할 수 없습니다.
- 외부에는 Proxy 포트만 노출하고 DB 3306은 localhost 바인딩을 유지합니다.
- ClamAV를 끄지 않습니다. 운영 환경에서는 검사 실패 시 업로드가 차단됩니다.
- 배포 전후에 migration status와 health endpoint를 확인합니다.

## 참고

- Docker 설정: docker_setup_guide.md
- 마이그레이션: migration_guide.md
- 릴리즈: RELEASE_GUIDE.md
- 원격 백업: backup_remote_setup_guide.md
