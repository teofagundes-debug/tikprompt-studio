import { NextResponse } from "next/server";
import { aiSpeechModel, estimateAiCostUsd } from "@/lib/ai-costs";
import { requireUser } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

type OpenAIUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type SpeechItem = {
  promptId: string;
  speech: string;
};

function outputText(data: unknown) {
  const response = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; refusal?: string }> }>;
  };
  if (response.output_text) return response.output_text.trim();

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? content.refusal ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function cleanSpeech(text: string) {
  return text
    .replace(/^["'“”]+/, "")
    .replace(/["'“”]+$/, "")
    .trim();
}

function speechRoleForPrompt(prompt: { title: string; description: string; takeOrder: number | null }) {
  const text = `${prompt.description} ${prompt.title}`.toLowerCase();
  if (text.includes("gancho") || text.includes("gatilho")) return "Gancho";
  if (text.includes("cta") || text.includes("carrinho") || text.includes("chamada")) return "CTA";
  if (text.includes("interesse") || text.includes("benef")) return "Interesse";
  if (prompt.takeOrder === 1) return "Gancho";
  if (prompt.takeOrder === 3) return "CTA";
  return "Interesse";
}

function buildVideoInstruction(options: {
  businessName: string;
  productName: string;
  productDescription: string;
  takeType: string;
  scriptGroup: string;
  avoidSpeeches: string[];
  parts: Array<{
    promptId: string;
    title: string;
    role: string;
    takeOrder: number;
    currentSpeech: string;
  }>;
}) {
  return [
    "Você é um copywriter brasileiro especialista em vídeos curtos para TikTok Shop, Instagram e e-commerce.",
    "Crie as falas de todas as partes de UM vídeo como uma conversa contínua, natural e fluida.",
    "Cada parte deve durar entre 6 e 8 segundos em ritmo natural de conversa.",
    "Cada fala deve ter uma única frase curta.",
    "Gancho e Interesse devem ser 40% mais curtos que o CTA, com 10 a 14 palavras cada.",
    "CTA pode ter de 16 a 22 palavras para fechar a venda sem passar de 8 segundos.",
    "Não faça cada parte parecer um vídeo novo. Parte 2 em diante deve continuar a conversa da parte anterior.",
    "Gancho prende atenção. Interesse continua falando da peça, modelo, caimento, variações ou benefício. CTA chama para a ação de compra.",
    "Para Interesse, prefira começar com expressões como: Esse modelo, Ele tem, Essa peça, O caimento, A proposta dele.",
    "Para Interesse, evite aberturas como: olha esse, você precisa ver, meninas olha, chegou agora, para tudo.",
    "Use linguagem criativa, persuasiva, curiosa e com energia de TikTok Shop, sem cara de propaganda engessada.",
    options.avoidSpeeches.length
      ? "IMPORTANTE: gere uma versao realmente nova, com angulo, abertura e escolha de palavras diferentes das falas anteriores listadas abaixo. Nao copie nem parafraseie de forma muito parecida."
      : "Crie uma versao com angulo de venda claro e natural.",
    "Não invente dados objetivos específicos como tecido, composição, tamanho, desconto, garantia, prazo de entrega, marca ou característica física que não esteja no produto.",
    "Responda somente JSON válido neste formato: {\"items\":[{\"promptId\":\"id\",\"speech\":\"fala\"}]}",
    "",
    `Negócio: ${options.businessName}`,
    `Produto: ${options.productName}`,
    options.productDescription ? `Descrição do produto: ${options.productDescription}` : "Descrição do produto: não informada",
    `Tipo de vídeo: ${options.takeType}`,
    `Vídeo/grupo: ${options.scriptGroup}`,
    "",
    "Partes do vídeo:",
    ...(options.avoidSpeeches.length
      ? ["Falas anteriores que devem ser evitadas:", ...options.avoidSpeeches.slice(-12).map((speech, index) => `${index + 1}. ${speech}`), ""]
      : []),
    ...options.parts.map(
      (part) =>
        `- promptId=${part.promptId}; Parte ${part.takeOrder}; Função=${part.role}; Card=${part.title}; Fala atual=${part.currentSpeech || "vazia"}`
    )
  ].join("\n");
}

function parseItems(text: string): SpeechItem[] {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { items?: SpeechItem[] };
  return Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => ({ promptId: String(item.promptId ?? ""), speech: cleanSpeech(String(item.speech ?? "")) }))
        .filter((item) => item.promptId && item.speech)
    : [];
}

export async function POST(request: Request) {
  await ensureDatabaseSchema();
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada no Render." }, { status: 500 });
  }

  const body = await request.json();
  const promptIds = Array.isArray(body.promptIds) ? body.promptIds.map(String).filter(Boolean) : [];
  const avoidSpeeches = Array.isArray(body.avoidSpeeches)
    ? body.avoidSpeeches.map((item: unknown) => String(item).trim()).filter(Boolean).slice(-24)
    : [];
  if (!promptIds.length) {
    return NextResponse.json({ error: "Informe os cards do vídeo." }, { status: 400 });
  }

  const prompts = await prisma.prompt.findMany({
    where: { id: { in: promptIds }, category: "Video", business: { userId: user.id } },
    include: { product: true, business: true },
    orderBy: [{ takeOrder: "asc" }, { createdAt: "asc" }]
  });

  if (prompts.length !== promptIds.length || !prompts.length) {
    return NextResponse.json({ error: "Não foi possível carregar todos os cards do vídeo." }, { status: 404 });
  }

  const first = prompts[0];
  if (!prompts.every((prompt) => prompt.productId === first.productId && prompt.businessId === first.businessId)) {
    return NextResponse.json({ error: "Os cards precisam pertencer ao mesmo produto e negócio." }, { status: 400 });
  }

  const text = buildVideoInstruction({
    businessName: first.business.name,
    productName: first.product.name,
    productDescription: first.product.description ?? "",
    takeType: first.takeType ?? "1-POV",
    scriptGroup: first.scriptGroup ?? "Video 1",
    avoidSpeeches,
    parts: prompts.map((prompt, index) => ({
      promptId: prompt.id,
      title: prompt.title,
      role: speechRoleForPrompt(prompt),
      takeOrder: prompt.takeOrder ?? index + 1,
      currentSpeech: prompt.speechLines.join(" ")
    }))
  });
  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }> = [{ type: "input_text", text }];

  if (first.product.imageUrl?.startsWith("data:image/")) {
    content.push({ type: "input_image", image_url: first.product.imageUrl });
  }

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: aiSpeechModel,
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } },
      max_output_tokens: 520,
      temperature: avoidSpeeches.length ? 1.05 : 0.9,
      top_p: 0.95,
      store: false
    })
  });

  const data = await aiResponse.json();
  if (!aiResponse.ok) {
    const error = data?.error?.message ?? "Não foi possível gerar as falas.";
    return NextResponse.json({ error }, { status: aiResponse.status });
  }

  let items: SpeechItem[] = [];
  try {
    items = parseItems(outputText(data));
  } catch {
    return NextResponse.json({ error: "A IA não retornou falas em formato válido." }, { status: 502 });
  }

  const byId = new Map(items.map((item) => [item.promptId, item]));
  const orderedItems = prompts.map((prompt) => byId.get(prompt.id)).filter(Boolean) as SpeechItem[];
  if (orderedItems.length !== prompts.length) {
    return NextResponse.json({ error: "A IA não retornou uma fala para cada parte do vídeo." }, { status: 502 });
  }

  const usage = (data.usage ?? {}) as OpenAIUsage;
  const inputTokens = Number(usage.input_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  const estimatedCostUsd = estimateAiCostUsd(aiSpeechModel, inputTokens, outputTokens);

  await prisma.aiUsage.create({
    data: {
      userId: user.id,
      promptId: null,
      productName: first.product.name,
      model: aiSpeechModel,
      inputTokens,
      outputTokens,
      estimatedCostUsd
    }
  });

  return NextResponse.json({
    items: orderedItems,
    usage: {
      model: aiSpeechModel,
      inputTokens,
      outputTokens,
      totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
      estimatedCostUsd
    }
  });
}
