-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(80) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(120) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'user',
    `department` VARCHAR(20) NULL,
    `description` VARCHAR(200) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `customer_id` INTEGER NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `locked_until` DATETIME(3) NULL,
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `is_first_login` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `password_changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login` DATETIME(3) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `location` VARCHAR(200) NULL,
    `contact_name` VARCHAR(100) NULL,
    `contact_position` VARCHAR(100) NULL,
    `contact_department` VARCHAR(100) NULL,
    `contact_mobile` VARCHAR(50) NULL,
    `contact_phone` VARCHAR(50) NULL,
    `contact_email` VARCHAR(120) NULL,
    `contact_name_sub1` VARCHAR(100) NULL,
    `contact_position_sub1` VARCHAR(100) NULL,
    `contact_department_sub1` VARCHAR(100) NULL,
    `contact_mobile_sub1` VARCHAR(50) NULL,
    `contact_phone_sub1` VARCHAR(50) NULL,
    `contact_email_sub1` VARCHAR(120) NULL,
    `contact_name_sub2` VARCHAR(100) NULL,
    `contact_position_sub2` VARCHAR(100) NULL,
    `contact_department_sub2` VARCHAR(100) NULL,
    `contact_mobile_sub2` VARCHAR(50) NULL,
    `contact_phone_sub2` VARCHAR(50) NULL,
    `contact_email_sub2` VARCHAR(120) NULL,
    `contact_name_sub3` VARCHAR(100) NULL,
    `contact_position_sub3` VARCHAR(100) NULL,
    `contact_department_sub3` VARCHAR(100) NULL,
    `contact_mobile_sub3` VARCHAR(50) NULL,
    `contact_phone_sub3` VARCHAR(50) NULL,
    `contact_email_sub3` VARCHAR(120) NULL,
    `contract_type` VARCHAR(20) NOT NULL DEFAULT '만료',
    `contract_start_date` DATE NULL,
    `contract_end_date` DATE NULL,
    `hardware_included` BOOLEAN NOT NULL DEFAULT true,
    `inspection_cycle_type` VARCHAR(20) NOT NULL DEFAULT '매월',
    `inspection_cycle_month` INTEGER NULL,
    `last_inspection_date` DATE NULL,
    `operational_status` VARCHAR(20) NOT NULL DEFAULT '운영중',
    `notes` TEXT NULL,
    `engineer_id` INTEGER NULL,
    `engineer_sub_id` INTEGER NULL,
    `sales_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_name_key`(`name`),
    INDEX `customers_engineer_id_idx`(`engineer_id`),
    INDEX `customers_sales_id_idx`(`sales_id`),
    INDEX `customers_contract_end_date_idx`(`contract_end_date`),
    INDEX `customers_last_inspection_date_idx`(`last_inspection_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_customers` (
    `user_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `customer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspection_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `target_type` VARCHAR(50) NOT NULL,
    `custom_name` VARCHAR(100) NULL,
    `product_name` VARCHAR(100) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `template_path` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `inspection_target_id` INTEGER NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `filepath` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NULL,
    `uploaded_by` INTEGER NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `inspection_date` DATE NULL,
    `inspection_type` VARCHAR(20) NULL,

    INDEX `documents_customer_id_idx`(`customer_id`),
    INDEX `documents_uploaded_at_idx`(`uploaded_at`),
    INDEX `documents_inspection_date_idx`(`inspection_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `default_password` VARCHAR(50) NOT NULL,
    `password_min_length` INTEGER NOT NULL DEFAULT 8,
    `password_require_uppercase` BOOLEAN NOT NULL DEFAULT true,
    `password_require_special` BOOLEAN NOT NULL DEFAULT true,
    `password_require_number` BOOLEAN NOT NULL DEFAULT true,
    `password_expiry_enabled` BOOLEAN NOT NULL DEFAULT false,
    `password_expiry_days` INTEGER NOT NULL DEFAULT 90,
    `prevent_duplicate_login` BOOLEAN NOT NULL DEFAULT false,
    `login_failure_limit_enabled` BOOLEAN NOT NULL DEFAULT false,
    `login_failure_limit` INTEGER NOT NULL DEFAULT 5,
    `account_lock_minutes` INTEGER NOT NULL DEFAULT 10,
    `jira_enabled` BOOLEAN NOT NULL DEFAULT false,
    `jira_base_url` VARCHAR(255) NULL,
    `backup_enabled` BOOLEAN NOT NULL DEFAULT false,
    `backup_schedule_type` VARCHAR(10) NOT NULL DEFAULT 'daily',
    `backup_schedule_hour` INTEGER NOT NULL DEFAULT 2,
    `backup_schedule_day` INTEGER NULL,
    `backup_target_db` BOOLEAN NOT NULL DEFAULT true,
    `backup_target_docs` BOOLEAN NOT NULL DEFAULT true,
    `backup_dest_local` BOOLEAN NOT NULL DEFAULT true,
    `backup_dest_remote` BOOLEAN NOT NULL DEFAULT false,
    `backup_retention_count` INTEGER NOT NULL DEFAULT 7,
    `sftp_host` VARCHAR(255) NULL,
    `sftp_username` VARCHAR(100) NULL,
    `sftp_password` VARCHAR(500) NULL,
    `sftp_key_path` VARCHAR(500) NULL,
    `sftp_remote_path` VARCHAR(500) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `attempt_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `success` BOOLEAN NOT NULL DEFAULT false,
    `ip_address` VARCHAR(45) NULL,

    INDEX `login_attempts_user_id_attempt_time_idx`(`user_id`, `attempt_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `session_id` VARCHAR(255) NOT NULL,
    `login_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(45) NULL,

    UNIQUE INDEX `user_sessions_session_id_key`(`session_id`),
    INDEX `user_sessions_user_id_last_activity_idx`(`user_id`, `last_activity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `log_type` VARCHAR(20) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `before_value` TEXT NULL,
    `after_value` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `source_management` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `client_version` VARCHAR(100) NULL,
    `client_version_detail` VARCHAR(100) NULL,
    `client_custom_info` TEXT NULL,
    `virtual_pc_os_version` VARCHAR(50) NULL,
    `virtual_pc_build_version` VARCHAR(100) NULL,
    `virtual_pc_guest_addition` VARCHAR(100) NULL,
    `virtual_pc_image_info` TEXT NULL,
    `admin_web_version` VARCHAR(20) NULL,
    `admin_web_version_detail` VARCHAR(100) NULL,
    `admin_web_release_date` VARCHAR(20) NULL,
    `admin_web_custom_info` TEXT NULL,
    `redundancy_type` VARCHAR(20) NOT NULL DEFAULT '단일 구성',
    `hr_integration_enabled` BOOLEAN NOT NULL DEFAULT false,
    `hr_db_type` VARCHAR(50) NULL,
    `hr_db_version` VARCHAR(50) NULL,
    `hr_db_name` VARCHAR(100) NULL,
    `hr_db_host` VARCHAR(100) NULL,
    `hr_db_port` INTEGER NULL,
    `hr_db_username` VARCHAR(100) NULL,
    `hr_db_password` VARCHAR(512) NULL,
    `hr_user_sync_query` TEXT NULL,
    `hr_department_sync_query` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `source_management_customer_id_key`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hr_integration_mapping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_management_id` INTEGER NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `table_name` VARCHAR(100) NOT NULL,
    `db_field_name` VARCHAR(100) NOT NULL,
    `vmfort_field_name` VARCHAR(100) NOT NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `description` VARCHAR(500) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hr_integration_mapping_source_management_id_category_idx`(`source_management_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `server_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_management_id` INTEGER NOT NULL,
    `server_type` VARCHAR(50) NOT NULL,
    `manufacturer` VARCHAR(100) NULL,
    `model_name` VARCHAR(100) NULL,
    `hostname` VARCHAR(100) NULL,
    `serial_number` VARCHAR(100) NULL,
    `os_version` VARCHAR(50) NULL,
    `cpu_type` VARCHAR(100) NULL,
    `memory_capacity` VARCHAR(50) NULL,
    `disk_capacity` VARCHAR(50) NULL,
    `nic_fiber_count` INTEGER NOT NULL DEFAULT 0,
    `nic_utp_count` INTEGER NOT NULL DEFAULT 0,
    `power_supply_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `server_disk_group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `server_info_id` INTEGER NOT NULL,
    `purpose` VARCHAR(50) NULL,
    `raid_type` VARCHAR(20) NOT NULL DEFAULT '미확인',
    `disk_type` VARCHAR(30) NULL,
    `disk_count` INTEGER NULL,
    `disk_capacity_gb` INTEGER NULL,
    `disk_capacity_unit` VARCHAR(2) NOT NULL DEFAULT 'GB',
    `usable_capacity_gb` INTEGER NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `server_disk_group_server_info_id_idx`(`server_info_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `server_access_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_management_id` INTEGER NOT NULL,
    `access_type` VARCHAR(50) NOT NULL,
    `web_url` VARCHAR(200) NULL,
    `web_account` VARCHAR(100) NULL,
    `web_password` VARCHAR(512) NULL,
    `server_hostname` VARCHAR(100) NULL,
    `server_ip_address` VARCHAR(50) NULL,
    `server_ssh_port` INTEGER NULL,
    `server_root_accessible` VARCHAR(20) NULL,
    `server_ssh_account` VARCHAR(100) NULL,
    `server_ssh_password` VARCHAR(512) NULL,
    `server_root_password` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_pc_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_management_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `os_name` VARCHAR(100) NOT NULL,
    `os_edition` VARCHAR(100) NOT NULL,
    `os_release` VARCHAR(50) NOT NULL,
    `c_disk_capacity` INTEGER NOT NULL,
    `d_disk_capacity` INTEGER NULL,
    `license_status` VARCHAR(20) NOT NULL DEFAULT '미진행',
    `license_note` TEXT NULL,
    `hash_value` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `virtual_pc_images_source_management_id_idx`(`source_management_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_pc_installed_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `virtual_pc_image_id` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `version` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `virtual_pc_installed_programs_virtual_pc_image_id_idx`(`virtual_pc_image_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_pc_checklist_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `virtual_pc_image_id` INTEGER NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `item_key` VARCHAR(50) NOT NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `checked_by_user_id` INTEGER NULL,
    `checked_by_name` VARCHAR(100) NULL,
    `checked_at` DATETIME(3) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `virtual_pc_checklist_items_virtual_pc_image_id_idx`(`virtual_pc_image_id`),
    INDEX `virtual_pc_checklist_items_checked_by_user_id_idx`(`checked_by_user_id`),
    UNIQUE INDEX `virtual_pc_checklist_items_virtual_pc_image_id_item_key_key`(`virtual_pc_image_id`, `item_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `upgrade_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT '미정',
    `current_version` VARCHAR(50) NULL,
    `target_version` VARCHAR(50) NULL,
    `schedule_estimate` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `upgrade_plans_customer_id_key`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `upgrade_considerations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `upgrade_plan_id` INTEGER NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `feature` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(500) NULL,
    `checked_by_user_id` INTEGER NULL,
    `checked_by_name` VARCHAR(100) NULL,
    `checked_at` DATETIME(3) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `upgrade_considerations_upgrade_plan_id_category_idx`(`upgrade_plan_id`, `category`),
    INDEX `upgrade_considerations_checked_by_user_id_idx`(`checked_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `support_date` DATE NOT NULL,
    `inquirer` VARCHAR(100) NULL,
    `target` VARCHAR(200) NULL,
    `category` VARCHAR(100) NULL,
    `title` VARCHAR(200) NULL,
    `user_info` VARCHAR(200) NULL,
    `action_status` VARCHAR(50) NULL,
    `inquiry_content` TEXT NULL,
    `action_content` TEXT NULL,
    `action_result` TEXT NULL,
    `jira_ticket` VARCHAR(100) NULL,
    `remarks` TEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notice_views` (
    `user_id` INTEGER NOT NULL,
    `notice_id` INTEGER NOT NULL,
    `dont_show_again` BOOLEAN NOT NULL DEFAULT false,
    `viewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `notice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(20) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `targets` VARCHAR(50) NOT NULL,
    `destinations` VARCHAR(50) NOT NULL,
    `file_path` VARCHAR(500) NULL,
    `file_size` BIGINT NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `created_by` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meeting_minutes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `meeting_date` DATE NOT NULL,
    `attendees` VARCHAR(500) NULL,
    `location` VARCHAR(200) NULL,
    `subject` VARCHAR(300) NOT NULL,
    `content` LONGTEXT NULL,
    `decisions` LONGTEXT NULL,
    `remarks` TEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_engineer_id_fkey` FOREIGN KEY (`engineer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_engineer_sub_id_fkey` FOREIGN KEY (`engineer_sub_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_sales_id_fkey` FOREIGN KEY (`sales_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_customers` ADD CONSTRAINT `user_customers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_customers` ADD CONSTRAINT `user_customers_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_targets` ADD CONSTRAINT `inspection_targets_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_inspection_target_id_fkey` FOREIGN KEY (`inspection_target_id`) REFERENCES `inspection_targets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_logs` ADD CONSTRAINT `service_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `source_management` ADD CONSTRAINT `source_management_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_integration_mapping` ADD CONSTRAINT `hr_integration_mapping_source_management_id_fkey` FOREIGN KEY (`source_management_id`) REFERENCES `source_management`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_info` ADD CONSTRAINT `server_info_source_management_id_fkey` FOREIGN KEY (`source_management_id`) REFERENCES `source_management`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_disk_group` ADD CONSTRAINT `server_disk_group_server_info_id_fkey` FOREIGN KEY (`server_info_id`) REFERENCES `server_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_access_info` ADD CONSTRAINT `server_access_info_source_management_id_fkey` FOREIGN KEY (`source_management_id`) REFERENCES `source_management`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_pc_images` ADD CONSTRAINT `virtual_pc_images_source_management_id_fkey` FOREIGN KEY (`source_management_id`) REFERENCES `source_management`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_pc_installed_programs` ADD CONSTRAINT `virtual_pc_installed_programs_virtual_pc_image_id_fkey` FOREIGN KEY (`virtual_pc_image_id`) REFERENCES `virtual_pc_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_pc_checklist_items` ADD CONSTRAINT `virtual_pc_checklist_items_virtual_pc_image_id_fkey` FOREIGN KEY (`virtual_pc_image_id`) REFERENCES `virtual_pc_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_pc_checklist_items` ADD CONSTRAINT `virtual_pc_checklist_items_checked_by_user_id_fkey` FOREIGN KEY (`checked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upgrade_plans` ADD CONSTRAINT `upgrade_plans_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upgrade_considerations` ADD CONSTRAINT `upgrade_considerations_upgrade_plan_id_fkey` FOREIGN KEY (`upgrade_plan_id`) REFERENCES `upgrade_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upgrade_considerations` ADD CONSTRAINT `upgrade_considerations_checked_by_user_id_fkey` FOREIGN KEY (`checked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_logs` ADD CONSTRAINT `support_logs_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_logs` ADD CONSTRAINT `support_logs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notices` ADD CONSTRAINT `notices_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notice_views` ADD CONSTRAINT `user_notice_views_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notice_views` ADD CONSTRAINT `user_notice_views_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `backup_logs` ADD CONSTRAINT `backup_logs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meeting_minutes` ADD CONSTRAINT `meeting_minutes_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meeting_minutes` ADD CONSTRAINT `meeting_minutes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
