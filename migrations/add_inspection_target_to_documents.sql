-- Add inspection_target_id column to documents table for per-target uploads
ALTER TABLE documents 
ADD COLUMN inspection_target_id INT NULL COMMENT '연결된 점검 대상 ID' AFTER customer_id;

-- Add foreign key to inspection_targets (nullable to allow 기존 데이터 유지)
ALTER TABLE documents 
ADD CONSTRAINT fk_documents_inspection_target
FOREIGN KEY (inspection_target_id) REFERENCES inspection_targets(id)
ON DELETE SET NULL;
