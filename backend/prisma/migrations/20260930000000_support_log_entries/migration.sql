-- CreateTable
CREATE TABLE `support_log_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `support_log_id` INTEGER NOT NULL,
    `entry_date` DATE NOT NULL,
    `author_name` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `support_log_entries_support_log_id_entry_date_idx`(`support_log_id`, `entry_date`),
    INDEX `support_log_entries_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `support_log_entries`
    ADD CONSTRAINT `support_log_entries_support_log_id_fkey`
    FOREIGN KEY (`support_log_id`) REFERENCES `support_logs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_log_entries`
    ADD CONSTRAINT `support_log_entries_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
