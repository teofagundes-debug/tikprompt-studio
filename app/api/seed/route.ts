import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const existing = await prisma.business.count();

  if (existing > 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const business = await prisma.business.create({
    data: {
      name: "Glow Shop",
      niche: "Moda e TikTok Shop",
      initials: "GS",
      color: "#f5c84c"
    }
  });

  const product = await prisma.product.create({
    data: { name: "Vestidos", businessId: business.id }
  });

  await prisma.product.createMany({
    data: [
      { name: "Calcados", businessId: business.id },
      { name: "Acessorios", businessId: business.id }
    ]
  });

  await prisma.prompt.create({
    data: {
      businessId: business.id,
      productId: product.id,
      category: "Video",
      title: "Fashion Danii - video 8s",
      description: "Video vertical com fala em Portugues BR.",
      tool: "IA de video",
      duration: "8s",
      tone: "Natural",
      cta: "Copiar prompt",
      thumb: "linear-gradient(135deg, #0b8f83, #f5c84c 48%, #f06449)",
      template: [
        "Ultra-realistic vertical 8-second video, natural TikTok style.",
        "",
        "Use the generated image as visual reference.",
        "",
        "SPEECH (Portuguese BR):",
        "",
        "\"{fala_1}",
        "",
        "{fala_2}",
        "",
        "{fala_3}",
        "",
        "{fala_4}\""
      ].join("\n"),
      speechLines: [
        "Meninas, olha esse modelo que acabou de chegar.",
        "Eu gostei muito do caimento dele.",
        "E ele esta disponivel em varias cores.",
        "Veja os detalhes no carrinho."
      ],
      lineTokenPrefix: "fala_",
      lineSectionTitle: "SPEECH (Portuguese BR)",
      lineHelp: "Edite a fala para adaptar este video ao produto vendido."
    }
  });

  return NextResponse.json({ ok: true });
}
