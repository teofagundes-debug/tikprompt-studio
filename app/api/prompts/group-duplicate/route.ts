import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const body = await request.json();
  const productId = String(body.productId ?? "");
  const businessId = String(body.businessId ?? "");
  const scriptGroup = String(body.scriptGroup ?? "").trim();
  const takeType = String(body.takeType ?? "");
  const promptIds = Array.isArray(body.promptIds) ? body.promptIds.map((id: unknown) => String(id)).filter(Boolean) : [];

  if (!productId || !businessId || !scriptGroup) {
    return NextResponse.json({ error: "Informe produto, negócio e roteiro." }, { status: 400 });
  }

  await prisma.product.findFirstOrThrow({
    where: { id: productId, businessId, business: { userId: user.id } }
  });

  const prompts = await prisma.prompt.findMany({
    where: promptIds.length
      ? {
          id: { in: promptIds },
          productId,
          businessId,
          category: "Video"
        }
      : {
          productId,
          businessId,
          category: "Video",
          scriptGroup,
          ...(takeType && takeType !== "Todos" ? { takeType } : {})
        },
    orderBy: [{ takeOrder: "asc" }, { createdAt: "asc" }]
  });

  if (!prompts.length) {
    return NextResponse.json({ error: "Nenhum prompt encontrado para este roteiro." }, { status: 404 });
  }

  const copyGroup = `${scriptGroup} - cópia`;
  const copies = await Promise.all(
    prompts.map((prompt) =>
      prisma.prompt.create({
        data: {
          businessId: prompt.businessId,
          productId: prompt.productId,
          category: prompt.category,
          title: `${prompt.title} - cópia`,
          description: prompt.description,
          template: prompt.template,
          tool: prompt.tool,
          duration: prompt.duration,
          takeType: prompt.takeType,
          scriptGroup: copyGroup,
          takeOrder: prompt.takeOrder,
          tone: prompt.tone,
          cta: prompt.cta,
          thumb: prompt.thumb,
          speechLines: prompt.speechLines,
          lineTokenPrefix: prompt.lineTokenPrefix,
          lineSectionTitle: prompt.lineSectionTitle,
          lineHelp: prompt.lineHelp,
          appendLines: prompt.appendLines
        }
      })
    )
  );

  return NextResponse.json({ ok: true, scriptGroup: copyGroup, prompts: copies });
}
