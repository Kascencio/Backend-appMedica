-- AlterTable
ALTER TABLE `CaregiverProfile` ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `bloodType` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactName` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactPhone` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactRelation` VARCHAR(191) NULL,
    ADD COLUMN `gender` VARCHAR(191) NULL;
