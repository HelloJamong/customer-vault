ALTER TABLE `system_settings`
  ADD COLUMN `otp_apply_to_administrators` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `otp_apply_to_tech_department` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `otp_apply_to_sales_department` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `otp_apply_to_dev_department` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `ip_restriction_enabled` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `user_allowed_ips` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `user_allowed_ips_user_id_ip_address_key`(`user_id`, `ip_address`),
  INDEX `user_allowed_ips_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `user_allowed_ips_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
