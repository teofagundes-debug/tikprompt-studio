import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "Novo produto").trim() || "Novo produto";
  const businessId = String(body.businessId ?? "");

  const product = await prisma.product.create({
    data: { name, businessId },
    include: { prompts: true }
  });

  return NextResponse.json({ product });
}
