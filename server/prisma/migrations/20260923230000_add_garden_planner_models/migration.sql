-- CreateEnum
CREATE TYPE "PlanObjectType" AS ENUM ('HOUSE', 'SHED', 'GAZEBO', 'BBQ', 'GREENHOUSE', 'GARAGE', 'WELL', 'BOREHOLE', 'COMPOSTER', 'POND', 'POOL', 'FENCE', 'GATE', 'PATH', 'TREE', 'BUSH', 'FLOWERBED', 'RAISED_BED', 'LAWN', 'PARKING', 'TOILET', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PlanObjectLayer" AS ENUM ('BUILDINGS', 'UTILITIES', 'PLANTS', 'PATHS', 'OTHER');

-- CreateTable
CREATE TABLE "GardenPlan" (
    "id" UUID NOT NULL,
    "gardenId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL DEFAULT 'Основний план',
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "boundary" JSONB,
    "northAngleDeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gridSizeCm" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GardenPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanObject" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "type" "PlanObjectType" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "xCm" DOUBLE PRECISION NOT NULL,
    "yCm" DOUBLE PRECISION NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "rotationDeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "layer" "PlanObjectLayer" NOT NULL DEFAULT 'OTHER',
    "color" VARCHAR(32),
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "zoneId" UUID,
    "plantId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlanObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GardenPlan_gardenId_deletedAt_idx" ON "GardenPlan"("gardenId", "deletedAt");
CREATE INDEX "GardenPlan_gardenId_isActive_idx" ON "GardenPlan"("gardenId", "isActive");

-- CreateIndex
CREATE INDEX "PlanObject_planId_deletedAt_idx" ON "PlanObject"("planId", "deletedAt");
CREATE INDEX "PlanObject_zoneId_idx" ON "PlanObject"("zoneId");
CREATE INDEX "PlanObject_plantId_idx" ON "PlanObject"("plantId");

-- AddForeignKey
ALTER TABLE "GardenPlan" ADD CONSTRAINT "GardenPlan_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanObject" ADD CONSTRAINT "PlanObject_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GardenPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanObject" ADD CONSTRAINT "PlanObject_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "GardenZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanObject" ADD CONSTRAINT "PlanObject_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
