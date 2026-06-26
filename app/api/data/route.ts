import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchema, isMissingBusinessTable } from "@/lib/db-setup";

async function getBusinesses() {
  return prisma.business.findMany({
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
    const businesses = await getBusinesses();

    return NextResponse.json({ businesses });
  } catch (error) {
    if (isMissingBusinessTable(error)) {
      await ensureDatabaseSchema();
      const businesses = await getBusinesses();
      return NextResponse.json({ businesses, initialized: true });
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido ao carregar dados.";
    console.error("GET /api/data failed", error);

    return NextResponse.json(
      {
        error: "Nao foi possivel carregar os dados.",
        details: message
      },
      { status: 500 }
    );
  }
}
