# DB 마이그레이션 및 배포 가이드

Customer Vault는 Prisma migration 파일을 Git과 Docker 이미지에 포함해 운영 DB 스키마를 관리합니다.

## 현재 운영 원칙

- 운영 DB에는 Prisma migration 파일을 순서대로 적용합니다.
- 이미 적용된 migration SQL은 수정하지 않고 새 디렉터리를 추가합니다.
- 프로덕션 컨테이너에서는 migration 파일이 없을 때 db push로 대체하지 않습니다.
- migration 실패 시 애플리케이션은 기동하지 않으며 DB를 자동 롤백하지 않습니다.
- 현재 기준 migration:
  - 20260918000000_initial
  - 20260918010000_session_timeout
- 기존 암호화 데이터와 백업을 읽기 위해 ENCRYPTION_KEY와 BACKUP_ENCRYPTION_KEY를 유지해야 합니다.

## 컨테이너 기동 시 자동 적용

정상적인 신규 설치 또는 migration 이력이 이미 있는 기존 설치에서는 Backend entrypoint가 다음을 실행합니다.

~~~bash
npx prisma migrate deploy
~~~

상태 확인:

~~~bash
docker compose exec backend npx prisma migrate status
docker compose logs backend --tail=100
curl --fail http://127.0.0.1:2082/api/health
~~~

정상 상태는 Database schema is up to date와 database: connected입니다.

## 개발 환경에서 migration 생성

1. schema.prisma를 변경합니다.
2. 개발 DB에서 migration을 생성합니다.

~~~bash
./scripts/create-migration.sh "change_description"
~~~

또는 backend 디렉터리에서 직접 실행합니다.

~~~bash
cd backend
npx prisma migrate dev --name change_description
npx prisma generate
~~~

3. 생성된 SQL을 검토합니다.

~~~bash
find backend/prisma/migrations -maxdepth 2 -type f -name migration.sql -print
cat backend/prisma/migrations/<timestamp>_<name>/migration.sql
~~~

4. Backend 테스트와 빌드를 수행합니다.

~~~bash
npm run lint
npm run build
npm run test:security
npm run test:e2e
~~~

5. schema.prisma, migration 디렉터리, migration_lock.toml을 함께 커밋합니다.

> migration 디렉터리는 .gitignore로 제외하지 않습니다. migration 파일이 누락된 이미지는 운영 배포 대상이 아닙니다.

## 기존 운영 DB의 기준점 처리

과거 버전에서 migration history 없이 db push로 운영된 DB는 일반적인 docker compose up만으로 업그레이드하지 않습니다. 먼저 오프라인 업그레이드 스크립트의 사전 점검을 사용합니다.

스크립트는 다음을 수행합니다.

1. 이미지 아카이브와 필수 환경변수 검증
2. 기존 DB의 암호화 백업 생성
3. 새 Compose와 이미지 적용
4. migration deploy 실행
5. P3005로 기존 migration history가 없음을 확인한 경우에만 초기 기준 migration을 resolve --applied 처리
6. 이후 보류된 migration 적용
7. Backend와 Proxy health check
8. 애플리케이션 기동 실패 시 Compose와 .env 복원

DB를 자동 복원하지 않는 이유는 새 버전에서 이미 적용된 데이터 변경을 되돌리면 추가 손상이 발생할 수 있기 때문입니다. 복원은 백업과 키를 검증한 후 운영 절차에 따라 별도로 수행합니다.

## 오프라인 기존 설치 업그레이드

Release 자산으로 다음을 준비합니다.

- docker-compose.yml
- customer-vault-images-<버전>.tar.gz
- offline-upgrade.sh
- 기존 운영 서버의 .env

~~~bash
chmod +x offline-upgrade.sh
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer-vault-26.9.0 \
  --version 26.9.0
~~~

확인 없이 실행하는 자동화 환경:

~~~bash
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer-vault-26.9.0 \
  --version 26.9.0 \
  --yes
~~~

실행 전 검증만 하는 경우:

~~~bash
./offline-upgrade.sh \
  --app-dir /opt/customer-vault \
  --package-dir /mnt/usb/customer-vault-26.9.0 \
  --version 26.9.0 \
  --dry-run
~~~

기존 설치의 .env에는 다음 값이 이미 있어야 합니다.

- JWT_SECRET: 32자 이상
- ENCRYPTION_KEY: 64자리 hex
- BACKUP_ENCRYPTION_KEY: 64자리 hex이며 ENCRYPTION_KEY와 다른 값

백업 위치는 애플리케이션 디렉터리의 상위 경로인 customer-vault-upgrade-backups/<시각>-<버전>/입니다. DB와 애플리케이션 파일은 .enc로 저장되며 체크섬 파일도 함께 생성됩니다.

## 신규 오프라인 설치

신규 설치는 이미지 번들을 로드하고 env.example을 운영 .env로 복사합니다.

~~~bash
docker load -i customer-vault-images-26.9.0.tar.gz
cp env.example .env
vi .env
docker compose up -d
docker compose exec backend npx prisma migrate status
curl --fail http://127.0.0.1:2082/api/health
~~~

export-package.sh로 만든 전체 패키지를 사용하는 경우에는 패키지 안의 images.tar와 docker-compose.yml을 사용합니다.

~~~bash
docker load -i images.tar
cp .env.example .env
vi .env
docker compose up -d
~~~

## 백업·복원 주의사항

- DB와 문서 백업은 BACKUP_ENCRYPTION_KEY로 AES-256-GCM 암호화됩니다.
- ENCRYPTION_KEY는 서버 접속정보·SFTP 자격증명 암호화에 사용됩니다.
- 두 키를 동일하게 사용하지 않습니다.
- 키를 변경하거나 잃으면 기존 암호화 데이터·백업을 복호화할 수 없습니다.
- 복원 시 평문 비밀번호를 명령행 인자로 전달하지 말고 DB 클라이언트의 안전한 인증 설정을 사용합니다.
- migration 실패 후에는 서비스 로그와 migration status를 보존하고, 백업 검증 후 별도 복원합니다.

## 운영 점검 체크리스트

~~~bash
docker compose ps
docker compose logs backend --tail=100
docker compose exec backend npx prisma migrate status
curl --fail http://127.0.0.1:2082/api/health
~~~

확인 항목:

- Backend와 DB가 healthy인지 확인
- migration status가 up to date인지 확인
- 신규 업로드가 ClamAV 검사 후 저장되는지 확인
- 백업 파일이 .enc로 생성되는지 확인
- 로그인 후 초기 비밀번호 변경과 세션 타임아웃 정책을 확인
- 실패 시 생성된 백업과 migration-preflight.log를 별도 보관

## 참고

- 오프라인 배포: offline_deployment_guide.md
- 릴리즈 절차: RELEASE_GUIDE.md
- Backend 테스트: backend_testing.md
- Prisma schema: ../backend/prisma/schema.prisma
- Migration entrypoint: ../backend/docker-entrypoint.sh
