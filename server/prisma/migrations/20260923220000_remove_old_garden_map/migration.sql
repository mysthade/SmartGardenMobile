-- DropForeignKey
ALTER TABLE "GardenMapObject" DROP CONSTRAINT IF EXISTS "GardenMapObject_gardenId_fkey";

-- DropTable
DROP TABLE IF EXISTS "GardenMapObject";

-- DropEnum
DROP TYPE IF EXISTS "MapObjectType";
