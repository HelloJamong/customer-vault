-- 초기 데이터베이스 설정 스크립트
-- 이 스크립트는 Docker 컨테이너 초기화 시 자동 실행됩니다

-- 기본 슈퍼 관리자 계정 생성은 Prisma 마이그레이션 후 수동으로 진행하거나
-- 별도의 시드 스크립트로 처리합니다

-- 데이터베이스가 생성되었는지 확인
SELECT 'Database initialized successfully' as message;
