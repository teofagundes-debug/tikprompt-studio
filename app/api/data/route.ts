import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchema, isMissingBusinessTable } from "@/lib/db-setup";
import { createDefaultLibrary } from "@/lib/default-library";
import { publicUser, requireUser } from "@/lib/auth";

async function getBusinesses(userId: string) {
  return prisma.business.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      products: {
        orderBy: { createdAt: "asc" },
        include: { prompts: { orderBy: { createdAt: "asc" } } }
      }
    }
  });
}

export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response || !user) return response;

    let businesses = await getBusinesses(user.id);
    if (!businesses.length) {
      await createDefaultLibrary(user.id);
      businesses = await getBusinesses(user.id);
    }

    return NextResponse.json({ businesses, user: publicUser(user) });
  } catch (error) {
    if (isMissingBusinessTable(error)) {
      await ensureDatabaseSchema();
      const { user, response } = await requireUser();
      if (response || !user) return response;
      let businesses = await getBusinesses(user.id);
      if (!businesses.length) {
        await createDefaultLibrary(user.id);
        businesses = await getBusinesses(user.id);
      }
      return NextResponse.json({ businesses, user: publicUser(user), initialized: true });
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido ao carregar dados.";
    console.error("GET /api/data failed", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os dados.",
        details: message
      },
      { status: 500 }
    );
  }
}
