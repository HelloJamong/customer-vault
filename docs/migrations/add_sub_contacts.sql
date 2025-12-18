-- 고객사 부담당자 필드 추가 (정 담당자 1명, 부 담당자 3명)
ALTER TABLE customers 
ADD COLUMN contact_name_sub1 VARCHAR(100) COMMENT '부담당자1 이름',
ADD COLUMN contact_position_sub1 VARCHAR(100) COMMENT '부담당자1 직급',
ADD COLUMN contact_department_sub1 VARCHAR(100) COMMENT '부담당자1 소속',
ADD COLUMN contact_mobile_sub1 VARCHAR(50) COMMENT '부담당자1 휴대전화',
ADD COLUMN contact_phone_sub1 VARCHAR(50) COMMENT '부담당자1 내선',
ADD COLUMN contact_email_sub1 VARCHAR(120) COMMENT '부담당자1 이메일',

ADD COLUMN contact_name_sub2 VARCHAR(100) COMMENT '부담당자2 이름',
ADD COLUMN contact_position_sub2 VARCHAR(100) COMMENT '부담당자2 직급',
ADD COLUMN contact_department_sub2 VARCHAR(100) COMMENT '부담당자2 소속',
ADD COLUMN contact_mobile_sub2 VARCHAR(50) COMMENT '부담당자2 휴대전화',
ADD COLUMN contact_phone_sub2 VARCHAR(50) COMMENT '부담당자2 내선',
ADD COLUMN contact_email_sub2 VARCHAR(120) COMMENT '부담당자2 이메일',

ADD COLUMN contact_name_sub3 VARCHAR(100) COMMENT '부담당자3 이름',
ADD COLUMN contact_position_sub3 VARCHAR(100) COMMENT '부담당자3 직급',
ADD COLUMN contact_department_sub3 VARCHAR(100) COMMENT '부담당자3 소속',
ADD COLUMN contact_mobile_sub3 VARCHAR(50) COMMENT '부담당자3 휴대전화',
ADD COLUMN contact_phone_sub3 VARCHAR(50) COMMENT '부담당자3 내선',
ADD COLUMN contact_email_sub3 VARCHAR(120) COMMENT '부담당자3 이메일';

-- 사내 담당 엔지니어 부담당자 필드 추가
ALTER TABLE customers
ADD COLUMN engineer_sub_id INTEGER COMMENT '부담당 엔지니어 ID',
ADD CONSTRAINT fk_engineer_sub FOREIGN KEY (engineer_sub_id) REFERENCES users(id) ON DELETE SET NULL;
