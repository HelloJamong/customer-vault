# CHANGELOG

이 프로젝트의 모든 주요 변경사항을 기록합니다.

버전 형식: `vYY.MM.NN` (CalVer — 연도.월.해당월순번)
- 예) `v26.03.01` = 2026년 3월 첫 번째 릴리즈

> v26.03.01 이전 버전(~2.4.x)은 Semantic Versioning을 사용했습니다.

---

## [v26.06.01] - 2026-06-05

### Fixed
- **알림벨 실시간 미반영 문제 수정**: 고객사 지원 로그 추가/수정/삭제 후 상단 알림벨 카운트가 페이지 새로고침 없이 즉시 반영되지 않는 문제 수정
  - `CustomerSupportLogsPage`에서 지원 로그 변경 성공 시 React Query 캐시(`pending-notifications`) 즉시 무효화 처리
- **이력 구분 필터 미동작 문제 수정**: 시스템/로그인 이력 검색 시 구분(경고·오류·정상·정보) 필터를 선택해도 적용되지 않는 문제 수정
  - `loginAttempt` 테이블은 `logType` 컬럼이 없어 DB 쿼리 레벨 필터가 불가하므로, `serviceLog`와 `loginAttempt` 통합 후 메모리에서 `logType` 후처리 필터링 추가 (`getSystemLogs`, `getLoginLogs`)
- **수동 백업 실패 팝업 오표시 문제 수정**: 백업은 정상 완료(이력에 성공 기록)되었으나 상단 팝업에 "백업에 실패했습니다"가 표시되는 문제 수정
  - `runBackup` 서비스 메서드에서 `createServiceLog` 호출을 try-catch로 감싸 로그 기록 실패가 HTTP 응답 오류로 전파되지 않도록 처리
- **백업 스케줄 시간대 오류 수정**: 관리자가 KST 기준으로 설정한 백업 시각이 9시간 늦게 실행되는 문제 수정 (예: 02:00 설정 → 11:00 실행)
  - `buildCronExpression`에서 사용자 입력값(KST) → UTC 변환(−9시간) 적용
  - 시간이 음수가 되는 경우(0~8시 KST) 24시간 보정 및 요일/날짜 하루 앞당김 처리

---

## [v26.05.02] - 2026-05-29

### Added
- **지원 로그 제목 필드 추가**: 지원 목록에 간단한 제목을 입력할 수 있는 `제목` 필드 추가
  - 지원 목록 테이블에서 기존 `사용자 정보` 컬럼이 `제목` 컬럼으로 교체 표시
  - 지원 로그 추가/수정 폼에 `제목` 입력란 추가 (문의 내용 입력란 위에 위치)
  - 세부 내용 조회 다이얼로그에 `제목` 항목 추가 (문의 내용 위에 표시)
  - 지원 목록 엑셀 내보내기에 `제목` 열 추가
  - 기존 데이터는 `제목` 빈값으로 표시되며 수정 시 입력 가능

### Schema
- **`support_logs` 테이블 `title` 컬럼 추가**: `title VARCHAR(200) NULL`
  - 기존 레코드는 `NULL`로 유지 (UI에서 빈값으로 표시)

---

## [v26.05.01] - 2026-05-14

### Added
- **중앙화된 암호화 서비스 (`CryptoService`)**: AES-256-CBC 기반 암호화/복호화를 단일 서비스로 통합
  - `encrypt()` / `decrypt()` / `safeDecrypt()` 메서드 제공
  - `safeDecrypt()`: 암호화된 값과 평문 값 모두 처리 (마이그레이션 구간 역호환 보장)
  - `CryptoModule`로 분리하여 필요한 모듈에서 import하여 사용
- **서버 접근 정보 암호화 마이그레이션 스크립트**: 기존 평문으로 저장된 비밀번호를 일괄 암호화
  - `prisma/scripts/encrypt-server-access-info.ts`
  - 이미 암호화된 값은 건너뜀 (멱등성 보장)
  - `SystemSettings.sftpPassword` 동시 처리
- **전역 레이트 리밋**: `@nestjs/throttler` 적용
  - 전역: 분당 200 요청 (IP 기준)
  - 로그인 엔드포인트: 분당 10 요청으로 별도 제한 (브루트포스 방어)

### Changed
- **암호화 적용 범위 확대**: BackupService, SettingsService, CustomersService의 인라인 crypto 코드를 `CryptoService`로 교체
  - SFTP 비밀번호 암호화/복호화 (BackupService, SettingsService)
  - 서버 접근 정보(웹/SSH/Root 비밀번호) 암호화/복호화 (CustomersService)
- **`ServerAccessInfo` 컬럼 길이 확장**: `webPassword`, `serverSshPassword`, `serverRootPassword` VARCHAR(100) → VARCHAR(512)
  - AES-256-CBC 암호화 후 hex 인코딩 시 길이 증가 반영
- **CORS 보안 강화**: `NODE_ENV=production`에서 `CORS_ORIGIN` 환경변수 기반 화이트리스트 적용
  - 개발 환경: 전체 허용 유지
  - 운영 환경: 미설정 시 전체 차단
- **환경변수 시작 시 검증 강화** (`main.ts`):
  - `ENCRYPTION_KEY`: 64자리 hex 형식 검증, 미달 시 서버 시작 거부
  - `JWT_SECRET`: 32자 이상 검증, 미달 시 서버 시작 거부
- **문서 다운로드/뷰어 접근 권한 체크** (`documents.controller.ts`):
  - USER 역할: 담당 고객사(engineerId, engineerSubId, salesId)의 문서만 접근 가능
  - ADMIN/SUPER_ADMIN: 전체 접근 허용
- **파일 I/O 비동기화** (`documents.service.ts`): `fs.*Sync` 계열 전면 제거, `fs/promises` API로 교체
  - `existsSync` → `fsp.access()`, `mkdirSync` → `fsp.mkdir()`, `renameSync` → `fsp.rename()`, `unlinkSync` → `fsp.unlink()`
  - 고객사·점검대상 DB 조회 `Promise.all()` 병렬화

### Fixed
- **민감 정보 콘솔 노출 제거**: auth, customers, documents 모듈 전반의 `console.log` 전면 제거
  - 로그인 흐름, 세션 관리, 파일 업로드, 소스 관리 등 디버그 로그 약 50여 개 삭제

### Schema
- **DB 인덱스 추가** (Prisma schema): 주요 조회 패턴에 맞춘 복합/단일 인덱스 추가
  - `User`: `@@index([isActive])`
  - `Customer`: `@@index([engineerId])`, `@@index([salesId])`, `@@index([contractEndDate])`, `@@index([lastInspectionDate])`
  - `Document`: `@@index([customerId])`, `@@index([uploadedAt])`, `@@index([inspectionDate])`
  - `LoginAttempt`: `@@index([userId, attemptTime])`
  - `UserSession`: `@@index([userId, lastActivity])`

---

## [v26.03.04] - 2026-03-24

### Fixed
- **비밀번호 만료 시 로그인 불가 문제 수정**: 비밀번호 사용 기간 만료 시 로그인이 거부되던 문제 해결
  - 기존: 만료 시 403 에러 반환 → `alert()` 메시지만 표시되어 로그인 불가
  - 변경: 만료 시에도 로그인 허용(토큰 발급), 응답에 `passwordExpired: true` 플래그 포함
  - 로그인 직후 강제 비밀번호 변경 다이얼로그 자동 표시 (`isFirstLogin` 패턴과 동일)
  - "비밀번호 사용 기간이 만료되었습니다. 계속하려면 비밀번호를 변경해야 합니다." 경고 메시지 표시

---

## [v26.03.03] - 2026-03-20

### Added
- **회의록 Word 내보내기**: 작성된 회의록을 `.docx` 형식으로 내보내기 기능 추가
  - 표 형식 레이아웃: 날짜/장소/회의 주제/참석자/회의 내용/결정 사항/비고
  - 목록 행의 `내보내기` 버튼 및 보기 다이얼로그의 `Word 내보내기` 버튼 제공
  - 파일명: `회의록_[고객사명]_[날짜]_[주제].docx`

### Changed
- **회의록 참석자 입력 방식 개선**: 개별 항목 추가(최대 10명) 방식 → 자유 텍스트 입력(줄바꿈으로 구분) 방식으로 변경
- **회의록 작업 컬럼 너비 확대**: 내보내기 버튼 추가로 인한 줄바꿈 방지 (220px → 330px)

---

## [v26.03.02] - 2026-03-19

### Added
- **회의록 기능**: 고객사별 회의록 작성/조회/수정/삭제 기능 추가
  - 회의록 페이지 (`/customers/:id/meeting-minutes`)
  - 작성 양식: 날짜(캘린더 DatePicker), 위치, 회의 주제, 참석자(최대 10명 동적 입력), 회의 내용/결정 사항/비고(Rich Text 편집기)
  - 목록 테이블: 날짜, 회의록 주제, 작성자 컬럼 + 보기/수정/삭제 버튼
  - 고객사명 표시: 페이지 제목 `고객사명 - 회의록` 형식

### Changed
- **고객사 관리 컬럼 개편**
  - `전체 정보(내보내기)` 컬럼 → `회의록(보기)` 컬럼으로 변경 (회의록 페이지 이동)
  - `점검서보기` → `점검서` 컬럼명 통일
  - `세부사항보기` → `세부사항` 컬럼명 통일
  - 고객사명 hover 시 `전체 정보 내보내기` 버튼 표시 (엑셀 다운로드 기능 유지)
- **버전 체계 전환**: Semantic Versioning → CalVer (`vYY.MM.NN`)
  - `.env` VERSION, GitHub Actions 태그 패턴, Makefile, RELEASE_GUIDE 전면 업데이트
  - `export-package.sh`: 버전 인자 없을 시 CHANGELOG.md에서 최신 버전 자동 추출
- **레이아웃 개선**: Footer가 항상 페이지 하단에 고정되도록 수정
- **세션 만료 자동 처리**: 브라우저 종료 시 30분 비활동 후 세션 자동 만료
  - 백엔드 5분 주기 cron으로 만료 세션 정리
  - 로그인 시 만료 세션은 중복 로그인으로 처리하지 않음
- **`.gitignore`**: `.omc/` 디렉토리 추가

### Fixed
- Docker Compose 이미지 태그 `.env`의 `VERSION` 변수 자동 참조하도록 수정

---

## [v26.03.01] - 2026-03-19

### Added
- **백업 기능**: DB 및 업로드 파일(점검서) 자동/수동 백업 지원
  - 즉시 실행, 이력 조회, 파일 다운로드 (`/backup`)
  - 백업 주기/항목/경로/SFTP 설정 (시스템 설정 섹션)
- **JIRA 연동**: 지원 로그에 JIRA 티켓 입력 및 바로가기 연결
  - 시스템 설정에 JIRA URL 활성화 항목 추가 (`jiraEnabled`, `jiraBaseUrl`)
- **서버 접근 정보**: 고객사 상세에서 서버 접근 정보 기록 기능 추가
  - 민감 정보 블러(blur) 표시 처리

### Changed
- 형상 관리 OS 타입/종류 항목 통합, 시리얼 넘버 항목 추가
- 계약 정보에 POC(Proof of Concept) 항목 추가
- 알람 항목에 지원중 / 진행 불가 / 보류 상태 모두 표시
- 지원 중인 고객사 목록을 최신 이슈 순으로 정렬
- 공지사항 팝업에 "다시 보지 않기" 적용 개선
- Footer에 버전 정보 표시

### Fixed
- 사용자(user) 계정에서 JIRA 티켓 조회 불가 오류 수정
- `spawn mysqldump ENOENT` 에러 수정 (백업 실행 경로 문제)
- 전체 정보 내보내기 시 지원 로그 누락 오류 수정
- 일부 메뉴 접속 시 400 에러 발생 수정
- 점검서 보기 페이지 / 공지사항 팝업 400 에러 수정
- 이미 작성된 공지사항 수정 불가 오류 수정

---

## 이전 버전 (Semantic Versioning)

아래 버전들은 CalVer 전환 이전에 Semantic Versioning(`MAJOR.MINOR.PATCH`)으로 관리되었습니다.

### [2.4.0]

- 공지사항 기능 추가 (Rich Text, 팝업 안내)
- 점검서 양식 업로드 및 다운로드 기능 구현 (docxtemplater)
- 고객사별 누락 점검서 모니터링 기능 추가
- 진행 중인 이슈 알림 기능 추가

### [2.3.0]

- 고객사 관리 페이지 검색 및 필터 기능 추가
- 전체 고객사 요약 탭 추가 (하드웨어 포함 여부, 계약기간 표시)
- 담당자별 담당 고객사 수 기록 기능 추가
- 계약 정보에 하드웨어 포함 여부 항목 추가
- 미완료 고객사 대상 조회 기능 추가

### [2.2.0]

- 지원 로그 항목 세분화 및 예시 추가
- 지원 로그 엑셀 내보내기 중앙 정렬 개선
- 고객사 관리 페이지 뒤로가기 버튼 및 페이지 유지 개선
- 웹페이지 전환 시 시스템 로그에 로그아웃으로 기록되던 오류 수정
- 중복 고객사 생성 오류 및 세션 유지 오류 수정

### [2.1.0]

- 형상 관리(소스 버전 관리) 기능 추가
- 서버 정보 탭 추가
- 고객사 상세 탭 구조 개선 (기본정보/점검항목/소스관리/서버정보/지원로그)

### [2.0.0]

- NestJS + React + MariaDB 기반 전면 재구축
- JWT 인증 (Access/Refresh Token), Passport.js 적용
- Docker Compose 기반 배포 환경 구성
- 역할 기반 접근 제어 (super_admin / admin / user)
- 고객사 CRUD, 점검 항목, 지원 이력 관리 기능
