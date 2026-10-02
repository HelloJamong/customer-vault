# Customer Vault 매뉴얼

| 문서 | 대상 |
|---|---|
| [user-manual.md](user-manual.md) | 일반 사용자 |
| [admin-manual.md](admin-manual.md) | 관리자, 슈퍼관리자, 서버 운영 담당자 |

기준 버전: 26.11.2

## Word(docx) 변환

[pandoc](https://pandoc.org/)으로 변환합니다. A4 세로 양식은 `reference.docx`로 지정합니다.

1. 기본 양식 파일을 만듭니다.

   ```bash
   pandoc -o reference.docx --print-default-data-file reference.docx
   ```

2. `reference.docx`를 Word로 열어 **레이아웃 → 크기 → A4**, **방향 → 세로**로 바꾸고, 제목·본문·표 스타일과 머리글·바닥글(쪽 번호)을 지정한 뒤 저장합니다.
3. 변환합니다. 이 폴더에서 실행해야 이미지 경로가 맞습니다.

   ```bash
   pandoc user-manual.md  -o user-manual.docx  --reference-doc=reference.docx --toc --toc-depth=2
   pandoc admin-manual.md -o admin-manual.docx --reference-doc=reference.docx --toc --toc-depth=2
   ```

- 문서 맨 위의 `title`/`subtitle`/`date`는 표지 정보로 변환됩니다.
- `<!-- 캡처: ... -->` 주석은 변환 결과에 나타나지 않습니다.
- 아직 없는 이미지는 경고만 나오고 변환은 계속됩니다.

## 화면 캡처 목록

아래 경로에 이미지를 저장하면 변환 시 자동으로 들어갑니다. **실제 고객 정보가 보이지 않도록 샘플 데이터로 캡처**하고, QR 코드·패스워드 등은 가려 주세요.

| 파일 | 그림 | 캡처 내용 |
|---|---|---|
| `images/user/01-01-login.png` | 그림 1-1 로그인 화면 | /login 화면 전체. ① 아이디 ② 패스워드 ③ 로그인 버튼 표시 |
| `images/user/01-02-change-password.png` | 그림 1-2 비밀번호 변경 창 | 우측 상단 프로필 → 패스워드 변경 다이얼로그. 비밀번호 요구사항 영역 표시 |
| `images/user/01-03-mfa-setup.png` | 그림 1-3 2차 인증 등록 | 2차 인증 등록 다이얼로그(QR 코드 영역은 흐리게 처리) |
| `images/user/01-04-layout.png` | 그림 1-4 기본 화면 구성 | 로그인 직후 대시보드. ① 상단 메뉴 ② 다크모드 전환 ③ 알림 벨 ④ 사용자 메뉴 |
| `images/user/02-01-dashboard.png` | 그림 2-1 대시보드 | 일반사용자 계정의 대시보드. ① 내 담당 고객사 점검 현황 ② 담당 고객사 목록 ③ 바로가기 버튼 |
| `images/user/03-01-customers.png` | 그림 3-1 고객사 목록 | /customers. ① 검색/필터 ② 고객사 추가 ③ 행별 바로가기 버튼(회의록·점검서·업그레이드 계획·구성 정보·유지보수 정보·지원 목록) ④ 페이지 이동 |
| `images/user/03-02-customer-detail.png` | 그림 3-2 고객사 상세 | /customers/:id. 기본 정보·담당자·계약·점검·엔지니어 영역 |
| `images/user/03-03-customer-edit.png` | 그림 3-3 고객사 정보 수정 | /customers/:id/edit. ① 점검 대상 제품 추가 ② 저장 |
| `images/user/03-04-documents.png` | 그림 3-4 고객사 점검서 목록 | /customers/:id/documents. ① 점검 항목별 점검서 양식 업로드/다운로드 ② 날짜 필터 ③ 점검서 목록 |
| `images/user/03-05-document-upload.png` | 그림 3-5 점검서 업로드 | 상단 메뉴 점검서 업로드 화면. ① 고객사 ② 점검 대상 ③ 점검 방식 ④ 점검일 ⑤ 미보관 체크 ⑥ 파일 선택 |
| `images/user/03-06-upgrade-plan.png` | 그림 3-6 업그레이드 계획 | /customers/:id/upgrade-plan. ① 일정 상태 ② 버전·일정 ③ 공통 고려 사항 ④ 커스텀 항목 ⑤ 진척 현황 |
| `images/user/03-07-source-management.png` | 그림 3-7 구성 정보 | /customers/:id/source-management. ① 엑셀로 내보내기 ② 수정 ③ 가상PC 이미지 관리 ④ 서버 접근 정보(민감 정보) |
| `images/user/03-08-source-management-edit.png` | 그림 3-8 구성 정보 수정 | 수정 화면의 가상PC 이미지 영역. ① 이미지 정보 추가 ② 이미지 n/30개 ③ 체크리스트 |
| `images/user/03-09-rebuild.png` | 그림 3-9 재제작 | 이미지 카드의 재제작 버튼과 재제작 다이얼로그 |
| `images/user/03-10-support-logs.png` | 그림 3-10 지원 목록 | /customers/:id/support-logs. ① 진행 중인 문의 사항(통계) ② 필터 ③ 엑셀로 내보내기 ④ 지원 로그 추가 ⑤ 상세 버튼 |
| `images/user/03-11-support-log-add.png` | 그림 3-11 지원 로그 추가 | 지원 로그 추가 다이얼로그 |
| `images/user/03-12-support-log-detail.png` | 그림 3-12 지원 로그 상세 | 상세 다이얼로그 보기 모드. ① 수정(연필) ② 진척 사항 표 ③ 지원 내역 추가 ④ 삭제 |
| `images/user/03-13-support-log-edit.png` | 그림 3-13 지원 로그 편집 모드 | 상세 다이얼로그 편집 모드. 진척 사항 안내 문구 표시 |
| `images/user/03-14-meeting-minutes.png` | 그림 3-14 회의록 | /customers/:id/meeting-minutes. ① 회의록 작성 ② 보기/수정/삭제/내보내기 |
| `images/user/04-01-notices.png` | 그림 4-1 공지사항 | /notices 목록과 상세보기 |
| `images/admin/01-01-menu.png` | 그림 1-1 관리자 상단 메뉴 | 슈퍼관리자 로그인 상단 메뉴. ① 계정관리 ② 업무 현황 ③ 서비스 로그 ④ 시스템 설정 ⑤ 백업 관리 |
| `images/admin/02-01-dashboard.png` | 그림 2-1 관리자 대시보드 | 관리자 대시보드. ① 사용자·고객사 수 ② 이번달 점검 현황 ③ 점검 완료율 ④ 스토리지·메모리 ⑤ 검증 대기 |
| `images/admin/03-01-users.png` | 그림 3-1 사용자 관리 | 계정관리 → 사용자 목록. ① 일반 사용자 추가 ② 상태 ③ 액션 메뉴 |
| `images/admin/03-02-user-actions.png` | 그림 3-2 액션 메뉴 | 목록 행의 액션 메뉴(⋮) 펼친 상태 |
| `images/admin/04-01-inspections.png` | 그림 4-1 점검 현황 | 업무 현황 → 점검 현황 목록과 '자세히 보기' 다이얼로그 |
| `images/admin/04-02-assignments.png` | 그림 4-2 고객사 담당 현황 | 업무 현황 → 고객사 담당 현황 |
| `images/admin/05-01-customer-delete.png` | 그림 5-1 고객사 삭제 | 고객사 정보 수정 화면 하단 고객사 삭제와 확인 다이얼로그 |
| `images/admin/05-02-notice-write.png` | 그림 5-2 공지사항 작성 | 공지사항 작성 다이얼로그 |
| `images/admin/06-01-logs.png` | 그림 6-1 서비스 로그 | 로그인 이력 화면. ① 날짜·계정·구분 필터 ② 로그·IP 검색 ③ 엑셀 다운로드 ④ 변경 내역 펼침 |
| `images/admin/07-01-settings.png` | 그림 7-1 시스템 설정 | 시스템 설정 전체(여러 장으로 나눠 캡처) |
| `images/admin/08-01-backup.png` | 그림 8-1 백업 관리 | 백업 관리 이력 목록. ① 즉시 백업 실행 ② 유형·대상·상태 ③ 다운로드 |
