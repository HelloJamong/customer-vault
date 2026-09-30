-- AlterTable
ALTER TABLE `virtual_pc_images` ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `virtual_pc_image_revisions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_management_id` INTEGER NOT NULL,
    `virtual_pc_image_id` INTEGER NOT NULL,
    `revision` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `rebuilt_on` DATE NOT NULL,
    `snapshot` JSON NOT NULL,
    `created_by_user_id` INTEGER NULL,
    `created_by_name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `virtual_pc_image_revisions_virtual_pc_image_id_revision_key`(`virtual_pc_image_id`, `revision`),
    INDEX `virtual_pc_image_revisions_source_management_id_idx`(`source_management_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `virtual_pc_image_revisions`
    ADD CONSTRAINT `virtual_pc_image_revisions_source_management_id_fkey`
    FOREIGN KEY (`source_management_id`) REFERENCES `source_management`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
