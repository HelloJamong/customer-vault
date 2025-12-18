-- User 테이블에 department 필드 추가

USE customer_db;

-- 소속 필드 추가 (기술팀, 영업팀)
ALTER TABLE users ADD COLUMN department VARCHAR(20) AFTER role;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX idx_user_department ON users(department);
