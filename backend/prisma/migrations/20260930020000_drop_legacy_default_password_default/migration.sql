-- 구 마이그레이션 체인(26.9.0 이전)으로 설치된 DB에 남은 DEFAULT '1111' 제거.
-- 신규 설치 DB에는 기본값이 없으므로 변경 없음. 기존 값은 유지된다.
ALTER TABLE `system_settings` ALTER COLUMN `default_password` DROP DEFAULT;
