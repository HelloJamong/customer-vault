-- AlterTable
ALTER TABLE `virtual_pc_images` ADD COLUMN `verifier_user_id` INTEGER NULL;
ALTER TABLE `upgrade_plans` ADD COLUMN `verifier_user_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `virtual_pc_images_verifier_user_id_idx` ON `virtual_pc_images`(`verifier_user_id`);
CREATE INDEX `upgrade_plans_verifier_user_id_idx` ON `upgrade_plans`(`verifier_user_id`);

-- AddForeignKey
ALTER TABLE `virtual_pc_images`
    ADD CONSTRAINT `virtual_pc_images_verifier_user_id_fkey`
    FOREIGN KEY (`verifier_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upgrade_plans`
    ADD CONSTRAINT `upgrade_plans_verifier_user_id_fkey`
    FOREIGN KEY (`verifier_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
