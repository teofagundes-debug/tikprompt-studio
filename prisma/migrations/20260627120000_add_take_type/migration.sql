ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "takeType" TEXT;

UPDATE "Prompt"
SET "takeType" = '1 take'
WHERE "category" = 'Video' AND "takeType" IS NULL;
