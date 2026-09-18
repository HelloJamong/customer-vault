# DB Information

고객창고 서비스에서 사용하는 주요 테이블과 역할을 정리했습니다. 테이블 구조는 `backend/prisma/schema.prisma`를 참조하세요.

## 사용자 및 인증
- `users`: 계정 정보(아이디, 이름, 이메일, 역할, 비밀번호 해시, 활성 상태, 최초 로그인 여부, OTP 등록 상태 및 암호화된 OTP 비밀키).
- `user_sessions`: 로그인 세션 정보(세션 ID, 로그인/마지막 활동 시간, IP).
- `login_attempts`: 로그인 성공/실패 이력(시간, 성공 여부, IP).
- `user_customers`: 사용자와 고객사 매핑(담당 고객사 권한).
- `system_settings`: 시스템 정책(초기 비밀번호, 비밀번호 정책, 로그인 시도 제한, 중복 로그인 방지, 세션 타임아웃, OTP 전역 활성화 등).

## 고객사 및 점검 관련
- `customers`: 고객사 기본 정보(이름, 위치, 담당자/부담당자, 계약/점검 정보, 내부 담당자 등).
- `inspection_targets`: 고객사별 점검 대상(장비/영역 등).
- `documents`: 점검서/문서 업로드 정보(파일 경로, 업로더, 점검일 등).
- `source_management`: 고객사 시스템 구성 정보(클라이언트/가상PC/관리웹 정보, 이중화 타입).
- `server_info`: 고객사 서버 세부 정보(종류, OS, 하드웨어, 네트워크 등) — `source_management`에 종속.

## 로그
- `service_logs`: 서비스 활동 이력(로그인/로그아웃, 설정 변경, 내보내기 등).
- `backup_logs`: DB·문서 백업 실행 상태, 대상, 암호화 백업 파일 경로, 보관 이력.
- `support_logs`: 고객 문의/지원 이력(문의자, 대상, 카테고리, 조치 내용 등).

## 보안 관련 운영 데이터

- `user_sessions.last_activity`: 세션 유휴 만료 기준으로 사용됩니다. 기본 타임아웃은 30분이며 시스템 설정에서 10~60분으로 조정할 수 있습니다.
- `system_settings.session_timeout_warning_enabled`: 만료 1분 전 프론트엔드 안내 팝업 표시 여부입니다. 안내 시간은 60초로 고정됩니다.
- `system_settings.otp_enabled`: OTP 2차 인증 전역 정책입니다. 활성화하면 OTP 미등록 사용자는 로그인 직후 QR 등록을 완료해야 하며, 등록 사용자는 비밀번호 인증 후 OTP를 추가로 검증해야 합니다.
- `users.mfa_secret_encrypted`: 사용자별 TOTP 비밀키를 `ENCRYPTION_KEY`로 암호화해 저장합니다. 평문 비밀키와 OTP 코드는 DB나 서비스 로그에 저장하지 않습니다.
- `users.mfa_last_used_step`: 같은 30초 OTP 코드의 재사용을 막기 위한 마지막 검증 시간 단계입니다.
- OTP 분실 시 관리자 사용자 관리 화면의 OTP 등록 초기화 기능을 사용합니다. 초기화는 기존 비밀키와 등록 상태를 삭제하고 서비스 로그에 기록합니다.
- 소스관리 자격증명은 암호화 저장되며, 기본 조회는 마스킹됩니다. 전체 열람 시 서비스 로그에 열람 사실만 기록되고 실제 비밀번호는 기록되지 않습니다.
- 백업 파일은 `BACKUP_ENCRYPTION_KEY`로 암호화된 `.enc` 파일만 운영·원격 저장 대상입니다.

## 기타
- 스키마/마이그레이션 파일 위치: `backend/prisma/`
- 빈 DB의 초기 admin 계정/설정은 서비스 기동 시 `INITIAL_ADMIN_PASSWORD`를 사용해 한 번만 생성됩니다(`PrismaService.ensureDefaultAdmin`). 기존 계정이 있는 DB의 비밀번호는 재설정하지 않습니다.
- 스키마 변경은 `backend/prisma/migrations/`에 커밋된 Prisma migration으로 관리합니다.
