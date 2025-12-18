-- Add inspection_type column to documents table
ALTER TABLE documents 
ADD COLUMN inspection_type VARCHAR(20) COMMENT '점검 방식: 방문 또는 원격';

-- Update existing records to have NULL value (optional, can be set later)
-- If you want to set a default value for existing records:
-- UPDATE documents SET inspection_type = '방문' WHERE inspection_type IS NULL;
