import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Glow Shop",
      niche: "Moda e TikTok Shop",
      initials: "GS",
      color: "#f5c84c"
    }
  });

  const vestidos = await prisma.product.create({
    data: { name: "Vestidos", businessId: business.id }
  });

  await prisma.product.createMany({
    data: [
      { name: "Calcados", businessId: business.id },
      { name: "Acessorios", businessId: business.id }
    ]
  });

  await prisma.prompt.createMany({
    data: [
      {
        businessId: business.id,
        productId: vestidos.id,
        category: "Imagem",
        title: "Fashion Danii - imagem 9:16",
        description: "Imagem vertical de moda com referencia de produto.",
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
          "The clothing item must remain EXACTLY identical.",
          "",
          "Do NOT modify design, color, fit, proportions, stitching or structure.",
          "",
          "STYLE:",
          "Ultra-realistic TikTok Shop fashion photography.",
          "Natural Brazilian fashion environment.",
          "",
          "FINAL RULE:",
          "Generate ONE single image only per result.",
          "No collage. No multiple panels. No combined scenes."
        ].join("\n")
      },
      {
        businessId: business.id,
        productId: vestidos.id,
        category: "Video",
        title: "Fashion Danii - video 8s",
        description: "Video vertical com acao por segundos e fala em Portugues BR.",
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
          "The dress worn by the model and the dress hanging beside her must remain EXACTLY identical.",
          "",
          "---",
          "",
          "SPEECH (Portuguese BR):",
          "",
          "\"{fala_1}",
          "",
          "{fala_2}",
          "",
          "{fala_3}",
          "",
          "{fala_4}\"",
          "",
          "---",
          "",
          "FINAL RULE:",
          "The hanging dress and the worn dress must remain visually identical throughout the entire video."
        ].join("\n"),
        takeType: "1 take",
        speechLines: [
          "Meninas, olha esse modelo que acabou de chegar.",
          "Eu gostei muito do caimento dele.",
          "E ele esta disponivel em varias cores.",
          "Veja os detalhes no carrinho."
        ],
        lineTokenPrefix: "fala_",
        lineSectionTitle: "SPEECH (Portuguese BR)",
        lineHelp: "Edite a fala para adaptar este video ao produto vendido.",
        appendLines: false
      },
      {
        businessId: business.id,
        productId: vestidos.id,
        category: "Copy",
        title: "Descricao TikTok Shop",
        description: "Copy curta com beneficio, uso e chamada de compra.",
        tool: "TikTok Shop",
        duration: "Copy",
        tone: "Vendedor",
        cta: "Comprar agora",
        thumb: "linear-gradient(135deg, #f06449, #111413)",
        template:
          "Escreva uma descricao para TikTok Shop do produto. Destaque o beneficio principal, antecipe a objecao do cliente, mencione a oferta e finalize com chamada para comprar pelo carrinho."
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
