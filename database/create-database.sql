-- Haulbook: create the database and all tables in TiDB.
--
-- How to use
--   1. TiDB Cloud console -> your cluster -> SQL Editor (or any MySQL client).
--   2. Paste this whole file and run it.
--   3. Make sure your DATABASE_URL ends with the same database name:
--        mysql://USER:PASSWORD@HOST:4000/haulbook?sslaccept=strict
--
-- To use a different database name, change `haulbook` on the two lines below.
-- The script creates empty tables only. It contains no data.
-- It will stop with "table already exists" if run twice, so nothing is overwritten.

CREATE DATABASE IF NOT EXISTS `haulbook` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `haulbook`;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `tutorialDone` BOOLEAN NOT NULL DEFAULT false,
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(160) NOT NULL,
    `tradingName` VARCHAR(160) NULL,
    `regNumber` VARCHAR(60) NULL,
    `vatNumber` VARCHAR(60) NULL,
    `email` VARCHAR(190) NULL,
    `phone` VARCHAR(40) NULL,
    `website` VARCHAR(190) NULL,
    `addressLine1` VARCHAR(190) NULL,
    `addressLine2` VARCHAR(190) NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `postalCode` VARCHAR(20) NULL,
    `country` VARCHAR(100) NULL,
    `logo` MEDIUMTEXT NULL,
    `accentColor` VARCHAR(9) NOT NULL DEFAULT '#0f766e',
    `bankName` VARCHAR(120) NULL,
    `bankAccountName` VARCHAR(160) NULL,
    `bankAccountNumber` VARCHAR(60) NULL,
    `bankBranchCode` VARCHAR(40) NULL,
    `bankAccountType` VARCHAR(60) NULL,
    `bankSwift` VARCHAR(40) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'ZAR',
    `taxRegistered` BOOLEAN NOT NULL DEFAULT true,
    `taxLabel` VARCHAR(20) NOT NULL DEFAULT 'VAT',
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 15,
    `invoicePrefix` VARCHAR(12) NOT NULL DEFAULT 'INV-',
    `invoiceNext` INTEGER NOT NULL DEFAULT 1,
    `quotePrefix` VARCHAR(12) NOT NULL DEFAULT 'QUO-',
    `quoteNext` INTEGER NOT NULL DEFAULT 1,
    `loadPrefix` VARCHAR(12) NOT NULL DEFAULT 'LD-',
    `loadNext` INTEGER NOT NULL DEFAULT 1,
    `paymentTermsDays` INTEGER NOT NULL DEFAULT 30,
    `invoiceNotes` TEXT NULL,
    `quoteNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('CUSTOMER', 'SUBCONTRACTOR') NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `contactPerson` VARCHAR(120) NULL,
    `email` VARCHAR(190) NULL,
    `phone` VARCHAR(40) NULL,
    `vatNumber` VARCHAR(60) NULL,
    `regNumber` VARCHAR(60) NULL,
    `address` TEXT NULL,
    `paymentTerms` INTEGER NULL,
    `notes` TEXT NULL,
    `bankName` VARCHAR(120) NULL,
    `bankAccountName` VARCHAR(160) NULL,
    `bankAccountNumber` VARCHAR(60) NULL,
    `bankBranchCode` VARCHAR(40) NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Contact_kind_archived_name_idx`(`kind`, `archived`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Load` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(30) NOT NULL,
    `status` ENUM('PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `customerId` VARCHAR(191) NOT NULL,
    `subcontractorId` VARCHAR(191) NULL,
    `customerRef` VARCHAR(80) NULL,
    `origin` VARCHAR(190) NOT NULL,
    `destination` VARCHAR(190) NOT NULL,
    `pickupDate` DATE NOT NULL,
    `deliveryDate` DATE NULL,
    `cargo` VARCHAR(255) NULL,
    `vehicleReg` VARCHAR(60) NULL,
    `driverName` VARCHAR(120) NULL,
    `driverPhone` VARCHAR(40) NULL,
    `customerRate` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `subRate` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `podReceived` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Load_number_key`(`number`),
    INDEX `Load_customerId_idx`(`customerId`),
    INDEX `Load_subcontractorId_idx`(`subcontractorId`),
    INDEX `Load_status_pickupDate_idx`(`status`, `pickupDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('INVOICE', 'QUOTE') NOT NULL,
    `number` VARCHAR(30) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'PAID', 'VOID', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'DRAFT',
    `customerId` VARCHAR(191) NOT NULL,
    `issueDate` DATE NOT NULL,
    `dueDate` DATE NOT NULL,
    `reference` VARCHAR(80) NULL,
    `notes` TEXT NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `amountPaid` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `sentAt` DATETIME(3) NULL,
    `quoteId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Document_customerId_idx`(`customerId`),
    INDEX `Document_kind_status_dueDate_idx`(`kind`, `status`, `dueDate`),
    INDEX `Document_kind_issueDate_idx`(`kind`, `issueDate`),
    UNIQUE INDEX `Document_kind_number_key`(`kind`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentLine` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `loadId` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `DocumentLine_documentId_idx`(`documentId`),
    INDEX `DocumentLine_loadId_idx`(`loadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bill` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(60) NOT NULL,
    `status` ENUM('OPEN', 'PAID', 'VOID') NOT NULL DEFAULT 'OPEN',
    `subcontractorId` VARCHAR(191) NOT NULL,
    `loadId` VARCHAR(191) NULL,
    `issueDate` DATE NOT NULL,
    `dueDate` DATE NOT NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `amountPaid` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Bill_subcontractorId_idx`(`subcontractorId`),
    INDEX `Bill_loadId_idx`(`loadId`),
    INDEX `Bill_status_dueDate_idx`(`status`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `date` DATE NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `method` ENUM('EFT', 'CASH', 'CARD', 'CHEQUE', 'OTHER') NOT NULL DEFAULT 'EFT',
    `reference` VARCHAR(120) NULL,
    `notes` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_contactId_idx`(`contactId`),
    INDEX `Payment_documentId_idx`(`documentId`),
    INDEX `Payment_billId_idx`(`billId`),
    INDEX `Payment_direction_date_idx`(`direction`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `vendor` VARCHAR(160) NULL,
    `description` VARCHAR(255) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `taxAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `method` ENUM('EFT', 'CASH', 'CARD', 'CHEQUE', 'OTHER') NOT NULL DEFAULT 'EFT',
    `reference` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expense_date_idx`(`date`),
    INDEX `Expense_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `loadId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(40) NOT NULL,
    `name` VARCHAR(190) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `data` LONGBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Attachment_loadId_idx`(`loadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

