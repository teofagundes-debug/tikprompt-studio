import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        products: {
          orderBy: { createdAt: "asc" },
          include: { prompts: { orderBy: { createdAt: "asc" } } }
        }
      }
    });

    return NextResponse.json({ businesses });
  } catch (error) {
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
