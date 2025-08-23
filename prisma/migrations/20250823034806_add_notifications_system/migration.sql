/*
  Warnings:

  - You are about to drop the column `name` on the `PatientProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `PatientProfile` DROP COLUMN `name`;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('MEDICATION_REMINDER', 'APPOINTMENT_REMINDER', 'TREATMENT_UPDATE', 'EMERGENCY_ALERT', 'SYSTEM_MESSAGE', 'CAREGIVER_REQUEST', 'PERMISSION_UPDATE', 'GENERAL_INFO') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('UNREAD', 'READ', 'ARCHIVED') NOT NULL DEFAULT 'UNREAD',
    `metadata` JSON NULL,
    `scheduledFor` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_userId_status_idx`(`userId`, `status`),
    INDEX `Notification_userId_type_idx`(`userId`, `type`),
    INDEX `Notification_scheduledFor_idx`(`scheduledFor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
