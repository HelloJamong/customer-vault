# 로깅 시스템 가이드

## 개요

고객창고 시스템은 **Winston**을 기반으로 구조화된 로깅 시스템을 사용합니다. 에러 타입별로 로그를 분리하여 문제 추적과 디버깅을 용이하게 합니다.

## 로그 파일 구조

### 로그 디렉토리
```
logs/
├── web-error-2024-12-16.log      # 웹 에러 (400, 404 등)
├── db-error-2024-12-16.log       # 데이터베이스 에러
├── auth-error-2024-12-16.log     # 인증/인가 에러 (401, 403)
├── api-error-2024-12-16.log      # API 에러 (500, 502 등)
├── system-error-2024-12-16.log   # 시스템 에러
├── access-2024-12-16.log         # 접근 로그
└── application-2024-12-16.log    # 일반 애플리케이션 로그
```

### 로그 파일 설명

| 파일명 | 용도 | 기록 내용 |
|--------|------|-----------|
| `web-error-*.log` | 클라이언트 에러 | 400번대 HTTP 에러 (잘못된 요청, 리소스 없음 등) |
| `db-error-*.log` | 데이터베이스 에러 | Prisma 에러, DB 연결 실패, 쿼리 에러 등 |
| `auth-error-*.log` | 인증/인가 에러 | 401 (인증 실패), 403 (권한 없음) |
| `api-error-*.log` | 서버 에러 | 500번대 HTTP 에러 (내부 서버 오류 등) |
| `system-error-*.log` | 시스템 에러 | 예상치 못한 에러, 런타임 에러 |
| `access-*.log` | 접근 로그 | 성공적인 API 요청 기록 |
| `application-*.log` | 일반 로그 | 정보성 로그, 디버그 로그 |

## 로그 포맷

각 로그 항목은 다음과 같은 형식으로 기록됩니다:

```
[2024-12-16 10:30:45] [ERROR] GET /api/customers/999 - 404
{
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "body": {},
  "query": {},
  "params": { "id": "999" },
  "statusCode": 404
}
Error: Customer not found
    at CustomersService.findOne (customers.service.ts:45:11)
    ...
```

### 포함 정보
- **타임스탬프**: 정확한 발생 시각
- **로그 레벨**: ERROR, WARN, INFO, DEBUG
- **요청 정보**: HTTP 메서드, URL, 상태 코드
- **클라이언트 정보**: IP 주소, User Agent
- **요청 데이터**: Body, Query, Params (민감 정보는 자동 제거)
- **에러 스택**: 상세한 에러 추적 정보

## 민감 정보 보호

로그에 기록될 때 다음 필드는 자동으로 마스킹됩니다:
- `password`
- `token`
- `secret`
- `accessToken`
- `refreshToken`

**예시:**
```json
{
  "username": "admin",
  "password": "***REDACTED***"
}
```

## 프로덕션 vs 개발 환경

### 프로덕션 환경
- **클라이언트 응답**: 간단한 에러 메시지만 반환
  ```json
  {
    "statusCode": 500,
    "message": "Internal Server Error",
    "timestamp": "2024-12-16T10:30:45.123Z",
    "path": "/api/customers"
  }
  ```
- **로그 파일**: 상세한 에러 정보와 스택 트레이스 기록
- **콘솔 출력**: 없음 (로그 파일에만 기록)

### 개발 환경
- **클라이언트 응답**: 상세한 에러 정보 포함
  ```json
  {
    "statusCode": 500,
    "message": "Cannot read property 'name' of undefined",
    "timestamp": "2024-12-16T10:30:45.123Z",
    "path": "/api/customers",
    "error": "TypeError",
    "stack": "TypeError: Cannot read property...\n    at ..."
  }
  ```
- **콘솔 출력**: 컬러 코딩된 로그 출력

## 로그 확인 방법

### Docker 환경에서 실시간 로그 확인

```bash
# 웹 에러 로그 모니터링
tail -f logs/web-error-$(date +%Y-%m-%d).log

# DB 에러 로그 모니터링
tail -f logs/db-error-$(date +%Y-%m-%d).log

# 인증 에러 로그 모니터링
tail -f logs/auth-error-$(date +%Y-%m-%d).log

# 모든 애플리케이션 로그 모니터링
tail -f logs/application-$(date +%Y-%m-%d).log
```

### 특정 기간의 로그 검색

```bash
# 오늘 발생한 모든 에러 검색
grep -r "ERROR" logs/*-$(date +%Y-%m-%d).log

# 특정 IP에서 발생한 에러 검색
grep "192.168.1.100" logs/*-$(date +%Y-%m-%d).log

# 특정 엔드포인트 에러 검색
grep "/api/customers" logs/web-error-*.log
```

### 로그 파일 정리

```bash
# 14일 이상 된 로그 파일 확인
find logs/ -name "*.log" -mtime +14

# 14일 이상 된 로그 파일 삭제
find logs/ -name "*.log" -mtime +14 -delete
```

## 로그 로테이션 정책

- **로테이션 주기**: 매일 자정 (날짜별 로그 파일 생성)
- **파일 크기 제한**: 각 파일 최대 20MB
- **보관 기간**: 14일
- **압축**: 자동 압축 없음 (필요시 수동 설정)

## 에러 타입별 대응 가이드

### Web Error (4xx)
**원인**: 클라이언트의 잘못된 요청
**대응**:
1. 요청 파라미터 검증
2. API 문서 확인
3. 프론트엔드 유효성 검사 강화

### DB Error
**원인**: 데이터베이스 관련 문제
**대응**:
1. 데이터베이스 연결 상태 확인
2. 쿼리 검증
3. Prisma 스키마 확인

### Auth Error (401, 403)
**원인**: 인증/인가 실패
**대응**:
1. 토큰 유효성 확인
2. 사용자 권한 확인
3. JWT 설정 검증

### API Error (5xx)
**원인**: 서버 내부 오류
**대응**:
1. 스택 트레이스 분석
2. 코드 로직 검토
3. 예외 처리 추가

### System Error
**원인**: 예상치 못한 런타임 에러
**대응**:
1. 전체 로그 분석
2. 시스템 리소스 확인
3. 의존성 패키지 검토

## 모범 사례

### 1. 정기적인 로그 모니터링
```bash
# cron 작업으로 매일 에러 로그 요약 메일 발송
0 9 * * * grep -c "ERROR" /app/logs/*-$(date +%Y-%m-%d).log | mail -s "Daily Error Report" admin@example.com
```

### 2. 로그 백업
```bash
# 주간 로그 백업
0 0 * * 0 tar -czf /backup/logs-$(date +%Y-%m-%d).tar.gz /app/logs/
```

### 3. 로그 분석 도구 활용
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Grafana Loki**: 로그 집계 및 시각화
- **Sentry**: 실시간 에러 추적

## 문제 해결

### 로그 파일이 생성되지 않는 경우
```bash
# logs 디렉토리 권한 확인
ls -ld logs/

# 필요시 권한 수정
chmod 755 logs/

# Docker 볼륨 마운트 확인
docker inspect customer_backend | grep -A 5 Mounts
```

### 로그가 너무 많이 쌓이는 경우
```bash
# 로그 레벨 조정 (.env 파일)
LOG_LEVEL=warn  # debug -> info -> warn -> error

# 수동으로 오래된 로그 정리
find logs/ -name "*.log" -mtime +7 -delete
```

## 추가 리소스

- [Winston 공식 문서](https://github.com/winstonjs/winston)
- [NestJS 로깅 가이드](https://docs.nestjs.com/techniques/logger)
- [Docker 로그 관리](https://docs.docker.com/config/containers/logging/)
