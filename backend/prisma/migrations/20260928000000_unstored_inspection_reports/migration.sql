-- 점검은 완료했지만 점검서를 보관하지 않는 이력을 지원한다.
ALTER TABLE `documents`
    MODIFY `filename` VARCHAR(255) NULL,
    MODIFY `filepath` VARCHAR(500) NULL,
    ADD COLUMN `is_report_stored` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `report_not_stored_reason` TEXT NULL;
