import { prisma } from "@/lib/prisma";

export function isMissingBusinessTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("public.Business") || message.includes("The table") || message.includes("does not exist");
}

export async function ensureDatabaseSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Business" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "niche" TEXT NOT NULL,
      "initials" TEXT NOT NULL,
      "color" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "businessId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Prompt" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "template" TEXT NOT NULL,
      "tool" TEXT,
      "duration" TEXT,
      "tone" TEXT,
      "cta" TEXT,
      "thumb" TEXT,
      "speechLines" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "lineTokenPrefix" TEXT,
      "lineSectionTitle" TEXT,
      "lineHelp" TEXT,
      "appendLines" BOOLEAN NOT NULL DEFAULT false,
      "productId" TEXT NOT NULL,
      "businessId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_businessId_idx" ON "Product"("businessId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Prompt_businessId_idx" ON "Prompt"("businessId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Prompt_productId_idx" ON "Prompt"("productId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Prompt_category_idx" ON "Prompt"("category");`);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Product_businessId_fkey'
      ) THEN
        ALTER TABLE "Product"
        ADD CONSTRAINT "Product_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Prompt_productId_fkey'
      ) THEN
        ALTER TABLE "Prompt"
        ADD CONSTRAINT "Prompt_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Prompt_businessId_fkey'
      ) THEN
        ALTER TABLE "Prompt"
        ADD CONSTRAINT "Prompt_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}
