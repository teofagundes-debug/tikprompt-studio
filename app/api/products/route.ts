import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const body = await request.json();
  const name = String(body.name ?? "Novo produto").trim() || "Novo produto";
  const businessId = String(body.businessId ?? "");
  await prisma.business.findFirstOrThrow({ where: { id: businessId, userId: user.id } });

  const product = await prisma.product.create({
    data: { name, businessId },
    include: { prompts: true }
  });

  return NextResponse.json({ product });
}
