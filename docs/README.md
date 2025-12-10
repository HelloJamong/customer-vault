# 📚 고객사 관리 시스템 - 문서 센터

이 디렉토리는 고객사 관리 시스템의 모든 기술 문서를 포함합니다.

## 🗂️ 문서 목록

### 🚀 시작하기

| 문서 | 설명 | 대상 |
|------|------|------|
| **[🚀 제3자 배포 가이드](DEPLOYMENT_GUIDE.md)** | 처음 접하는 사람이 본인 서버에 배포하는 전체 과정 | 신규 사용자 ⭐ |
| **[환경 설정 가이드](SETUP_GUIDE.md)** | 환경별 상세 시스템 설정 가이드 | 신규 관리자 |
| **[환경 변수 참조](ENV_VARIABLES.md)** | 환경 변수 빠른 참조 및 설정 방법 | 모든 사용자 |
| **[🔐 특수문자 포함 비밀번호 가이드](SPECIAL_CHARACTERS_GUIDE.md)** | .env 파일에서 @, $, ! 등 특수문자 사용 방법 | 모든 사용자 |

### 🐳 Docker 관련

| 문서 | 설명 | 대상 |
|------|------|------|
| **[Docker 설정 가이드](DOCKER_GUIDE.md)** | Dockerfile 및 docker-compose.yml 수정 방법 | 개발자 |
| **[Docker 컨테이너 환경 구성](DOCKER_CONTAINER_GUIDE.md)** | Docker로 환경을 구성하는 전체 과정 | 관리자 |
| **[🚀 Docker 배포 빠른 시작](DOCKER_QUICKSTART.md)** | Docker Hub 배포 빠른 가이드 | 개발자 ⭐ |
| **[🐋 Docker 이미지 배포 가이드](DOCKER_DEPLOYMENT.md)** | Docker Hub 배포 상세 가이드 | 개발자 |

---

## 📖 문서 선택 가이드

### "처음 시작하는데 어떤 문서를 봐야 하나요?"

**시나리오별 추천 문서:**

#### 1️⃣ 완전히 처음 시작하는 경우 (가장 쉬움) ⭐
**→ [제3자 배포 가이드](DEPLOYMENT_GUIDE.md)** - 서버 준비부터 완료까지 모든 것을 단계별로 안내

이 가이드 하나면 충분합니다:
- 서버 준비 및 Docker 설치
- 프로젝트 다운로드
- 환경 설정
- 실행 및 확인
- 초기 관리자 설정
- 문제 해결

#### 2️⃣ Docker는 이미 설치되어 있는 경우
1. [Docker 컨테이너 환경 구성](DOCKER_CONTAINER_GUIDE.md) - 프로젝트 다운로드부터 시작
2. [환경 변수 참조](ENV_VARIABLES.md) - .env 파일 설정
3. [환경 설정 가이드](SETUP_GUIDE.md) - 환경별 상세 설정

#### 3️⃣ .env 파일만 수정하고 싶은 경우
- [환경 변수 참조](ENV_VARIABLES.md) - 빠른 참조와 예시

#### 4️⃣ Docker 설정을 변경하고 싶은 경우
- [Docker 설정 가이드](DOCKER_GUIDE.md) - 포트, 리소스, 볼륨 등 수정

#### 5️⃣ Docker Hub로 배포하고 싶은 경우 (개발자)
- **[Docker 배포 빠른 시작](DOCKER_QUICKSTART.md)** - 빠른 시작 가이드 ⭐
- [Docker 이미지 배포 가이드](DOCKER_DEPLOYMENT.md) - 상세 가이드

---

## 🎯 주요 작업별 빠른 링크

### 환경 변수 설정

- **SECRET_KEY 생성**: [ENV_VARIABLES.md#secret_key-생성](ENV_VARIABLES.md#secret_key-생성)
- **비밀번호 생성**: [ENV_VARIABLES.md#강력한-비밀번호-생성](ENV_VARIABLES.md#강력한-비밀번호-생성)
- **특수문자 비밀번호 사용**: [SPECIAL_CHARACTERS_GUIDE.md](SPECIAL_CHARACTERS_GUIDE.md)
- **환경별 예시**: [ENV_VARIABLES.md#환경별-설정-예시](ENV_VARIABLES.md#환경별-설정-예시)

### Docker 작업

- **포트 변경**: [DOCKER_GUIDE.md#포트-변경](DOCKER_GUIDE.md#포트-변경)
- **리소스 제한**: [DOCKER_GUIDE.md#리소스-제한-설정](DOCKER_GUIDE.md#리소스-제한-설정)
- **볼륨 설정**: [DOCKER_GUIDE.md#볼륨-설정-변경](DOCKER_GUIDE.md#볼륨-설정-변경)
- **Dockerfile 수정**: [DOCKER_GUIDE.md#dockerfile-수정하기](DOCKER_GUIDE.md#dockerfile-수정하기)

### 운영 작업

- **백업 설정**: [DOCKER_CONTAINER_GUIDE.md#백업-및-복원](DOCKER_CONTAINER_GUIDE.md#백업-및-복원)
- **모니터링**: [DOCKER_CONTAINER_GUIDE.md#모니터링](DOCKER_CONTAINER_GUIDE.md#모니터링)
- **문제 해결**: 모든 문서의 "문제 해결" 섹션 참고

---

## 📝 문서별 상세 설명

### 1. [환경 설정 가이드](SETUP_GUIDE.md)

**내용:**
- 사전 요구사항
- 환경 변수 설정 (개발/스테이징/운영)
- 초기 설정 과정
- 보안 체크리스트
- 문제 해결

**이런 분들께 추천:**
- 처음으로 시스템을 설치하는 관리자
- 환경별 설정 차이를 이해하고 싶은 분
- 보안 설정을 확인하고 싶은 분

---

### 2. [환경 변수 참조](ENV_VARIABLES.md)

**내용:**
- 전체 환경 변수 목록 및 설명
- SECRET_KEY 생성 방법
- 강력한 비밀번호 생성 방법
- 파일 크기 변환표
- 빠른 시작 가이드

**이런 분들께 추천:**
- .env 파일을 빠르게 설정하고 싶은 분
- 특정 환경 변수의 의미를 찾는 분
- 환경 변수 예시가 필요한 분

---

### 3. [Docker 설정 가이드](DOCKER_GUIDE.md)

**내용:**
- Dockerfile 구조 및 수정 방법
- docker-compose.yml 설정 상세 설명
- 포트, 볼륨, 네트워크 설정 변경
- 개발/운영 환경별 Docker 설정
- Nginx 연동 설정

**이런 분들께 추천:**
- Docker 설정을 커스터마이징하려는 개발자
- 포트나 리소스 제한을 변경하려는 분
- Nginx 리버스 프록시를 추가하려는 분

---

### 4. [Docker 컨테이너 환경 구성](DOCKER_CONTAINER_GUIDE.md)

**내용:**
- Docker 설치 (Linux/macOS/Windows)
- 단계별 컨테이너 구성 가이드
- 컨테이너 운영 명령어
- 데이터 관리 (백업/복원)
- 모니터링 방법
- 문제 해결

**이런 분들께 추천:**
- Docker를 처음 사용하는 관리자
- 전체 배포 과정을 따라하고 싶은 분
- 백업 및 복원 방법을 알고 싶은 분
- 컨테이너 운영 명령어를 찾는 분

---

## 🆘 자주 묻는 질문 (FAQ)

### Q1: Docker가 처음인데 어디서부터 시작해야 하나요?

**A:** [Docker 컨테이너 환경 구성](DOCKER_CONTAINER_GUIDE.md)의 "사전 준비" 섹션부터 차근차근 따라하세요. Docker 설치부터 전체 과정이 단계별로 설명되어 있습니다.

### Q2: .env 파일에 어떤 값을 넣어야 하나요?

**A:** [환경 변수 참조](ENV_VARIABLES.md)를 확인하세요. 각 변수의 설명과 예시가 있습니다. 최소 구성으로 빠르게 시작하려면 "빠른 시작" 섹션을 참고하세요.

### Q3: 포트 5001이 이미 사용 중입니다. 어떻게 변경하나요?

**A:** [Docker 설정 가이드](DOCKER_GUIDE.md)의 "포트 변경" 섹션을 참고하세요. docker-compose.yml 파일에서 간단히 변경할 수 있습니다.

### Q4: 운영 환경에 배포하려면 뭘 확인해야 하나요?

**A:** [환경 설정 가이드](SETUP_GUIDE.md)의 "운영 환경 배포 체크리스트"와 [Docker 컨테이너 환경 구성](DOCKER_CONTAINER_GUIDE.md)의 "운영 환경 체크리스트"를 확인하세요.

### Q5: 데이터베이스 백업은 어떻게 하나요?

**A:** [Docker 컨테이너 환경 구성](DOCKER_CONTAINER_GUIDE.md)의 "백업 및 복원" 섹션에 자동 백업 스크립트가 있습니다.

### Q6: 메모리를 너무 많이 사용합니다. 제한할 수 있나요?

**A:** [Docker 설정 가이드](DOCKER_GUIDE.md)의 "리소스 제한 설정" 섹션을 참고하세요.

### Q7: 개발 환경과 운영 환경의 설정이 어떻게 다른가요?

**A:** [환경 설정 가이드](SETUP_GUIDE.md)의 "환경별 구성" 섹션에서 개발/스테이징/운영 환경의 차이를 확인할 수 있습니다.

### Q8: 비밀번호에 @나 $ 같은 특수문자를 사용하면 에러가 발생합니다.

**A:** [특수문자 포함 비밀번호 가이드](SPECIAL_CHARACTERS_GUIDE.md)를 참고하세요. `.env` 파일에서 대부분의 특수문자는 따옴표 없이 그대로 사용할 수 있습니다. `$` 기호만 `$$`로 작성하면 됩니다.

---

## 🔧 문제 해결 순서

문제가 발생했을 때 다음 순서로 문서를 확인하세요:

1. **해당 문서의 "문제 해결" 섹션 확인**
   - 각 문서 하단에 일반적인 문제와 해결 방법이 있습니다

2. **로그 확인**
   ```bash
   docker compose logs -f
   ```

3. **관련 문서 찾기**
   - 환경 변수 문제: [ENV_VARIABLES.md](ENV_VARIABLES.md)
   - Docker 문제: [DOCKER_GUIDE.md](DOCKER_GUIDE.md)
   - 컨테이너 문제: [DOCKER_CONTAINER_GUIDE.md](DOCKER_CONTAINER_GUIDE.md)

4. **GitHub Issues 검색 또는 생성**

---

## 📌 빠른 명령어 참조

### 시작하기
```bash
# 환경 변수 설정
cp docs/env.example .env
nano .env

# 컨테이너 시작
docker compose up -d

# 상태 확인
docker compose ps
```

### 운영
```bash
# 로그 확인
docker compose logs -f web

# 재시작
docker compose restart

# 백업
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup.sql
```

### 문제 해결
```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs

# 완전 재시작
docker compose down
docker compose up -d
```

---

## 📞 지원

문제가 해결되지 않거나 추가 도움이 필요한 경우:

1. **로그 파일 확인**: `docker compose logs`
2. **문서 재확인**: 관련 섹션을 다시 읽어보세요
3. **GitHub Issues**: 새 이슈를 생성하여 질문하세요
4. **커뮤니티**: 개발자 커뮤니티에 질문하세요

---

## 📝 문서 개선

문서에 오류가 있거나 개선할 점이 있다면:

1. GitHub에서 Pull Request를 보내주세요
2. Issues에 제안을 남겨주세요
3. 문서 작성자에게 연락하세요

---

**메인 프로젝트로 돌아가기: [../README.md](../README.md)**
