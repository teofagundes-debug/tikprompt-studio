import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const { id } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id, business: { userId: user.id } },
    include: { prompts: true }
  });

  const copy = await prisma.product.create({
    data: {
      name: `${product.name} - copia`,
      businessId: product.businessId,
      prompts: {
        create: product.prompts.map((prompt) => ({
          businessId: prompt.businessId,
          category: prompt.category,
          title: `${prompt.title} - copia`,
          description: prompt.description,
          template: prompt.template,
          tool: prompt.tool,
          duration: prompt.duration,
          takeType: prompt.takeType,
          scriptGroup: prompt.scriptGroup,
          takeOrder: prompt.takeOrder,
          tone: prompt.tone,
          cta: prompt.cta,
          thumb: prompt.thumb,
          speechLines: prompt.speechLines,
          lineTokenPrefix: prompt.lineTokenPrefix,
          lineSectionTitle: prompt.lineSectionTitle,
          lineHelp: prompt.lineHelp,
          appendLines: prompt.appendLines
        }))
      }
    },
    include: { prompts: true }
  });

  return NextResponse.json({ product: copy });
}
