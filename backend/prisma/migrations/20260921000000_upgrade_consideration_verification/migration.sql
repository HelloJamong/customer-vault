-- AlterTable
ALTER TABLE `upgrade_considerations`
    ADD COLUMN `verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `verified_by_user_id` INTEGER NULL,
    ADD COLUMN `verified_by_name` VARCHAR(100) NULL,
    ADD COLUMN `verified_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `upgrade_considerations_verified_by_user_id_idx`
    ON `upgrade_considerations`(`verified_by_user_id`);

-- AddForeignKey
ALTER TABLE `upgrade_considerations`
    ADD CONSTRAINT `upgrade_considerations_verified_by_user_id_fkey`
    FOREIGN KEY (`verified_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
