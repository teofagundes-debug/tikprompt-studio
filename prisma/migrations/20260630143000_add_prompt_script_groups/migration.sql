ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "scriptGroup" TEXT;
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "takeOrder" INTEGER;

CREATE INDEX IF NOT EXISTS "Prompt_scriptGroup_idx" ON "Prompt"("scriptGroup");
