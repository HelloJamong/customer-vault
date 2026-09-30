# AI LLM 연동 정의서

Customer Vault 정보를 사내 LLM 환경(Open WebUI + Ollama)에서 조회하기 위한 연동 기준입니다. 이 문서는 Open WebUI가 Customer Vault의 제한된 읽기 전용 Tool API를 호출하는 방식을 기준으로 합니다.

## 목표

- Open WebUI 사용자가 자연어로 Customer Vault 정보를 조회합니다.
  - 예: `고객사A의 담당자는 누구지?`
  - 예: `2026-09-28 기준으로 조치되지 않은 이슈를 정리해줘.`
- Customer Vault는 LLM에 데이터베이스 직접 접근 권한을 주지 않습니다.
- LLM 연동 전용 토큰은 지정된 AI Tool API만 호출할 수 있습니다.
- 구조화된 연락처 응답에는 전화번호·이메일을, 고객사/지원 이슈 조회에는 서버 접속정보와 계정/비밀번호 필드를 포함하지 않습니다. 지원 로그 자유 서술 필드는 이메일·전화번호·IPv4·일부 라벨형 비밀정보·Bearer/JWT 패턴을 최선 노력으로 마스킹하지만 완전한 DLP를 보장하지 않습니다. 개인정보나 비밀정보가 포함되지 않도록 운영 데이터 입력 기준과 AI 처리 정책을 적용해야 합니다.

## 연동 구조

```text
사용자 브라우저
  -> Open WebUI (Docker, TCP 3000)
      -> Ollama (macOS Native, TCP 11434)
      -> Customer Vault Backend /api/ai-tools/*
           -> Customer Vault DB
```

- Open WebUI는 채팅 UI와 Tool 실행 환경으로 사용합니다.
- Ollama는 LLM 추론 런타임으로 사용합니다.
- Customer Vault Backend는 Open WebUI가 호출할 수 있는 읽기 전용 AI Tool API를 제공합니다.
- Open WebUI 계정/API 키와 Customer Vault AI Tool 토큰은 서로 다른 자격증명입니다.
- 이 구조에서는 Open WebUI가 Customer Vault Tool API를 직접 호출하므로, Customer Vault에는 Open WebUI API 키를 저장하지 않습니다.
- Open WebUI API 키는 Open WebUI 자체 API를 호출할 때만 필요합니다. Open WebUI에서 Customer Vault Tool 엔드포인트를 호출하는 방식에는 필요하지 않습니다.

## 인증 방식

AI Tool API는 기존 사용자 화면/API에서 사용하는 앱 JWT와 분리된 Bearer 토큰을 사용합니다. 이 토큰은 사용자 관리 화면에서 생성/수정/삭제하는 계정이 아니라, 배포 환경 변수로 주입되는 전용 machine token입니다.

| 항목 | 기존 앱 API | AI Tool API |
|---|---|---|
| 목적 | Customer Vault 웹 화면과 일반 API | Open WebUI Tool 호출 |
| 인증 | 로그인 후 발급되는 JWT | `AI_INTEGRATION_API_KEY` 값 |
| 권한 범위 | 사용자/역할 기반 기능 접근 | 지정된 `/api/ai-tools/*` 읽기 전용 조회 |
| 토큰 보관 | 브라우저/세션 흐름 | Open WebUI Tool 설정 또는 별도 비밀 저장소 |

### 환경 변수

| 환경 변수 | 설명 |
|---|---|
| `AI_INTEGRATION_API_KEY` | AI Tool API 호출에 사용할 단일 서버 비밀값 |

- `AI_INTEGRATION_API_KEY`가 설정되지 않으면 AI Tool API는 비활성화된 것으로 보고 요청을 거부해야 합니다.
- 토큰은 충분히 긴 랜덤 문자열로 생성하고 Git, 문서, 채팅, 로그에 기록하지 않습니다.
- 토큰 값은 Open WebUI의 Tool 인증 설정 또는 별도 비밀 저장소에만 입력합니다.
- 토큰 검증은 Customer Vault Backend에서 수행하며, Open WebUI 사용자별 앱 권한을 Customer Vault로 위임하지 않습니다.
- 현재 AI Tool 엔드포인트의 신원은 단일 공유 machine identity입니다. 따라서 Open WebUI의 여러 사용자가 같은 Tool 설정을 사용하면 Customer Vault는 사용자별 권한이 아니라 동일한 연동 토큰의 권한으로 요청을 처리합니다.
- 인증된 조회 요청은 시스템 로그에 도구 종류와 호출 IP만 기록하며, 검색어와 응답 내용은 로그에 남기지 않습니다. 사용자별 호출자를 구분하려면 별도 delegated authorization 설계가 필요합니다.

토큰 생성 예시:

```bash
openssl rand -base64 48
```

## 네트워크 요구사항

| 출발지 | 목적지 | 포트/프로토콜 | 목적 |
|---|---|---|---|
| 사용자 브라우저 | Open WebUI | TCP 3000 또는 사내 HTTPS | 채팅 UI 접속 |
| Open WebUI 컨테이너 | Customer Vault Backend 또는 Reverse Proxy | 사내 HTTP/HTTPS | AI Tool API 호출 |
| Open WebUI 컨테이너 | Ollama | TCP 11434 | LLM 추론 호출 |
| Customer Vault Backend | DB | 내부 Docker 네트워크 | 애플리케이션 데이터 조회 |

주의사항:

- Open WebUI 컨테이너에서 Customer Vault를 호출할 때 `localhost`는 Open WebUI 컨테이너 자신을 의미할 수 있습니다. Docker 네트워크 서비스명, 호스트 IP, 사내 DNS 이름을 사용합니다.
- 운영 연동은 HTTPS/TLS와 사내 인증서 적용을 권장합니다.
- Ollama API는 일반적으로 내부 런타임 용도로만 노출하고 외부 클라이언트가 직접 접근하지 않도록 제한합니다.

## 제공 Tool API

OpenAPI 정의 파일: [`customer-vault-ai-tools.openapi.yaml`](customer-vault-ai-tools.openapi.yaml)

### 1. 고객사 검색

`GET /api/ai-tools/customers/search?name=<고객사명 일부>`

고객사명 일부로 최대 10건을 검색하고 담당자/담당 엔지니어/영업 정보를 반환합니다.

반환 필드:

| 필드 | 설명 |
|---|---|
| `customerId` | 고객사 ID |
| `customerName` | 고객사명 |
| `customerContacts[]` | 고객사 담당자 목록. 이름, 직위, 부서만 포함 |
| `accountManagers.engineer` | 주 담당 엔지니어 |
| `accountManagers.engineerSub` | 부 담당 엔지니어 |
| `accountManagers.sales` | 담당 영업 |

제외 필드:

- 전화번호
- 이메일
- 서버 접속정보
- 계정/비밀번호
- 인증서/키/토큰

> 지원 로그의 `inquiryContent`와 `actionContent`는 업무 요약에 필요한 자유 서술 필드입니다. 이메일·전화번호·IPv4·일부 라벨형 비밀정보·Bearer/JWT 패턴을 최선 노력으로 마스킹하지만, 임의 형식의 비밀정보나 개인정보까지 모두 탐지·제거한다고 보장하지 않습니다. 해당 필드에 민감정보가 입력되지 않도록 하고 AI 환경으로 전달 가능한 데이터인지 사내 정책을 확인해야 합니다.

호출 예시:

```bash
curl -sS \
  -H "Authorization: Bearer ${AI_INTEGRATION_API_KEY}" \
  "${CUSTOMER_VAULT_URL}/api/ai-tools/customers/search?name=%EA%B3%A0%EA%B0%9D%EC%82%ACA"
```

응답 예시:

```json
{
  "items": [
    {
      "customerId": 12,
      "customerName": "고객사A",
      "customerContacts": [
        {
          "name": "홍길동",
          "position": "팀장",
          "department": "IT운영팀"
        }
      ],
      "accountManagers": {
        "engineer": "김엔지니어",
        "engineerSub": "이엔지니어",
        "sales": "박영업"
      }
    }
  ]
}
```

### 2. 미조치 지원 이슈 조회

`GET /api/ai-tools/support-logs/unresolved`

현재 조치 상태가 다음 중 하나인 지원 이슈를 조회합니다.

- `진행 중`
- `진행 불가`
- `보류`

쿼리 파라미터:

| 파라미터 | 필수 | 설명 |
|---|---:|---|
| `customerName` | 아니오 | 고객사명 일부 또는 전체 이름 |
| `supportDateTo` | 아니오 | `YYYY-MM-DD` 형식. `supportDate <= supportDateTo` 조건으로 필터링 |
| `limit` | 아니오 | 반환 건수 제한. 최대 100 |

`supportDateTo`는 과거 시점의 상태를 재구성하지 않습니다. 현재 저장된 `actionStatus`가 미조치 상태인 항목 중 지원일이 해당 날짜 이하인 항목만 필터링합니다.

반환 필드:

| 필드 | 설명 |
|---|---|
| `id` | 지원 이슈 ID |
| `customerName` | 고객사명 |
| `supportDate` | 지원일 |
| `category` | 분류 |
| `title` | 제목 |
| `actionStatus` | 현재 조치 상태 |
| `inquiryContent` | 문의 내용 |
| `actionContent` | 조치 내용 (기존 진척 사항과 날짜별 지원 내역을 `[YYYY-MM-DD] 내용` 줄로 합친 텍스트, 지원자 이름 미포함) |
| `jiraTicket` | JIRA 티켓 번호 또는 URL |

호출 예시:

```bash
curl -sS \
  -H "Authorization: Bearer ${AI_INTEGRATION_API_KEY}" \
  "${CUSTOMER_VAULT_URL}/api/ai-tools/support-logs/unresolved?supportDateTo=2026-09-28&limit=50"
```

응답 예시:

```json
{
  "items": [
    {
      "id": 101,
      "customerName": "고객사A",
      "supportDate": "2026-09-20",
      "category": "장애",
      "title": "접속 지연 문의",
      "actionStatus": "진행 중",
      "inquiryContent": "관리 콘솔 접속이 지연됨",
      "actionContent": "원인 확인 중",
      "jiraTicket": "JIRA-1234"
    }
  ]
}
```

## Open WebUI 연결 절차

1. Customer Vault 운영 환경에 `AI_INTEGRATION_API_KEY`를 설정합니다.
2. Backend 컨테이너를 재시작하거나 환경 변수가 반영되도록 재배포합니다.
3. Open WebUI에서 Tool/OpenAPI 연동 메뉴를 엽니다.
4. `docs/customer-vault-ai-tools.openapi.yaml` 내용을 등록하거나, 운영 환경에서 제공하는 OpenAPI URL을 등록합니다.
5. Tool 인증 헤더를 다음과 같이 설정합니다.

   ```text
   Authorization: Bearer <AI_INTEGRATION_API_KEY 값>
   ```

6. Open WebUI 컨테이너에서 Customer Vault API 주소가 접근 가능한지 확인합니다.
7. Open WebUI API 키는 별도로 발급하지 않아도 됩니다. 단, Customer Vault Backend가 Open WebUI API를 역호출하는 별도 기능을 추가할 경우에는 Open WebUI API 키를 별도 비밀값으로 관리해야 합니다.
8. 테스트 프롬프트로 Tool 호출 결과와 답변 품질을 확인합니다.

## 테스트 프롬프트

- `고객사A 담당자는 누구야? 전화번호나 이메일은 제외하고 알려줘.`
- `2026-09-28 기준으로 조치되지 않은 이슈를 고객사별로 정리해줘.`
- `고객사A의 미조치 지원 이슈 중 진행 불가 상태만 요약해줘.`

LLM 응답 검증 기준:

- Customer Vault Tool 응답에 없는 개인정보를 만들어내지 않아야 합니다.
- 전화번호, 이메일, 접속정보, 계정정보를 요구하면 제공할 수 없다고 답해야 합니다.
- `supportDateTo` 조건은 현재 미조치 상태 기준 필터임을 필요한 경우 설명해야 합니다.

## 토큰 교체 절차

1. 새 토큰을 생성합니다.
2. Customer Vault 서버의 `AI_INTEGRATION_API_KEY` 값을 새 토큰으로 변경합니다.
3. Backend를 재시작하거나 재배포합니다.
4. Open WebUI Tool 인증 헤더 값을 새 토큰으로 변경합니다.
5. 고객사 검색 API를 1회 호출해 정상 응답을 확인합니다.
6. 이전 토큰이 더 이상 동작하지 않는지 확인합니다.

토큰 교체 중에는 이전 토큰과 새 토큰을 동시에 허용하지 않는 구성을 기본으로 합니다. 무중단 교체가 필요하면 배포 절차에서 별도 임시 이중 토큰 허용 정책을 설계해야 합니다.

## 보안 원칙

- LLM 또는 Open WebUI에 DB 계정 정보를 제공하지 않습니다.
- Tool API는 읽기 전용으로 제한합니다.
- Tool API 응답 스키마는 필요한 업무 필드만 포함합니다.
- 전화번호, 이메일, 접속정보, 계정/비밀번호, 암호화 키, 백업 키, 토큰은 별도 구조화 필드로 응답하지 않습니다. 지원 로그 자유 서술의 이메일·전화번호·IPv4·일부 라벨형 비밀정보·Bearer/JWT 패턴은 최선 노력으로 마스킹하며, 이는 포괄적 DLP 대체가 아닙니다. 민감정보 입력 방지 정책을 함께 적용해야 합니다.
- 지원 로그의 자유 서술 내용은 Open WebUI/Ollama로 전달되므로 데이터 입력 기준 및 내부 AI 데이터 처리 정책을 준수합니다.
- Open WebUI Tool에 입력하는 Customer Vault 토큰은 배포 비밀값 기반 machine token으로 관리하고, 개인 계정 토큰을 운영 연동에 사용하지 않습니다.
- 접근 로그에는 토큰 원문을 남기지 않습니다.
- 사내망 외부에서 Open WebUI 또는 AI Tool API로 직접 접근하지 못하도록 방화벽과 Reverse Proxy 정책을 설정합니다.

## 제한사항

- `supportDateTo`는 이슈의 과거 상태를 복원하지 않습니다. 현재 `actionStatus`가 미조치 상태인 데이터만 대상으로 `supportDate <= supportDateTo`를 적용합니다.
- 고객사 담당자 조회는 연락처 이름/직위/부서와 내부 담당자명만 제공합니다.
- 자연어 답변 품질은 Open WebUI Tool 호출 설정, 모델, 시스템 프롬프트, Context Length에 영향을 받습니다.
- 여러 고객사가 유사한 이름을 가질 수 있으므로, LLM은 검색 결과가 여러 건이면 고객사명을 명확히 확인하도록 안내해야 합니다.
- 현재 연동은 Open WebUI 사용자별 권한을 Customer Vault에 전달하지 않습니다. 사용자별 조회 범위 분리가 필요하면 별도 delegated authorization 설계가 필요합니다.
