# Logs Information

## 위치
- 기본 경로: `./logs` (환경 변수 `LOG_DIR`로 변경 가능)
- Docker 실행 시: 컨테이너 `/app/logs` → 호스트 `./logs` 볼륨에 매핑됨

## 로그 파일과 역할
- `application-YYYY-MM-DD.log`: 일반 정보/경고/에러 등 애플리케이션 공통 로그
- `access-YYYY-MM-DD.log`: 정상 처리된 요청 등 접근 로그
- `web-error-YYYY-MM-DD.log`: 웹 계층 에러
- `db-error-YYYY-MM-DD.log`: DB 관련 에러
- `auth-error-YYYY-MM-DD.log`: 인증/인가 에러
- `api-error-YYYY-MM-DD.log`: API 처리 중 에러
- `system-error-YYYY-MM-DD.log`: 기타 시스템 에러

## 로테이션 정책
- 파일 이름에 날짜(`%DATE%`)가 붙으며 일 단위로 분리
- 최대 크기: 20MB
- 보존 기간: 14일 (`maxFiles: '14d'`)

## 확인/모니터링 예시
- 최근 애플리케이션 로그 확인: `tail -f logs/application-$(date +%F).log`
- 특정 날짜의 인증 에러 확인: `grep 'ERROR' logs/auth-error-2025-12-21.log`
- Docker 컨테이너 안에서 확인: `docker exec -it customer_backend sh -c "ls /app/logs && tail -n 100 /app/logs/application-$(date +%F).log"`

## 구성 포인트
- `LOG_DIR`: 로그 디렉터리 지정 (기본 `./logs`)
- `LOG_LEVEL`: `application` 로거 레벨 (`info` 기본)
- 개발 환경(`NODE_ENV=development`)에서는 콘솔에도 함께 출력

## 관련 코드
- 로거 정의: `backend/src/common/logger/logger.service.ts`
- 전역 예외 필터: `backend/src/common/filters/http-exception.filter.ts`
