/*
  Warnings:

  - You are about to drop the column `latitude` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `attendance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `attendance` DROP COLUMN `latitude`,
    DROP COLUMN `longitude`,
    ADD COLUMN `latitudeIn` DOUBLE NULL,
    ADD COLUMN `latitudeOut` DOUBLE NULL,
    ADD COLUMN `longitudeIn` DOUBLE NULL,
    ADD COLUMN `longitudeOut` DOUBLE NULL,
    ADD COLUMN `proofOfWorkName` VARCHAR(191) NULL,
    ADD COLUMN `proofOfWorkUrl` VARCHAR(191) NULL,
    ADD COLUMN `workMode` ENUM('WFO', 'WFH') NOT NULL DEFAULT 'WFO',
    MODIFY `method` ENUM('GPS', 'IP', 'MANUAL') NOT NULL,
    MODIFY `status` ENUM('ONTIME', 'LATE', 'ABSENT', 'EARLY_LEAVE') NOT NULL;

-- AlterTable
ALTER TABLE `attendance_config` ADD COLUMN `allowWFH` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `requireProofOfWork` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `attendance_workMode_idx` ON `attendance`(`workMode`);
