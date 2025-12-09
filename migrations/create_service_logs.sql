-- Create service_logs table
CREATE TABLE IF NOT EXISTS service_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    log_type VARCHAR(20) NOT NULL COMMENT '정상, 경고, 오류, 정보',
    action VARCHAR(50) NOT NULL COMMENT '로그인, 로그아웃, 패스워드 변경 등',
    description TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_log_type (log_type),
    INDEX idx_action (action),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='서비스 로그';
