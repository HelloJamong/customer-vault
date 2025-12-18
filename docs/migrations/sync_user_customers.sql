-- 기존 user_customers 관계를 담당 엔지니어 필드 기반으로 동기화
-- 이 스크립트는 고객사의 engineer_id와 engineer_sub_id 필드를 기반으로 
-- user_customers 테이블을 재구성합니다.

-- 1. 기존 user_customers 관계 모두 삭제
TRUNCATE TABLE user_customers;

-- 2. 담당 엔지니어가 지정된 고객사에 대해 관계 재생성
INSERT INTO user_customers (user_id, customer_id)
SELECT DISTINCT engineer_id, id
FROM customers
WHERE engineer_id IS NOT NULL;

-- 3. 부담당 엔지니어가 지정된 고객사에 대해 관계 추가 (중복 방지)
INSERT INTO user_customers (user_id, customer_id)
SELECT DISTINCT engineer_sub_id, id
FROM customers
WHERE engineer_sub_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_customers 
    WHERE user_id = customers.engineer_sub_id 
      AND customer_id = customers.id
  );
