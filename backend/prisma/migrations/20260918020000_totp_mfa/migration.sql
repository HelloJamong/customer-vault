ALTER TABLE `users`
    ADD COLUMN `mfa_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mfa_secret_encrypted` VARCHAR(512) NULL,
    ADD COLUMN `mfa_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `mfa_last_used_step` INTEGER NULL;

ALTER TABLE `system_settings`
    ADD COLUMN `otp_enabled` BOOLEAN NOT NULL DEFAULT false;
