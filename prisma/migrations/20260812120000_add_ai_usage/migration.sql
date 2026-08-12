CREATE TABLE IF NOT EXISTS "AiUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "promptId" TEXT,
  "productName" TEXT,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiUsage_userId_idx" ON "AiUsage"("userId");
CREATE INDEX IF NOT EXISTS "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiUsage_userId_fkey'
  ) THEN
    ALTER TABLE "AiUsage"
    ADD CONSTRAINT "AiUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
