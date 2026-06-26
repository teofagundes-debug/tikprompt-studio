import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const prompt = await prisma.prompt.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      template: body.template,
      speechLines: body.speechLines ?? []
    }
  });

  return NextResponse.json({ prompt });
}
