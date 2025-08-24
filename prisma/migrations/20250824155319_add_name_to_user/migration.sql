/*
  Warnings:

  - You are about to drop the column `name` on the `CaregiverProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `CaregiverProfile` DROP COLUMN `name`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `name` VARCHAR(191) NULL;
