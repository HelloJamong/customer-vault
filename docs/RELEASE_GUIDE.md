# 릴리즈 가이드

이 문서는 Customer Vault 프로젝트의 새 버전을 릴리즈하는 방법을 설명합니다.

## 릴리즈 프로세스

### 1. 버전 결정

[Semantic Versioning](https://semver.org/) 규칙을 따릅니다:
- `MAJOR.MINOR.PATCH` (예: 2.1.2)
- **MAJOR**: 호환성이 깨지는 변경
- **MINOR**: 하위 호환 기능 추가
- **PATCH**: 하위 호환 버그 수정

### 2. .env 파일 업데이트

`.env` 파일의 `VERSION` 값을 업데이트합니다:

```bash
VERSION=2.1.3
```

### 3. Git 태그 생성 및 푸시

```bash
# 버전 태그 생성 (v 접두사 필수)
git tag v2.1.3

# 태그를 원격 저장소에 푸시
git push origin v2.1.3
```

### 4. 자동 빌드 확인

GitHub Actions가 자동으로 다음 작업을 수행합니다:

1. ✅ Backend Docker 이미지 빌드
2. ✅ Frontend Docker 이미지 빌드
3. ✅ Docker Hub에 이미지 푸시
   - `igor0670/customer-storage-backend:2.1.3`
   - `igor0670/customer-storage-frontend:2.1.3`
4. ✅ GitHub Release 생성 (릴리즈 노트 포함)

**확인 방법:**
- GitHub Actions 탭에서 워크플로우 실행 상태 확인
- https://github.com/YOUR_USERNAME/customer-vault/actions

### 5. 배포

#### 로컬/개발 환경

```bash
# .env 파일에 버전 설정
VERSION=2.1.3

# 이미지 pull 및 실행
docker compose pull
docker compose up -d
```

#### 프로덕션 환경

```bash
# 서버에서 .env 파일 업데이트
vim .env  # VERSION=2.1.3

# 이미지 pull 및 무중단 재배포
docker compose pull
docker compose up -d --no-deps backend frontend
```

## 버전 관리 규칙

### 태그 이름 규칙
- ✅ `v2.1.2` (올바름)
- ❌ `2.1.2` (v 접두사 필수)
- ❌ `release-2.1.2` (다른 형식 불가)

### 커밋 메시지 규칙

릴리즈 노트 자동 생성을 위해 다음 형식을 권장합니다:

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드/설정 변경
```

## 롤백 방법

문제가 발생한 경우 이전 버전으로 롤백:

```bash
# .env 파일에서 이전 버전 설정
VERSION=2.1.2

# 이전 버전 이미지로 재배포
docker compose pull
docker compose up -d
```

## 트러블슈팅

### 1. GitHub Actions 빌드 실패

**원인**: Dockerfile 문법 오류, 테스트 실패 등

**해결**:
```bash
# 로컬에서 빌드 테스트
docker compose build

# 문제 수정 후 태그 삭제 및 재생성
git tag -d v2.1.3
git push origin :refs/tags/v2.1.3
git tag v2.1.3
git push origin v2.1.3
```

### 2. Docker Hub 푸시 실패

**원인**: Docker Hub 인증 실패

**해결**:
- GitHub Secrets 확인
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`

### 3. 이미지 버전 불일치

**원인**: .env의 VERSION과 Git 태그 불일치

**해결**:
```bash
# .env와 Git 태그 버전을 항상 동일하게 유지
VERSION=2.1.3  # .env
git tag v2.1.3  # Git 태그
```

## 참고 자료

- [Semantic Versioning 공식 문서](https://semver.org/)
- [Docker Hub - Customer Storage](https://hub.docker.com/u/igor0670)
- [GitHub Actions 워크플로우](.github/workflows/docker-build.yml)
