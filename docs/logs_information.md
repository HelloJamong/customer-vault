# Logs Information

## 위치
- 기본 경로: `./logs` (환경 변수 `LOG_DIR`로 변경 가능)
- Docker 실행 시: 컨테이너 `/app/logs` → 호스트 `./logs` 볼륨에 매핑됨

## 로그 파일과 역할
- `application-YYYY-MM-DD.log`: 애플리케이션 기동·스케줄·일반 정보/경고/에러
- `web-error-YYYY-MM-DD.log`: 웹 계층 예외
- `db-error-YYYY-MM-DD.log`: DB 관련 예외
- `auth-error-YYYY-MM-DD.log`: 인증/인가 예외
- `api-error-YYYY-MM-DD.log`: API 처리 중 예외
- `system-error-YYYY-MM-DD.log`: 기타 시스템 예외
- `access-YYYY-MM-DD.log`: 접근 로그 로거용 파일. 현재 서비스 활동 이력의 기준은 DB `service_logs`입니다.

## 로테이션 정책
- 파일 이름에 날짜(`%DATE%`)가 붙으며 일 단위로 분리
- 최대 크기: 20MB
- 보존 기간: 14일 (`maxFiles: '14d'`)

## 확인/모니터링 예시
- 최근 애플리케이션 로그 확인: `tail -f logs/application-$(date +%F).log`
- 특정 날짜의 인증 에러 확인: `grep 'ERROR' logs/auth-error-2025-12-21.log`
- Docker Compose에서 확인: `docker compose logs backend --tail=100`
- 파일 로그 확인: `docker compose exec backend sh -c "ls /app/logs && tail -n 100 /app/logs/application-$(date +%F).log"`

## 구성 포인트
- `LOG_DIR`: 로그 디렉터리 지정 (기본 `./logs`)
- `LOG_LEVEL`: `application` 로거 레벨 (`info` 기본)
- 개발 환경(`NODE_ENV=development`)에서는 콘솔에도 함께 출력

## 관련 코드
- 로거 정의: `backend/src/common/logger/logger.service.ts`
- 전역 예외 필터: `backend/src/common/filters/http-exception.filter.ts`
