ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "favoriteGroups" TEXT[] NOT NULL DEFAULT ARRAY['Semana']::TEXT[];

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "favoriteGroup" TEXT;

UPDATE "Product"
SET "favoriteGroup" = 'Semana'
WHERE "weeklyFocus" = true
  AND ("favoriteGroup" IS NULL OR "favoriteGroup" = '');
