import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const niche = String(body.niche ?? "").trim();
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const business = await prisma.business.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(niche ? { niche } : {}),
      ...(initials ? { initials } : {})
    }
  });

  return NextResponse.json({ business });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
