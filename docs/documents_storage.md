# Documents Storage

점검서(문서) 업로드 시 파일이 저장되는 경로와 규칙을 정리했습니다.

## 기본 경로
- `UPLOAD_DIR` 환경변수 (기본값 `./uploads`)
- Docker 실행 시: 컨테이너 `/app/uploads` → 호스트 `./uploads` 볼륨에 매핑

## 저장 구조
- 디렉터리: `uploads/customer_{고객ID}/{YYYY}/{MM}/`
- 파일명: `{고객사명}_{제품명}_{N}월_정기점검보고서.pdf`
- 같은 이름이 존재하면 `_1`, `_2`… 숫자를 붙여 중복을 피함.
- 고객사명/제품명에 파일에 사용할 수 없는 문자는 `_`로 치환.

## 예시
- 고객 ID 12, 점검일 2025-12-21, 고객사명 “ACME”, 제품명 “WAF”인 경우  
  `uploads/customer_12/2025/12/ACME_WAF_12월_정기점검보고서.pdf`

## 참고
- 저장 경로 생성 및 파일 이동 로직: `backend/src/documents/documents.service.ts`
- DB에는 최종 `filename`/`filepath`/`fileSize` 등이 `documents` 테이블에 기록되며, 업로드 후 고객사의 최근 점검일을 갱신합니다.
