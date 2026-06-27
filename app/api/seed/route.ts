import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await ensureDatabaseSchema();

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

  await prisma.prompt.create({
    data: {
      businessId: business.id,
      productId: product.id,
      category: "Imagem",
      title: "Fashion Danii - imagem 9:16",
      description: "Imagem vertical com referencia de produto.",
      tool: "IA de imagem",
      duration: "Imagem",
      tone: "Ultra-realista",
      cta: "Copiar prompt",
      thumb: "linear-gradient(135deg, #f5c84c, #f06449 52%, #0b8f83)",
      template: [
        "Create ONE ultra-realistic vertical image in 9:16 format.",
        "",
        "Use the uploaded image strictly as the ONLY product reference.",
        "",
        "Generate ONE single image only per result.",
        "No collage. No multiple panels. No combined scenes."
      ].join("\n")
    }
  });

  await prisma.prompt.create({
    data: {
      businessId: business.id,
      productId: product.id,
      category: "Copy",
      title: "Descricao TikTok Shop",
      description: "Copy curta com beneficio e chamada de compra.",
      tool: "TikTok Shop",
      duration: "Copy",
      tone: "Vendedor",
      cta: "Comprar agora",
      thumb: "linear-gradient(135deg, #f06449, #111413)",
      template:
        "Escreva uma descricao para TikTok Shop do produto. Destaque o beneficio principal, antecipe a objecao do cliente e finalize com chamada para comprar pelo carrinho."
    }
  });

  return NextResponse.json({ ok: true });
}
