import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const { id } = await params;
  const body = await request.json();
  await prisma.prompt.findFirstOrThrow({ where: { id, business: { userId: user.id } } });

  const prompt = await prisma.prompt.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      template: body.template,
      takeType: body.category === "Video" ? body.takeType ?? "1-POV" : null,
      scriptGroup: body.category === "Video" ? String(body.scriptGroup ?? "").trim() || null : null,
      takeOrder: body.category === "Video" ? Number(body.takeOrder ?? 0) || null : null,
      speechLines: body.speechLines ?? []
    }
  });

  return NextResponse.json({ prompt });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const { id } = await params;
  await prisma.prompt.findFirstOrThrow({ where: { id, business: { userId: user.id } } });
  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
