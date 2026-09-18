# Backend 테스트 가이드

## 검증 명령

`backend` 디렉터리에서 실행합니다.

```bash
npm ci
npm run lint             # 검사만 수행
npm run build
npm run test:security    # Mock 기반 보안 회귀 테스트
npm run test:e2e         # 격리된 Docker DB/backend를 띄우는 API E2E
npm run test:all         # 위 검증 전체
bash scripts/check-secrets.sh  # 테스트 시크릿·자격증명 상수 정적 검사
```

`npm run lint:fix`는 자동 수정이 필요한 경우에만 사용합니다. 기본 `lint`는 소스 파일을 변경하지 않습니다.

테스트 벡터를 포함한 모든 시크릿·비밀번호·토큰은 소스에 직접 문자열로 기록하지 않습니다. 필요한 테스트 값은 런타임에 생성하거나 환경변수로 주입하고, 커밋 전 `scripts/check-secrets.sh`를 실행합니다. 동일 검사는 Docker 배포 전 GitHub Actions에서도 자동 수행됩니다.

## E2E 테스트 환경

`npm run test:e2e`는 기존 운영 Compose 프로젝트와 분리된 환경을 사용합니다.

- 별도 Compose 프로젝트와 컨테이너 이름
- 별도 Docker 볼륨
- 기본 포트 `127.0.0.1:15000`
- 테스트 전용 DB 비밀번호와 암호화 키
- 테스트가 끝나면 컨테이너와 볼륨 자동 삭제
- 운영 `.env`, `data/mariadb`, `uploads`, `backups`를 사용하지 않음

현재 E2E는 다음 보안 흐름을 검증합니다.

1. DB 연결 상태
2. 비인증 고객사 API 차단
3. 최초 admin 로그인
4. 비밀번호 변경 전 대시보드 접근 차단
5. 로그인 화면 흐름에서 비밀번호 변경
6. 변경 후 대시보드 접근 허용
7. 로그아웃 후 기존 세션 무효화
8. 변경된 비밀번호로 재로그인
9. OTP 전역 정책 활성화 및 미등록 사용자 등록 요구
10. TOTP QR/수동키 등록 확인
11. 등록된 사용자의 OTP 로그인 및 대시보드 접근

## CI 원칙

이미지 배포 전에 lint, build, 보안 회귀 테스트, E2E가 모두 성공해야 합니다. E2E는 테스트 전용 환경에서만 실행하며 운영 데이터나 운영 비밀값을 참조하지 않습니다.
