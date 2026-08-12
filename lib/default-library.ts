import { prisma } from "@/lib/prisma";

const videoPromptTemplate = [
  "COLE AQUI O PROMPT COMPLETO DO VIDEO.",
  "Dica: mantenha aqui o prompt original da sua IA e edite apenas o bloco SPEECH abaixo quando trocar a fala do produto.",
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
  "{fala_4}\""
].join("\n");

export async function createDefaultLibrary(userId: string) {
  const business = await prisma.business.create({
    data: {
      name: "Loja da Danii",
      niche: "TikTok Shop",
      initials: "LD",
      color: "#f5c84c",
      userId
    }
  });

  const product = await prisma.product.create({
    data: {
      name: "Vestido Midi etc...",
      description: "Descreva aqui o produto, tecido, cores, diferenciais e benefícios visíveis para orientar a IA ao criar as falas.",
      businessId: business.id
    }
  });

  await prisma.prompt.createMany({
    data: [
      {
        businessId: business.id,
        productId: product.id,
        category: "Video",
        title: "Video 1 - Parte 1",
        description: "Video com fala editavel.",
        tool: "IA de video",
        duration: "1 parte",
        takeType: "1-POV",
        scriptGroup: "Video 1",
        takeOrder: 1,
        tone: "Natural",
        cta: "Copiar prompt",
        thumb: "linear-gradient(135deg, #0b8f83, #f5c84c 48%, #f06449)",
        template: videoPromptTemplate,
        speechLines: [
          "Meninas, olha esse modelo que acabou de chegar.",
          "Eu gostei muito do caimento dele.",
          "E ele esta disponivel em varias cores.",
          "Veja os detalhes no carrinho."
        ],
        lineTokenPrefix: "fala_",
        lineSectionTitle: "SPEECH (Portuguese BR)",
        lineHelp: "Edite a fala para adaptar este video ao produto vendido."
      },
      {
        businessId: business.id,
        productId: product.id,
        category: "Imagem",
        title: "Prompt de imagem 9:16",
        description: "Imagem vertical com referencia de produto.",
        tool: "IA de imagem",
        duration: "Imagem",
        tone: "Ultra-realista",
        cta: "Copiar prompt",
        thumb: "linear-gradient(135deg, #f5c84c, #f06449 52%, #0b8f83)",
        template: [
          "COLE AQUI O PROMPT COMPLETO DE IMAGEM.",
          "Dica: salve aqui o prompt que voce usa na IA de imagem e depois copie com um clique.",
          "",
          "Create ONE ultra-realistic vertical image in 9:16 format.",
          "",
          "Use the uploaded image strictly as the ONLY product reference."
        ].join("\n")
      },
      {
        businessId: business.id,
        productId: product.id,
        category: "Copy",
        title: "Copy de postagem",
        description: "Copy curta com beneficio e chamada de compra.",
        tool: "Copy",
        duration: "Copy",
        tone: "Vendedor",
        cta: "Copiar prompt",
        thumb: "linear-gradient(135deg, #f06449, #111413)",
        template: [
          "COLE AQUI O PROMPT COMPLETO DE COPY.",
          "Dica: use este campo para salvar legendas, CTAs e variacoes que ja funcionaram.",
          "",
          "Escreva uma descricao para TikTok Shop do produto. Destaque o beneficio principal, antecipe a objecao do cliente e finalize com chamada para comprar pelo carrinho."
        ].join("\n")
      }
    ]
  });

  return business;
}

export { videoPromptTemplate };
