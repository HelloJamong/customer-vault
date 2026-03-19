# 릴리즈 가이드

이 문서는 Customer Vault 프로젝트의 새 버전을 릴리즈하는 방법을 설명합니다.

## 버전 형식 (CalVer)

`YY.MM.NN` 형식의 날짜 기반 버전을 사용합니다.

| 구성 | 설명 | 예시 |
|------|------|------|
| `YY` | 연도 2자리 | `26` (2026년) |
| `MM` | 월 2자리 (zero-pad) | `03` (3월) |
| `NN` | 해당 월의 릴리즈 순번 (zero-pad) | `01`, `02`, `03` |

**예시:**
- `v26.03.01` → 2026년 3월 첫 번째 릴리즈
- `v26.03.02` → 2026년 3월 두 번째 릴리즈
- `v26.04.01` → 2026년 4월 첫 번째 릴리즈

> 이전 버전(~2.4.x)은 Semantic Versioning을 사용했습니다. v26.03.01부터 CalVer로 전환되었습니다.

---

## 릴리즈 프로세스

### 1. CHANGELOG.md 작성

`CHANGELOG.md`에 새 버전 섹션을 추가합니다:

```markdown
## [v26.03.02] - 2026-03-XX

### Added
- 새로 추가된 기능

### Changed
- 변경된 기능

### Fixed
- 수정된 버그
```

### 2. .env 파일 업데이트

`.env` 파일의 `VERSION` 값을 업데이트합니다:

```bash
VERSION=26.03.02
```

### 3. 변경사항 커밋

```bash
git add CHANGELOG.md .env
git commit -m "chore: release v26.03.02"
```

### 4. Git 태그 생성 및 푸시

```bash
# 방법 A: make 명령어 사용 (권장)
make release VERSION=26.03.02

# 방법 B: 수동으로 실행
git tag -a v26.03.02 -m "Release version 26.03.02"
git push origin main
git push origin v26.03.02
```

### 5. 자동 빌드 확인

GitHub Actions가 자동으로 다음 작업을 수행합니다:

1. ✅ Backend Docker 이미지 빌드
2. ✅ Frontend Docker 이미지 빌드
3. ✅ Docker Hub에 이미지 푸시
   - `igor0670/customer-storage-backend:26.03.02`
   - `igor0670/customer-storage-frontend:26.03.02`
4. ✅ GitHub Release 생성 (릴리즈 노트 포함)

**확인 방법:**
- GitHub Actions 탭에서 워크플로우 실행 상태 확인

### 6. 배포

#### 로컬/개발 환경

```bash
# .env 파일에 버전 설정
VERSION=26.03.02

# 이미지 pull 및 실행
docker compose pull
docker compose up -d
```

#### 프로덕션 환경

```bash
# 서버에서 .env 파일 업데이트
vim .env  # VERSION=26.03.02

# 이미지 pull 및 무중단 재배포
docker compose pull
docker compose up -d --no-deps backend frontend
```

---

## 버전 관리 규칙

### 태그 이름 규칙

- ✅ `v26.03.01` (올바름)
- ✅ `v26.04.01` (올바름)
- ❌ `26.03.01` (v 접두사 필수)
- ❌ `v26.3.1` (zero-pad 필수)

### 같은 달에 여러 번 릴리즈하는 경우

순번(NN)을 증가시킵니다:

```
v26.03.01 → v26.03.02 → v26.03.03
```

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

---

## 롤백 방법

문제가 발생한 경우 이전 버전으로 롤백:

```bash
# .env 파일에서 이전 버전 설정
VERSION=26.03.01

# 이전 버전 이미지로 재배포
docker compose pull
docker compose up -d
```

---

## 트러블슈팅

### 1. GitHub Actions 빌드 실패

**원인**: Dockerfile 문법 오류, 테스트 실패 등

**해결**:
```bash
# 로컬에서 빌드 테스트
docker compose build

# 문제 수정 후 태그 삭제 및 재생성
git tag -d v26.03.02
git push origin :refs/tags/v26.03.02
git tag -a v26.03.02 -m "Release version 26.03.02"
git push origin v26.03.02
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
VERSION=26.03.02  # .env
git tag v26.03.02  # Git 태그
```

---

## 참고 자료

- [Calendar Versioning (CalVer)](https://calver.org/)
- [Docker Hub - Customer Storage](https://hub.docker.com/u/igor0670)
- [GitHub Actions 워크플로우](.github/workflows/docker-build.yml)
- [CHANGELOG](../CHANGELOG.md)
