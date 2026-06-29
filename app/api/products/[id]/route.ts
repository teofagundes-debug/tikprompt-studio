import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const { id } = await params;
  const body = await request.json();
  await prisma.product.findFirstOrThrow({ where: { id, business: { userId: user.id } } });
  const product = await prisma.product.update({
    where: { id },
    data: { name: body.name }
  });

  return NextResponse.json({ product });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const { id } = await params;
  await prisma.product.findFirstOrThrow({ where: { id, business: { userId: user.id } } });
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
