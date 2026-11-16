-- Migrate legacy rectangular plans to 4-point polygonal boundaries
UPDATE "GardenPlan"
SET "boundary" = jsonb_build_array(
  jsonb_build_object('xCm', 0, 'yCm', 0),
  jsonb_build_object('xCm', "widthCm", 'yCm', 0),
  jsonb_build_object('xCm', "widthCm", 'yCm', "heightCm"),
  jsonb_build_object('xCm', 0, 'yCm', "heightCm")
)
WHERE "boundary" IS NULL;
