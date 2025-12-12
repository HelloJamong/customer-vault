# 프론트엔드를 NestJS 백엔드와 연결하기

## 📋 현재 상황

- **Flask**: 백엔드(API) + 프론트엔드(HTML 템플릿)를 모두 제공
- **NestJS**: 백엔드(API)만 제공 (포트 5002)
- **목표**: 기존 Flask 프론트엔드가 NestJS API를 사용하도록 변경

---

## 🎯 방법 1: Flask를 프록시로 사용 (가장 빠름)

Flask를 단순 프록시 서버로 변경하여 모든 API 요청을 NestJS로 전달합니다.

### Step 1: Flask 앱에 프록시 설정 추가

`app/__init__.py` 또는 메인 Flask 파일에 추가:

```python
import requests
from flask import request, jsonify

# NestJS 백엔드 URL
NESTJS_API_URL = "http://localhost:5002/api"

@app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_to_nestjs(path):
    """모든 /api/* 요청을 NestJS로 프록시"""

    # NestJS로 전달할 URL
    url = f"{NESTJS_API_URL}/{path}"

    # 요청 메서드에 따라 처리
    if request.method == 'GET':
        resp = requests.get(url, params=request.args, headers=get_headers())
    elif request.method == 'POST':
        resp = requests.post(url, json=request.get_json(), headers=get_headers())
    elif request.method == 'PUT':
        resp = requests.put(url, json=request.get_json(), headers=get_headers())
    elif request.method == 'PATCH':
        resp = requests.patch(url, json=request.get_json(), headers=get_headers())
    elif request.method == 'DELETE':
        resp = requests.delete(url, headers=get_headers())

    # NestJS 응답을 클라이언트로 반환
    return (resp.content, resp.status_code, resp.headers.items())

def get_headers():
    """클라이언트 요청에서 필요한 헤더 추출"""
    headers = {}
    if 'Authorization' in request.headers:
        headers['Authorization'] = request.headers['Authorization']
    if 'Content-Type' in request.headers:
        headers['Content-Type'] = request.headers['Content-Type']
    return headers
```

### Step 2: 기존 Flask 라우트를 뷰 전용으로 변경

기존 Flask 라우트에서 데이터베이스 조회 로직을 제거하고 템플릿만 렌더링:

**변경 전:**
```python
@app.route('/dashboard')
@login_required
def dashboard():
    # DB에서 데이터 조회
    customers = Customer.query.all()
    return render_template('dashboard.html', customers=customers)
```

**변경 후:**
```python
@app.route('/dashboard')
@login_required
def dashboard():
    # 데이터는 프론트엔드에서 JavaScript로 가져옴
    return render_template('dashboard.html')
```

### Step 3: 템플릿에서 API 호출 추가

각 페이지에서 JavaScript로 NestJS API를 호출:

```html
<!-- dashboard.html -->
<script>
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('access_token');

        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        // 데이터로 화면 업데이트
        updateDashboard(data);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', loadDashboardData);
</script>
```

---

## 🎯 방법 2: 인증 방식 변경 (완전 마이그레이션)

Flask-Login 세션 기반 인증을 JWT 토큰 기반으로 변경합니다.

### Step 1: 로그인 페이지 수정

`app/templates/login.html`:

```html
<form id="loginForm">
    <input type="text" id="username" name="username" required>
    <input type="password" id="password" name="password" required>
    <button type="submit">로그인</button>
</form>

<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();

            // JWT 토큰 저장
            localStorage.setItem('access_token', data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            // 대시보드로 이동
            window.location.href = '/dashboard';
        } else {
            alert('로그인 실패');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
});
</script>
```

### Step 2: 인증 미들웨어 추가

모든 API 요청에 JWT 토큰을 자동으로 추가하는 fetch wrapper:

```javascript
// app/static/js/api.js
const API_BASE_URL = '/api';

async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        let response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers
        });

        // 401 에러 시 토큰 갱신 시도
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                // 토큰 갱신 성공, 재시도
                headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(`${API_BASE_URL}${url}`, {
                    ...options,
                    headers
                });
            } else {
                // 토큰 갱신 실패, 로그인 페이지로
                window.location.href = '/login';
                return null;
            }
        }

        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.accessToken);
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }

    return false;
}

// 사용 예시
// const response = await authenticatedFetch('/customers');
// const customers = await response.json();
```

---

## 🎯 방법 3: 하이브리드 방식 (가장 실용적, 권장)

단계적으로 마이그레이션:

### Phase 1: 로그인만 NestJS 사용

1. 로그인 페이지를 JWT 기반으로 변경
2. 나머지는 기존 Flask-Login 유지
3. 두 시스템이 동시에 작동

### Phase 2: 점진적 API 마이그레이션

1. 한 번에 하나의 페이지씩 NestJS API로 전환
2. 예: 대시보드 → 고객사 관리 → 사용자 관리 순서로

### Phase 3: Flask 제거

1. 모든 페이지가 NestJS API 사용 확인
2. Flask를 정적 파일 서버로만 사용 또는 Nginx로 교체

---

## 📝 구체적인 구현 예시

### 1. 고객사 목록 페이지 마이그레이션

**기존 Flask (app/routes.py):**
```python
@app.route('/customers')
@login_required
def manage_customers():
    customers = Customer.query.all()
    return render_template('admin/customers.html', customers=customers)
```

**변경 후 (app/routes.py):**
```python
@app.route('/customers')
@login_required
def manage_customers():
    # 템플릿만 반환, 데이터는 JavaScript에서 로드
    return render_template('admin/customers.html')
```

**템플릿 (admin/customers.html):**
```html
<div id="customersContainer">
    <div id="loading">로딩 중...</div>
    <table id="customersTable" class="table" style="display:none;">
        <thead>
            <tr>
                <th>고객사 코드</th>
                <th>회사명</th>
                <th>담당자</th>
            </tr>
        </thead>
        <tbody id="customersBody"></tbody>
    </table>
</div>

<script src="/static/js/api.js"></script>
<script>
async function loadCustomers() {
    try {
        const response = await authenticatedFetch('/customers');
        const customers = await response.json();

        const tbody = document.getElementById('customersBody');
        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.customerCode}</td>
                <td>${customer.companyName}</td>
                <td>${customer.mainContactName}</td>
            </tr>
        `).join('');

        document.getElementById('loading').style.display = 'none';
        document.getElementById('customersTable').style.display = 'table';
    } catch (error) {
        console.error('Failed to load customers:', error);
        alert('고객사 목록을 불러오는데 실패했습니다.');
    }
}

document.addEventListener('DOMContentLoaded', loadCustomers);
</script>
```

---

## 🚀 빠른 시작 가이드 (추천)

가장 빠르게 테스트하려면:

### 1. NestJS에 데이터베이스 마이그레이션

```bash
# 기존 Flask DB를 NestJS가 사용하도록 설정
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma db pull
docker-compose -f docker-compose.nestjs.yml exec backend npx prisma generate
```

### 2. Flask 앱에 간단한 프록시 추가

`app/__init__.py`에 추가:

```python
import requests

NESTJS_URL = "http://localhost:5002"

@app.route('/api/test')
def test_nestjs():
    """NestJS 연결 테스트"""
    try:
        response = requests.get(f"{NESTJS_URL}/api/auth/password-requirements")
        return response.json()
    except Exception as e:
        return {"error": str(e)}, 500
```

### 3. 브라우저에서 테스트

```
http://localhost:5001/api/test
```

성공하면 NestJS와 연결된 것입니다!

---

## 🔄 마이그레이션 체크리스트

- [ ] NestJS 백엔드 정상 작동 확인 (✅ 완료)
- [ ] NestJS에서 기존 DB 연결 확인
- [ ] Flask에 프록시 라우트 추가
- [ ] 로그인 페이지를 JWT 기반으로 변경
- [ ] 대시보드 API 호출로 변경
- [ ] 고객사 관리 API 호출로 변경
- [ ] 사용자 관리 API 호출로 변경
- [ ] 파일 업로드/다운로드 테스트
- [ ] 모든 기능 테스트 완료
- [ ] Flask 백엔드 로직 제거
- [ ] 프로덕션 배포

---

어떤 방법으로 진행하시겠습니까?

**제 추천**: 방법 3 (하이브리드)로 시작해서, 먼저 NestJS가 기존 DB를 사용하도록 연결하고, 한 페이지씩 테스트하는 것이 가장 안전합니다!
