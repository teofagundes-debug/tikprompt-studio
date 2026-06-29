import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { getSessionUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureDatabaseSchema();

    const [user, userCount] = await Promise.all([getSessionUser(), prisma.user.count()]);

    return NextResponse.json({
      user: user ? publicUser(user) : null,
      needsSetup: userCount === 0
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("GET /api/auth/status failed", error);
    return NextResponse.json(
      {
        error: "Não foi possível carregar o login.",
        details
      },
      { status: 500 }
    );
  }
}
