-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('BED', 'GREENHOUSE', 'ORCHARD', 'FLOWERBED', 'FIELD', 'OTHER');

-- CreateEnum
CREATE TYPE "PlantStatus" AS ENUM ('PLANNED', 'PLANTED', 'GROWING', 'FLOWERING', 'FRUITING', 'HARVESTING', 'FINISHED', 'HAS_PROBLEM');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('OBSERVATION', 'GROWTH', 'FLOWERING', 'FRUITING', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "HarvestUnit" AS ENUM ('GRAM', 'KILOGRAM', 'PIECE', 'LITER');

-- CreateEnum
CREATE TYPE "HarvestQuality" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR');

-- CreateEnum
CREATE TYPE "ProblemSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('DETECTED', 'MONITORING', 'TREATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CareActivityType" AS ENUM ('WATERING', 'FERTILIZING', 'PRUNING', 'TRANSPLANTING', 'PEST_TREATMENT', 'TYING', 'SOIL_TREATMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('GRAM', 'KILOGRAM');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('SQUARE_METER', 'HECTARE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "normalizedEmail" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'uk',
    "preferredWeightUnit" "WeightUnit" NOT NULL DEFAULT 'KILOGRAM',
    "preferredAreaUnit" "AreaUnit" NOT NULL DEFAULT 'SQUARE_METER',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Kyiv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "tokenFamily" UUID NOT NULL,
    "deviceName" VARCHAR(120),
    "ipHash" VARCHAR(128),
    "userAgent" VARCHAR(512),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garden" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "locationName" VARCHAR(200),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "area" DECIMAL(12,2),
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GardenZone" (
    "id" UUID NOT NULL,
    "gardenId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "ZoneType" NOT NULL DEFAULT 'BED',
    "description" VARCHAR(2000),
    "area" DECIMAL(12,2),
    "positionX" DECIMAL(12,4),
    "positionY" DECIMAL(12,4),
    "width" DECIMAL(12,4),
    "height" DECIMAL(12,4),
    "color" VARCHAR(32),
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GardenZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantType" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "scientificName" VARCHAR(200),
    "description" VARCHAR(2000),
    "defaultImageUrl" TEXT,
    "recommendedMinMoisture" INTEGER,
    "recommendedMaxMoisture" INTEGER,
    "recommendedTemperatureMin" DECIMAL(5,2),
    "recommendedTemperatureMax" DECIMAL(5,2),
    "typicalGrowingDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "plantTypeId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "variety" VARCHAR(120),
    "description" VARCHAR(2000),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "occupiedArea" DECIMAL(12,2),
    "plantedAt" TIMESTAMP(3),
    "expectedHarvestAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" "PlantStatus" NOT NULL DEFAULT 'PLANNED',
    "mainImageUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantJournalEntry" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "type" "JournalEntryType" NOT NULL DEFAULT 'OBSERVATION',
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(5000),
    "conditionScore" INTEGER,
    "height" DECIMAL(10,2),
    "heightUnit" VARCHAR(16),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "harvestedAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" "HarvestUnit" NOT NULL,
    "damagedQuantity" DECIMAL(14,3),
    "quality" "HarvestQuality" NOT NULL DEFAULT 'GOOD',
    "notes" VARCHAR(2000),
    "quantityGrams" DECIMAL(14,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Harvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantProblem" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(5000),
    "suspectedCause" VARCHAR(500),
    "severity" "ProblemSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ProblemStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "solution" VARCHAR(5000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareActivity" (
    "id" UUID NOT NULL,
    "plantId" UUID NOT NULL,
    "type" "CareActivityType" NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(14,3),
    "unit" VARCHAR(32),
    "productName" VARCHAR(200),
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gardenId" UUID,
    "zoneId" UUID,
    "plantId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(5000),
    "dueAt" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "completedAt" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "plantId" UUID,
    "journalEntryId" UUID,
    "problemId" UUID,
    "harvestId" UUID,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "originalFileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "route" VARCHAR(255) NOT NULL,
    "requestHash" VARCHAR(128) NOT NULL,
    "statusCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_normalizedEmail_key" ON "User"("normalizedEmail");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_expiresAt_idx" ON "Session"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_refreshTokenHash_idx" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_tokenFamily_idx" ON "Session"("tokenFamily");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Garden_ownerId_deletedAt_idx" ON "Garden"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "GardenZone_gardenId_deletedAt_idx" ON "GardenZone"("gardenId", "deletedAt");

-- CreateIndex
CREATE INDEX "PlantType_name_idx" ON "PlantType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlantType_name_key" ON "PlantType"("name");

-- CreateIndex
CREATE INDEX "Plant_zoneId_deletedAt_idx" ON "Plant"("zoneId", "deletedAt");

-- CreateIndex
CREATE INDEX "Plant_plantTypeId_idx" ON "Plant"("plantTypeId");

-- CreateIndex
CREATE INDEX "Plant_status_idx" ON "Plant"("status");

-- CreateIndex
CREATE INDEX "Plant_name_idx" ON "Plant"("name");

-- CreateIndex
CREATE INDEX "Plant_updatedAt_idx" ON "Plant"("updatedAt");

-- CreateIndex
CREATE INDEX "PlantJournalEntry_plantId_observedAt_idx" ON "PlantJournalEntry"("plantId", "observedAt");

-- CreateIndex
CREATE INDEX "PlantJournalEntry_authorId_idx" ON "PlantJournalEntry"("authorId");

-- CreateIndex
CREATE INDEX "Harvest_plantId_harvestedAt_idx" ON "Harvest"("plantId", "harvestedAt");

-- CreateIndex
CREATE INDEX "PlantProblem_plantId_status_severity_idx" ON "PlantProblem"("plantId", "status", "severity");

-- CreateIndex
CREATE INDEX "CareActivity_plantId_performedAt_idx" ON "CareActivity"("plantId", "performedAt");

-- CreateIndex
CREATE INDEX "Task_userId_status_dueAt_idx" ON "Task"("userId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_gardenId_idx" ON "Task"("gardenId");

-- CreateIndex
CREATE INDEX "Task_zoneId_idx" ON "Task"("zoneId");

-- CreateIndex
CREATE INDEX "Task_plantId_idx" ON "Task"("plantId");

-- CreateIndex
CREATE INDEX "Attachment_ownerId_deletedAt_idx" ON "Attachment"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Attachment_plantId_idx" ON "Attachment"("plantId");

-- CreateIndex
CREATE INDEX "Attachment_status_createdAt_idx" ON "Attachment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_key_key" ON "IdempotencyKey"("userId", "key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Garden" ADD CONSTRAINT "Garden_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenZone" ADD CONSTRAINT "GardenZone_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "GardenZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_plantTypeId_fkey" FOREIGN KEY ("plantTypeId") REFERENCES "PlantType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantJournalEntry" ADD CONSTRAINT "PlantJournalEntry_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantJournalEntry" ADD CONSTRAINT "PlantJournalEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantProblem" ADD CONSTRAINT "PlantProblem_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareActivity" ADD CONSTRAINT "CareActivity_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "GardenZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "PlantJournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "PlantProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "Harvest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

