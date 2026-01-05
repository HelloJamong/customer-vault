# 폐쇄망(오프라인) 환경 로컬 테스트 가이드

> 실제 폐쇄망 환경과 동일한 네트워크 제약 조건을 로컬에서 재현하여 중복 로그인 기능을 테스트합니다.

## 📋 목차

1. [폐쇄망 환경 구축 방법](#폐쇄망-환경-구축-방법)
2. [테스트 시나리오](#테스트-시나리오)
3. [디버깅 방법](#디버깅-방법)
4. [문제 해결](#문제-해결)

---

## 🔧 폐쇄망 환경 구축 방법

### 방법 1: Docker Compose + iptables 이용 (추천)

**특징:**
- ✅ 실제 폐쇄망 환경과 동일한 네트워크 제약
- ✅ 외부 인터넷 완전 차단
- ✅ 같은 로컬 네트워크(C클래스 대역) 접근 허용
- ✅ 다른 PC에서도 테스트 가능

**실행 방법:**

```bash
# 1. 기존 개발 환경 중지 (포트 충돌 방지)
docker compose down

# 2. 폐쇄망 환경 시작 (자동 네트워크 설정)
./setup-offline-network.sh
```

**스크립트 동작:**
- Docker Compose 시작
- 로컬 네트워크 대역 자동 감지 (예: 192.168.0.0/24)
- iptables 규칙 설정:
  - ✅ 로컬 네트워크 허용
  - ✅ 컨테이너 간 통신 허용
  - ❌ 외부 인터넷 차단

**접속 URL:**
- 로컬호스트: http://localhost:2083
- 서버 IP: http://[서버IP]:2083 (같은 네트워크의 다른 PC에서)
- 백엔드 API: http://localhost:5006/api
- Swagger: http://localhost:5006/api/docs

**예시:**
서버 IP가 `192.168.0.21`이라면:
- PC1 (서버): http://localhost:2083 또는 http://192.168.0.21:2083
- PC2 (같은 네트워크 192.168.0.x): http://192.168.0.21:2083 ✅
- PC3 (외부 네트워크): ❌ 접속 불가

**중지 방법:**
```bash
# iptables 규칙 삭제 및 컨테이너 중지
./cleanup-offline-network.sh
```

**수동 실행 (iptables 없이):**
```bash
# iptables 설정 없이 Docker만 시작
docker compose -f docker-compose.offline.yml up -d --build

# 상태 확인
docker compose -f docker-compose.offline.yml ps

# 로그 확인
docker compose -f docker-compose.offline.yml logs -f backend

# 중지
docker compose -f docker-compose.offline.yml down
```

**외부 인터넷 차단 확인:**
```bash
# 컨테이너에서 외부 인터넷 접속 시도 (실패해야 정상)
docker exec customer_backend_offline curl -m 5 https://google.com

# 예상 결과: 타임아웃 또는 "Could not resolve host" 에러
```

---

### 방법 2: 브라우저 DevTools로 네트워크 차단

**특징:**
- ⚡ 빠르고 간단
- ⚠️ 완전한 폐쇄망은 아님 (SSE 등 일부 기능만 차단 가능)

**사용 방법:**

1. **Chrome/Edge 개발자 도구 열기** (F12)
2. **Network** 탭 이동
3. **Throttling** 드롭다운 클릭
4. **Offline** 선택

또는 **커스텀 프로파일 생성:**
- Throttling → Add → Custom throttling profile
- 이름: "Closed Network"
- Download: 0 Kbps
- Upload: 0 Kbps
- Latency: 1000 ms

---

### 방법 3: iptables로 Docker 네트워크 차단

**특징:**
- 🔒 가장 정교한 제어 가능
- ⚠️ Linux 전용

**사용 방법:**

```bash
# Docker 브리지 네트워크 이름 확인
docker network ls | grep customer

# 외부 인터넷 차단 (컨테이너 -> 외부)
sudo iptables -I DOCKER-USER -i br-<NETWORK_ID> -j DROP
sudo iptables -I DOCKER-USER -o br-<NETWORK_ID> -j ACCEPT

# 해제
sudo iptables -D DOCKER-USER -i br-<NETWORK_ID> -j DROP
sudo iptables -D DOCKER-USER -o br-<NETWORK_ID> -j ACCEPT
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 기본 중복 로그인 테스트

**준비:**
```bash
# 폐쇄망 환경 시작
docker compose -f docker-compose.offline.yml up -d

# 백엔드 로그 실시간 확인 (별도 터미널)
docker compose -f docker-compose.offline.yml logs -f backend

# DB 세션 상태 확인용 (별도 터미널)
watch -n 2 'docker exec customer_db_offline mariadb -u customer_user -pcustomerpass customer_db -e "SELECT user_id, session_id, login_time FROM user_sessions ORDER BY login_time DESC LIMIT 5;"'
```

**테스트 단계:**

1. **브라우저 1 (크롬 일반 모드)**: http://localhost:2083
   - 아이디: `admin`, 비밀번호: `1111`
   - 로그인 성공 확인
   - 백엔드 로그 확인: `[세션관리] 새 세션 생성 완료`

2. **브라우저 2 (크롬 시크릿 모드)**: http://localhost:2083
   - 아이디: `admin`, 비밀번호: `1111`
   - **중복 로그인 경고 팝업** 확인
   - 백엔드 로그 확인: `[로그인] 중복 세션 감지 - DUPLICATE_SESSION 에러 반환`

3. **브라우저 2**에서 **"아니요"** 클릭
   - 로그인 취소됨
   - 브라우저 1 계속 유지

4. **브라우저 2**에서 다시 로그인 시도 후 **"예"** 클릭
   - 강제 로그인 성공
   - 백엔드 로그 확인: `[로그인] 강제 로그인: true`
   - 브라우저 1에서 **자동 로그아웃 팝업** 확인 (SSE 동작하는 경우)

**확인 포인트:**
- ✅ 중복 로그인 경고 다이얼로그가 정상 표시되는가?
- ✅ "예" 클릭 시 `forceLogin: true`가 백엔드에 전달되는가?
- ✅ 강제 로그인 성공 후 기존 세션이 종료되는가?

---

### 시나리오 2: SSE 동작 여부 확인

폐쇄망 환경에서 SSE가 동작하지 않는 경우를 재현합니다.

**테스트:**

1. 브라우저 1 로그인 후 개발자 도구 (F12) → Console 확인
   ```
   [SSE] SSE 연결 시작 - 사용자: admin
   [SSE] 연결 성공 - 이벤트 수신 대기 중
   ```

2. 브라우저 2에서 강제 로그인

3. 브라우저 1에서 다음 중 하나 확인:
   - ✅ **SSE 정상**: `[SSE] 로그아웃 이벤트 수신` → 자동 로그아웃 팝업
   - ❌ **SSE 실패**: 아무 반응 없음 (세션은 DB에서 삭제됨)

**SSE 실패 시:**
브라우저 1에서 아무 동작(페이지 이동, API 호출 등)을 하면:
- ✅ 401 Unauthorized 에러 발생 → 자동 로그아웃 (정상)
- ❌ 계속 로그인 상태 유지 (문제!)

---

## 🐛 디버깅 방법

### 1. 백엔드 로그 실시간 확인

```bash
# 전체 로그
docker compose -f docker-compose.offline.yml logs -f backend

# 로그인 관련만
docker compose -f docker-compose.offline.yml logs -f backend | grep -i "로그인\|duplicate\|forcelogin\|세션"

# 에러만
docker compose -f docker-compose.offline.yml logs -f backend | grep -i "error\|exception\|403"
```

### 2. DB 세션 상태 직접 확인

```bash
# 실시간 세션 모니터링
watch -n 2 'docker exec customer_db_offline mariadb -u customer_user -pcustomerpass customer_db -e "SELECT us.user_id, u.username, us.session_id, us.login_time FROM user_sessions us JOIN users u ON us.user_id = u.id ORDER BY us.login_time DESC;"'
```

### 3. 시스템 설정 확인

```bash
docker exec customer_db_offline mariadb -u customer_user -pcustomerpass customer_db -e "SELECT prevent_duplicate_login, login_failure_limit_enabled FROM system_settings;"
```

### 4. 브라우저 네트워크 요청 확인

**F12 → Network → /api/auth/login 요청 클릭**

**Payload (요청 본문):**
```json
// 첫 번째 시도
{
  "username": "admin",
  "password": "1111"
}

// "예" 클릭 후
{
  "username": "admin",
  "password": "1111",
  "forceLogin": true  // ← 이 값이 있어야 함!
}
```

**Response (응답):**
```json
// 중복 세션 감지 시
{
  "statusCode": 403,
  "message": "DUPLICATE_SESSION"
}

// 성공 시
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... }
}
```

### 5. 프론트엔드 콘솔 로그

**F12 → Console에서 확인:**
```
[SSE] 로그인 상태 아님 - SSE 연결 중지
Login failed: gn  // ← 이 에러가 반복되면 문제!
```

---

## 🛠️ 문제 해결

### 문제 1: "중복 로그인 경고가 뜨지 않음"

**원인:**
- `prevent_duplicate_login` 설정이 꺼져있음

**해결:**
```bash
docker exec customer_db_offline mariadb -u customer_user -pcustomerpass customer_db -e "UPDATE system_settings SET prevent_duplicate_login = 1;"

# 백엔드 재시작
docker compose -f docker-compose.offline.yml restart backend
```

---

### 문제 2: "forceLogin이 백엔드에 전달 안됨"

**확인:**
```bash
# 백엔드 로그에서 확인
docker compose -f docker-compose.offline.yml logs backend | grep "강제 로그인"

# 출력 예시:
# [로그인] 중복 로그인 방지: true, 강제 로그인: undefined  ← 문제!
# [로그인] 중복 로그인 방지: true, 강제 로그인: true      ← 정상
```

**디버깅:**
1. 브라우저 F12 → Network → Payload 확인
2. `forceLogin: true`가 있는지 확인
3. 없으면 프론트엔드 코드 문제

---

### 문제 3: "강제 로그인해도 계속 403 에러"

**원인:**
- ValidationPipe가 `forceLogin` 필드를 제거함
- 또는 DTO 검증 실패

**임시 해결 (디버깅용):**

백엔드 코드에 로그 추가:

```typescript
// backend/src/auth/auth.controller.ts
@Post('login')
async login(@Body() loginDto: LoginDto, @Request() req) {
  console.error('=== 로그인 요청 받음 ===');
  console.error('Body:', JSON.stringify(req.body));
  console.error('DTO:', JSON.stringify(loginDto));
  console.error('forceLogin:', loginDto.forceLogin);
  console.error('forceLogin 타입:', typeof loginDto.forceLogin);

  const ipAddress = getClientIp(req);
  return this.authService.login(loginDto, ipAddress);
}
```

재빌드:
```bash
docker compose -f docker-compose.offline.yml up -d --build backend
```

---

### 문제 4: "SSE가 연결 안됨"

**증상:**
```
[SSE] 연결 실패: 401
```

**원인:**
- Access Token이 만료됨
- 또는 인증 헤더 전달 실패

**확인:**
```javascript
// 브라우저 콘솔에서
sessionStorage.getItem('access_token')
```

---

### 문제 5: "로그가 전혀 안 나옴"

**해결:**
```bash
# .env 파일 수정
echo "LOG_LEVEL=debug" >> .env
echo "NODE_ENV=development" >> .env

# 재시작
docker compose -f docker-compose.offline.yml restart backend
```

---

## 📊 테스트 체크리스트

### 온라인 환경 (기존)
- [ ] PC1 로그인 → 성공
- [ ] PC2 로그인 시도 → 중복 세션 경고
- [ ] PC2 "예" 클릭 → 강제 로그인 성공
- [ ] PC1 자동 로그아웃 (SSE)

### 오프라인 환경 (폐쇄망)
- [ ] PC1 로그인 → 성공
- [ ] PC2 로그인 시도 → 중복 세션 경고
- [ ] PC2 "예" 클릭 → 강제 로그인 성공
- [ ] PC1 자동 로그아웃 (SSE 또는 폴링)
- [ ] 네트워크 단절 상태에서도 정상 동작

---

## 🎯 기대 결과

폐쇄망 환경에서도 중복 로그인 방지 기능이 정상 동작해야 합니다:

1. ✅ 중복 로그인 시도 시 경고 팝업 표시
2. ✅ "예" 클릭 시 `forceLogin: true` 전달
3. ✅ 강제 로그인 성공 (403 에러 발생 안 함)
4. ✅ 기존 세션 DB에서 삭제
5. ✅ 기존 PC에서 로그아웃 (SSE 또는 대체 메커니즘)

---

## 📝 로그 수집 템플릿

문제 발생 시 다음 정보를 수집해주세요:

```bash
# 1. 시스템 설정
docker exec customer_db_offline mariadb -u customer_user -pcustomerpass customer_db -e "SELECT * FROM system_settings;" > system_settings.txt

# 2. 백엔드 로그
docker compose -f docker-compose.offline.yml logs backend --tail 200 > backend_logs.txt

# 3. 세션 상태
docker exec customer_db_offline mariadb -u customer_user -pcustomerpass customer_db -e "SELECT * FROM user_sessions;" > sessions.txt

# 4. 환경 변수
docker compose -f docker-compose.offline.yml exec backend env | grep -E "NODE_ENV|LOG_LEVEL" > env_vars.txt
```

---

## 🚀 다음 단계

1. 폐쇄망 환경에서 문제 재현
2. 로그 수집 및 분석
3. 원인 파악 후 수정
4. 온라인/오프라인 양쪽 환경에서 재테스트
