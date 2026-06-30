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
      "userId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "passwordHash" TEXT NOT NULL,
      "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
      "plan" TEXT,
      "paymentId" TEXT,
      "lastLoginAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
      "takeType" TEXT,
      "scriptGroup" TEXT,
      "takeOrder" INTEGER,
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
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Prompt_scriptGroup_idx" ON "Prompt"("scriptGroup");`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "userId" TEXT;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Business_userId_idx" ON "Business"("userId");`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "takeType" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "scriptGroup" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "takeOrder" INTEGER;`);
  await prisma.$executeRawUnsafe(`UPDATE "Prompt" SET "takeType" = '1 take' WHERE "category" = 'Video' AND "takeType" IS NULL;`);
  await prisma.$executeRawUnsafe(`UPDATE "Prompt" SET "takeType" = 'varios takes' WHERE "takeType" = '3 takes';`);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Business_userId_fkey'
      ) THEN
        ALTER TABLE "Business"
        ADD CONSTRAINT "Business_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

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
