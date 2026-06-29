import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function defaultPrompt(category: string) {
  if (category === "Video") {
    return {
      title: "Novo prompt de video",
      description: "Video com fala editavel.",
      template: [
        "Cole aqui o prompt completo de video.",
        "",
        "---",
        "",
        "SPEECH (Portuguese BR):",
        "",
        "\"Edite esta fala conforme o produto.\""
      ].join("\n"),
      tool: "IA de video",
      duration: "1 take",
      speechLines: ["Edite esta fala conforme o produto."],
      lineTokenPrefix: "fala_",
      lineSectionTitle: "SPEECH (Portuguese BR)",
      lineHelp: "Edite a fala para adaptar este video ao produto vendido."
    };
  }

  if (category === "Copy") {
    return {
      title: "Novo prompt de copy",
      description: "Copy para TikTok Shop.",
      template: "Cole aqui o prompt completo de copy.",
      tool: "Copy",
      duration: "Copy",
      speechLines: [] as string[],
      lineTokenPrefix: null,
      lineSectionTitle: null,
      lineHelp: null
    };
  }

  return {
    title: "Novo prompt de imagem",
    description: "Imagem com referencia de produto.",
    template: "Cole aqui o prompt completo de imagem.",
    tool: "IA de imagem",
    duration: "Imagem",
    speechLines: [] as string[],
    lineTokenPrefix: null,
    lineSectionTitle: null,
    lineHelp: null
  };
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const body = await request.json();
  const category = String(body.category ?? "Video");
  const takeType = category === "Video" ? String(body.takeType ?? "1 take") : null;
  const productId = String(body.productId ?? "");
  const businessId = String(body.businessId ?? "");
  const defaults = defaultPrompt(category);
  await prisma.product.findFirstOrThrow({
    where: { id: productId, businessId, business: { userId: user.id } }
  });

  const prompt = await prisma.prompt.create({
    data: {
      businessId,
      productId,
      category,
      title: defaults.title,
      description: defaults.description,
      template: defaults.template,
      tool: defaults.tool,
      duration: defaults.duration,
      takeType,
      tone: "Natural",
      cta: "Copiar prompt",
      thumb: "linear-gradient(135deg, #f5c84c, #f06449 52%, #0b8f83)",
      speechLines: defaults.speechLines,
      lineTokenPrefix: defaults.lineTokenPrefix,
      lineSectionTitle: defaults.lineSectionTitle,
      lineHelp: defaults.lineHelp
    }
  });

  return NextResponse.json({ prompt });
}
