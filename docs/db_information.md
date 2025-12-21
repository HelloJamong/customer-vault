# DB Information

고객창고 서비스에서 사용하는 주요 테이블과 역할을 정리했습니다. 테이블 구조는 `backend/prisma/schema.prisma`를 참조하세요.

## 사용자 및 인증
- `users`: 계정 정보(아이디, 이름, 이메일, 역할, 비밀번호 해시, 활성 상태, 최초 로그인 여부).
- `user_sessions`: 로그인 세션 정보(세션 ID, 로그인/마지막 활동 시간, IP).
- `login_attempts`: 로그인 성공/실패 이력(시간, 성공 여부, IP).
- `user_customers`: 사용자와 고객사 매핑(담당 고객사 권한).
- `system_settings`: 시스템 정책(초기 비밀번호, 비밀번호 정책, 로그인 시도 제한, 중복 로그인 방지 등).

## 고객사 및 점검 관련
- `customers`: 고객사 기본 정보(이름, 위치, 담당자/부담당자, 계약/점검 정보, 내부 담당자 등).
- `inspection_targets`: 고객사별 점검 대상(장비/영역 등).
- `documents`: 점검서/문서 업로드 정보(파일 경로, 업로더, 점검일 등).
- `source_management`: 고객사 시스템 구성 정보(클라이언트/가상PC/관리웹 정보, 이중화 타입).
- `server_info`: 고객사 서버 세부 정보(종류, OS, 하드웨어, 네트워크 등) — `source_management`에 종속.

## 로그
- `service_logs`: 서비스 활동 이력(로그인/로그아웃, 설정 변경, 내보내기 등).
- `support_logs`: 고객 문의/지원 이력(문의자, 대상, 카테고리, 조치 내용 등).

## 기타
- 스키마/마이그레이션 파일 위치: `backend/prisma/`
- 초기 admin 계정/설정은 서비스 기동 시 자동 생성(`PrismaService.ensureDefaultAdmin`).
