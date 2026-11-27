-- AlterTable
CREATE TYPE "PlantTypeCategory" AS ENUM ('VEGETABLE', 'FRUIT', 'BERRY', 'HERB', 'FLOWER', 'TREE', 'SHRUB', 'OTHER');

-- AlterTable PlantType
DROP INDEX IF EXISTS "PlantType_name_key";
ALTER TABLE "PlantType" DROP CONSTRAINT IF EXISTS "PlantType_name_key";
ALTER TABLE "PlantType" ADD COLUMN "category" "PlantTypeCategory" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "PlantType" ADD COLUMN "ownerId" UUID;
ALTER TABLE "PlantType" ADD COLUMN "iconKey" VARCHAR(64);

CREATE INDEX "PlantType_category_idx" ON "PlantType"("category");
CREATE INDEX "PlantType_ownerId_idx" ON "PlantType"("ownerId");
CREATE UNIQUE INDEX "PlantType_system_name_key" ON "PlantType"("name") WHERE "ownerId" IS NULL;
CREATE UNIQUE INDEX "PlantType_owner_name_key" ON "PlantType"("ownerId", "name") WHERE "ownerId" IS NOT NULL;

ALTER TABLE "PlantType" ADD CONSTRAINT "PlantType_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Plant
ALTER TABLE "Plant" ADD COLUMN "positionX" DECIMAL(12,4);
ALTER TABLE "Plant" ADD COLUMN "positionY" DECIMAL(12,4);
ALTER TABLE "Plant" ADD COLUMN "size" DECIMAL(8,4);
ALTER TABLE "Plant" ADD COLUMN "rotation" DECIMAL(8,2);
