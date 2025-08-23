/*
  Warnings:

  - You are about to drop the column `age` on the `PatientProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `PatientProfile` DROP COLUMN `age`,
    ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `bloodType` VARCHAR(191) NULL,
    ADD COLUMN `chronicDiseases` VARCHAR(191) NULL,
    ADD COLUMN `currentConditions` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactName` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactPhone` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactRelation` VARCHAR(191) NULL,
    ADD COLUMN `gender` VARCHAR(191) NULL,
    ADD COLUMN `hospitalReference` VARCHAR(191) NULL;
