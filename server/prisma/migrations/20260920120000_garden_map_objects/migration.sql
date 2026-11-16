-- CreateEnum
CREATE TYPE "MapObjectType" AS ENUM ('HOUSE', 'SHED', 'PATH', 'TREE', 'WATER', 'OTHER');

-- CreateTable
CREATE TABLE "GardenMapObject" (
    "id" UUID NOT NULL,
    "gardenId" UUID NOT NULL,
    "type" "MapObjectType" NOT NULL DEFAULT 'HOUSE',
    "name" VARCHAR(120) NOT NULL,
    "positionX" DECIMAL(12,4) NOT NULL,
    "positionY" DECIMAL(12,4) NOT NULL,
    "width" DECIMAL(12,4) NOT NULL,
    "height" DECIMAL(12,4) NOT NULL,
    "rotation" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "color" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GardenMapObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GardenMapObject_gardenId_deletedAt_idx" ON "GardenMapObject"("gardenId", "deletedAt");

-- AddForeignKey
ALTER TABLE "GardenMapObject" ADD CONSTRAINT "GardenMapObject_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
