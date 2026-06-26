import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
}
