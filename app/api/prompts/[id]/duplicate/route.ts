import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const prompt = await prisma.prompt.findUniqueOrThrow({ where: { id } });

  const copy = await prisma.prompt.create({
    data: {
      businessId: prompt.businessId,
      productId: prompt.productId,
      category: prompt.category,
      title: `${prompt.title} - copia`,
      description: prompt.description,
      template: prompt.template,
      tool: prompt.tool,
      duration: prompt.duration,
      takeType: prompt.takeType,
      tone: prompt.tone,
      cta: prompt.cta,
      thumb: prompt.thumb,
      speechLines: prompt.speechLines,
      lineTokenPrefix: prompt.lineTokenPrefix,
      lineSectionTitle: prompt.lineSectionTitle,
      lineHelp: prompt.lineHelp,
      appendLines: prompt.appendLines
    }
  });

  return NextResponse.json({ prompt: copy });
}
