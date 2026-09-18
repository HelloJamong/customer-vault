ALTER TABLE `system_settings`
    ADD COLUMN `session_timeout_minutes` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `session_timeout_warning_enabled` BOOLEAN NOT NULL DEFAULT true;
