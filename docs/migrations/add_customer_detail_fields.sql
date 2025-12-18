-- Customer 테이블 구조 변경
-- 기존 필드 삭제 및 새 필드 추가

USE customer_db;

-- 기존 필드 제거 (company, contact, email, address, inspection_cycle)
ALTER TABLE customers DROP COLUMN IF EXISTS company;
ALTER TABLE customers DROP COLUMN IF EXISTS contact;
ALTER TABLE customers DROP COLUMN IF EXISTS email;
ALTER TABLE customers DROP COLUMN IF EXISTS address;
ALTER TABLE customers DROP COLUMN IF EXISTS inspection_cycle;

-- 고객사 기본 정보
-- name은 이미 존재하므로 추가하지 않음
ALTER TABLE customers ADD COLUMN location VARCHAR(200) AFTER name;

-- 고객사 담당자 정보
ALTER TABLE customers ADD COLUMN contact_name VARCHAR(100) AFTER location;
ALTER TABLE customers ADD COLUMN contact_position VARCHAR(100) AFTER contact_name;
ALTER TABLE customers ADD COLUMN contact_department VARCHAR(100) AFTER contact_position;
ALTER TABLE customers ADD COLUMN contact_mobile VARCHAR(50) AFTER contact_department;
ALTER TABLE customers ADD COLUMN contact_phone VARCHAR(50) AFTER contact_mobile;
ALTER TABLE customers ADD COLUMN contact_email VARCHAR(120) AFTER contact_phone;

-- 계약 정보
ALTER TABLE customers ADD COLUMN contract_type VARCHAR(20) DEFAULT '미계약' AFTER contact_email;
ALTER TABLE customers ADD COLUMN contract_start_date DATE AFTER contract_type;
ALTER TABLE customers ADD COLUMN contract_end_date DATE AFTER contract_start_date;

-- 점검 정보
ALTER TABLE customers ADD COLUMN inspection_cycle_type VARCHAR(20) DEFAULT '매월' AFTER contract_end_date;
ALTER TABLE customers ADD COLUMN inspection_cycle_month INT AFTER inspection_cycle_type;
-- last_inspection_date는 이미 존재하므로 추가하지 않음

-- 비고
ALTER TABLE customers ADD COLUMN notes TEXT AFTER last_inspection_date;

-- 사내 담당자
ALTER TABLE customers ADD COLUMN engineer_id INT AFTER notes;
ALTER TABLE customers ADD COLUMN sales_id INT AFTER engineer_id;

-- 외래키 제약조건 추가
ALTER TABLE customers ADD CONSTRAINT fk_customer_engineer
    FOREIGN KEY (engineer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE customers ADD CONSTRAINT fk_customer_sales
    FOREIGN KEY (sales_id) REFERENCES users(id) ON DELETE SET NULL;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX idx_customer_contract_type ON customers(contract_type);
CREATE INDEX idx_customer_inspection_cycle ON customers(inspection_cycle_type);
CREATE INDEX idx_customer_engineer ON customers(engineer_id);
CREATE INDEX idx_customer_sales ON customers(sales_id);
