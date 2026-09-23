-- CreateTable
CREATE TABLE `upgrade_progress_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `upgrade_plan_id` INTEGER NOT NULL,
    `log_date` DATE NOT NULL,
    `author_name` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `upgrade_progress_logs_upgrade_plan_id_log_date_idx`(`upgrade_plan_id`, `log_date`),
    INDEX `upgrade_progress_logs_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `upgrade_progress_logs`
    ADD CONSTRAINT `upgrade_progress_logs_upgrade_plan_id_fkey`
    FOREIGN KEY (`upgrade_plan_id`) REFERENCES `upgrade_plans`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upgrade_progress_logs`
    ADD CONSTRAINT `upgrade_progress_logs_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
