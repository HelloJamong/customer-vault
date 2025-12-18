-- 모든 로그 및 잔여 데이터 삭제 및 AUTO_INCREMENT 초기화
-- 테스트 환경 구성을 위한 완전 초기화 스크립트

SET FOREIGN_KEY_CHECKS=0;

-- 모든 로그 테이블 삭제
TRUNCATE TABLE service_logs;
TRUNCATE TABLE login_attempts;
TRUNCATE TABLE user_sessions;

-- 점검서 및 관계 테이블 삭제
TRUNCATE TABLE documents;
TRUNCATE TABLE user_customers;

-- 핵심 데이터 테이블 삭제
TRUNCATE TABLE users;
TRUNCATE TABLE customers;

-- AUTO_INCREMENT 값 1로 초기화
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE customers AUTO_INCREMENT = 1;
ALTER TABLE documents AUTO_INCREMENT = 1;
ALTER TABLE service_logs AUTO_INCREMENT = 1;
ALTER TABLE login_attempts AUTO_INCREMENT = 1;
ALTER TABLE user_sessions AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS=1;
