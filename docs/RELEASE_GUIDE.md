# 릴리즈 가이드

Customer Vault의 버전 작성, 검증, 이미지 배포 및 릴리즈 자산 생성 절차입니다.

## 버전 규칙

버전은 YY.메이저.마이너 형식을 사용합니다.

- YY: 연도 2자리
- 메이저: 신규 기능·정책·호환성 변화가 포함된 릴리즈
- 마이너: 버그 수정·문서·내부 변경 중심의 릴리즈
- 현재 최신 릴리즈: 26.10.2

예시:

~~~text
26.9.0 -> 26.9.1   # 패치/내부 변경
26.9.1 -> 26.10.0  # 다음 메이저 기능 릴리즈
~~~

태그와 Docker 이미지 태그에는 v 접두사를 사용하지 않습니다.

## 릴리즈 전 확인

작업 트리와 버전을 확인합니다.

~~~bash
git status
grep -m 1 -E '^## \\[([0-9]+\\.[0-9]+\\.[0-9]+)' CHANGELOG.md
~~~

Backend 품질 검증:

~~~bash
cd backend
npm ci
npm run lint
npm run build
npm run test:security
npm run test:e2e
~~~

Frontend 품질 검증:

~~~bash
cd frontend
npm ci
npm run lint
npm run build
~~~

Docker Compose와 마이그레이션도 확인합니다.

~~~bash
cd ..
docker compose config
docker compose build backend frontend
docker compose up -d
docker compose exec backend npx prisma migrate status
curl --fail http://127.0.0.1:2082/api/health
~~~

## CHANGELOG 작성

CHANGELOG.md 최상단에 새 버전을 추가합니다.

~~~markdown
## [26.10.0] - 2026-09-XX

새 릴리즈 요약

### Added
- 신규 기능

### Changed
- 변경된 동작

### Fixed
- 수정된 문제

### Security
- 보안 개선
~~~

변경이 없는 섹션은 생략합니다.

## 커밋과 태그

커밋 제목은 저장소 규칙을 따릅니다.

~~~bash
git add -A
git commit -m "chore: 26.10.0 릴리즈"
git tag 26.10.0
git push origin main
git push origin 26.10.0
~~~

태그를 push하면 GitHub Actions가 다음 작업을 수행합니다.

1. Backend lint/build/security test/E2E 검증
2. Backend·Frontend Docker 이미지 빌드 및 Docker Hub push
3. MariaDB, Nginx, ClamAV를 포함한 오프라인 이미지 번들 생성
4. CHANGELOG.md의 해당 버전 섹션을 Release 본문으로 사용
5. docker-compose.yml, env.example, offline-upgrade.sh, 이미지 번들 첨부

> Tag push 전에는 CHANGELOG의 버전 헤더가 태그와 정확히 일치해야 합니다. 예를 들어 태그가 26.10.0이면 헤더는 ## [26.10.0]이어야 합니다.

## 온라인 배포

### 신규 설치

Release에서 docker-compose.yml과 env.example을 내려받습니다.

~~~bash
mkdir customer-vault
cd customer-vault
curl -LO https://github.com/HelloJamong/customer-vault/releases/download/26.10.0/docker-compose.yml
curl -L -o .env https://github.com/HelloJamong/customer-vault/releases/download/26.10.0/env.example
vi .env
docker compose up -d
~~~

.env에는 DB 비밀번호, INITIAL_ADMIN_PASSWORD, JWT_SECRET, ENCRYPTION_KEY, BACKUP_ENCRYPTION_KEY, CORS_ORIGIN, VERSION을 운영 값으로 설정해야 합니다.

### 기존 설치 업그레이드

~~~bash
curl -LO https://github.com/HelloJamong/customer-vault/releases/download/26.10.0/docker-compose.yml
vi .env                         # VERSION=26.10.0
docker compose pull
docker compose up -d
docker compose exec backend npx prisma migrate status
curl --fail http://127.0.0.1:2082/api/health
~~~

Backend entrypoint가 Prisma 마이그레이션을 자동 적용합니다. 기존 DB에 마이그레이션 이력이 없으면 자동으로 임의의 기준점을 만들지 말고, scripts/offline-upgrade.sh의 사전 점검 절차를 사용하세요.

## 오프라인 배포

Release에서 다음 자산을 준비합니다.

- docker-compose.yml
- env.example
- customer-vault-images-26.10.0.tar.gz
- 기존 설치 업그레이드 시 offline-upgrade.sh

신규 설치는 이미지 번들을 로드한 뒤 docker compose up -d를 실행합니다. 기존 설치는 반드시 offline-upgrade.sh로 암호화 백업, 마이그레이션 사전 적용, 헬스체크를 수행합니다.

자세한 절차는 오프라인 배포 가이드와 마이그레이션 가이드를 참고하세요.

## 롤백 주의사항

- Docker 이미지와 Compose 설정은 이전 릴리즈를 보관하세요.
- Prisma 마이그레이션은 자동 롤백하지 않습니다.
- DB·파일 복원에는 BACKUP_ENCRYPTION_KEY가 필요합니다.
- ENCRYPTION_KEY 또는 BACKUP_ENCRYPTION_KEY를 변경하면 기존 암호화 데이터·백업을 읽지 못할 수 있습니다.
- 업그레이드 스크립트는 애플리케이션 설정을 롤백하지만 DB를 자동 복원하지 않습니다. 백업 검증 후 별도로 복원하세요.

## 참고

- [CHANGELOG](../CHANGELOG.md)
- [Docker 설정](docker_setup_guide.md)
- [마이그레이션 및 배포](migration_guide.md)
- [오프라인 배포](offline_deployment_guide.md)
- [Backend 테스트](backend_testing.md)
- [GitHub Actions](../.github/workflows/docker-build.yml)
