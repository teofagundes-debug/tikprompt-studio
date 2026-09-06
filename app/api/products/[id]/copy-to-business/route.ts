import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const { id } = await params;
  const body = await request.json();
  const targetBusinessId = String(body.businessId ?? "");

  const [product, targetBusiness] = await Promise.all([
    prisma.product.findFirstOrThrow({
      where: { id, business: { userId: user.id } },
      include: { prompts: true }
    }),
    prisma.business.findFirstOrThrow({
      where: { id: targetBusinessId, userId: user.id }
    })
  ]);

  if (product.businessId === targetBusiness.id) {
    return NextResponse.json({ error: "Escolha uma loja diferente para copiar o produto." }, { status: 400 });
  }

  const favoriteGroup = product.favoriteGroup || (product.weeklyFocus ? "Semana" : null);

  if (favoriteGroup && !targetBusiness.favoriteGroups.some((group) => group.toLowerCase() === favoriteGroup.toLowerCase())) {
    await prisma.business.update({
      where: { id: targetBusiness.id },
      data: { favoriteGroups: [...targetBusiness.favoriteGroups, favoriteGroup] }
    });
  }

  const copy = await prisma.product.create({
    data: {
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      weeklyFocus: product.weeklyFocus,
      favoriteGroup,
      businessId: targetBusiness.id,
      prompts: {
        create: product.prompts.map((prompt) => ({
          businessId: targetBusiness.id,
          category: prompt.category,
          title: prompt.title,
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
