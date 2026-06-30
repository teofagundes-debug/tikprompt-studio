import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();

  try {
    await ensureDatabaseSchema();

    const [userCount, businessCount] = await Promise.all([prisma.user.count(), prisma.business.count()]);

    return NextResponse.json({
      ok: true,
      service: "TikPrompt Studio",
      database: "connected",
      schema: "ready",
      counts: {
        users: userCount,
        businesses: businessCount
      },
      env: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        AUTH_SECRET: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        WEBHOOK_SECRET: Boolean(process.env.WEBHOOK_SECRET),
        APP_URL: Boolean(process.env.APP_URL)
      },
      responseMs: Date.now() - startedAt
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Erro desconhecido.";

    return NextResponse.json(
      {
        ok: false,
        service: "TikPrompt Studio",
        database: "error",
        schema: "error",
        env: {
          DATABASE_URL: Boolean(process.env.DATABASE_URL),
          AUTH_SECRET: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
          WEBHOOK_SECRET: Boolean(process.env.WEBHOOK_SECRET),
          APP_URL: Boolean(process.env.APP_URL)
        },
        details,
        responseMs: Date.now() - startedAt
      },
      { status: 500 }
    );
  }
}
