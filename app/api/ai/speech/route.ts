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

function outputText(data: unknown) {
  const response = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string; refusal?: string }> }>;
  };
  if (response.output_text) return response.output_text.trim();

  const directText =
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? content.refusal ?? "")
      .join("\n")
      .trim() ?? "";

  if (directText) return directText;

  const found: string[] = [];
  const visit = (value: unknown) => {
    if (!value || found.length) return;
    if (typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if ((key === "text" || key === "output_text") && typeof entry === "string" && entry.trim()) {
        found.push(entry.trim());
        return;
      }
      if (typeof entry === "object") visit(entry);
    }
  };
  visit(data);

  return found[0] ?? "";
}

function cleanSpeech(text: string) {
  return text
    .replace(/^```(?:text|json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^["'“”]+/, "")
    .replace(/["'“”]+$/, "")
    .trim();
}

function buildSpeechInstruction(options: {
  businessName: string;
  productName: string;
  productDescription: string;
  promptTitle: string;
  speechRole: string;
  takeType: string;
  scriptGroup: string;
  takeOrder: number;
  currentSpeech: string;
}) {
  return [
    "Você é um copywriter brasileiro especialista em vídeos curtos para TikTok Shop, Instagram e e-commerce.",
    "Crie uma única fala natural em português brasileiro para o campo SPEECH de um prompt de vídeo.",
    `A função desta fala é: ${options.speechRole}.`,
    "Se a função for Gancho, prenda a atenção rapidamente. Se for CTA, incentive a ação de compra de forma direta.",
    "Se a função for Interesse, não faça abertura de vídeo nem novo gancho; continue a conversa falando das características da peça, modelo, caimento, variações ou benefício principal.",
    "Para Interesse, prefira começar com expressões como: Esse modelo, Ele tem, Essa peça, O caimento, A proposta dele.",
    "Para Interesse, evite frases de abertura como: olha esse, você precisa ver, meninas olha, chegou agora, para tudo.",
    "A fala deve durar entre 6 e 8 segundos em ritmo natural de conversa.",
    "Use uma única frase curta.",
    "Se for Gancho ou Interesse, use de 10 a 14 palavras para ficar rápido e fluido.",
    "Se for CTA, use de 16 a 22 palavras para fechar a venda sem passar de 8 segundos.",
    "Não junte várias ideias na mesma fala; escolha uma ideia forte e diga de forma fluida.",
    "Use uma linguagem criativa, persuasiva, curiosa e com energia de TikTok Shop.",
    "Varie bastante o ângulo de venda e evite repetir estruturas comuns ou frases genéricas.",
    "Explore desejo, curiosidade, ocasião de uso, transformação visual, objeções comuns e benefícios percebidos.",
    "Pode ser mais ousado no gancho e mais comercial no CTA, sem ficar com cara de propaganda engessada.",
    "Não altere o prompt técnico. Não mencione instruções de câmera, ambiente, modelo, iluminação ou edição.",
    "Não invente dados objetivos específicos como tecido, composição, tamanho, desconto, garantia, prazo de entrega, marca ou característica física que não esteja no produto.",
    "Responda somente com a fala final, sem título, sem aspas, sem markdown e sem explicações.",
    "",
    `Negócio: ${options.businessName}`,
    `Produto: ${options.productName}`,
    options.productDescription ? `Descrição do produto: ${options.productDescription}` : "Descrição do produto: não informada",
    `Card: ${options.promptTitle}`,
    `Identificação do bloco: ${options.speechRole}`,
    `Tipo de vídeo: ${options.takeType}`,
    `Vídeo/grupo: ${options.scriptGroup}`,
    `Parte: ${options.takeOrder}`,
    options.currentSpeech ? `Fala atual para variar ou melhorar: ${options.currentSpeech}` : "Fala atual: vazia"
  ].join("\n");
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
  const promptId = String(body.promptId ?? "");
  if (!promptId) {
    return NextResponse.json({ error: "Informe o card de vídeo." }, { status: 400 });
  }

  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, category: "Video", business: { userId: user.id } },
    include: { product: true, business: true }
  });

  if (!prompt) {
    return NextResponse.json({ error: "Card de vídeo não encontrado." }, { status: 404 });
  }

  const currentSpeech = Array.isArray(body.speechLines) ? body.speechLines.join(" ") : prompt.speechLines.join(" ");
  const speechRole = String(body.speechRole ?? prompt.description ?? "").trim() || "Gancho";
  const text = buildSpeechInstruction({
    businessName: prompt.business.name,
    productName: prompt.product.name,
    productDescription: prompt.product.description ?? "",
    promptTitle: prompt.title,
    speechRole,
    takeType: prompt.takeType ?? "1-POV",
    scriptGroup: prompt.scriptGroup ?? "Video 1",
    takeOrder: prompt.takeOrder ?? 1,
    currentSpeech
  });
  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }> = [{ type: "input_text", text }];

  if (prompt.product.imageUrl?.startsWith("data:image/")) {
    content.push({ type: "input_image", image_url: prompt.product.imageUrl });
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
      max_output_tokens: 160,
      store: false
    })
  });

  const data = await aiResponse.json();
  if (!aiResponse.ok) {
    const error = data?.error?.message ?? "Não foi possível gerar a fala.";
    return NextResponse.json({ error }, { status: aiResponse.status });
  }

  const speech = cleanSpeech(outputText(data));
  if (!speech) {
    const status = typeof data?.status === "string" ? data.status : "";
    const details = typeof data?.incomplete_details?.reason === "string" ? data.incomplete_details.reason : "";
    const suffix = [status, details].filter(Boolean).join(" - ");
    return NextResponse.json({ error: `A IA não retornou uma fala válida.${suffix ? ` ${suffix}` : ""}` }, { status: 502 });
  }

  const usage = (data.usage ?? {}) as OpenAIUsage;
  const inputTokens = Number(usage.input_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  const estimatedCostUsd = estimateAiCostUsd(aiSpeechModel, inputTokens, outputTokens);

  await prisma.aiUsage.create({
    data: {
      userId: user.id,
      promptId: prompt.id,
      productName: prompt.product.name,
      model: aiSpeechModel,
      inputTokens,
      outputTokens,
      estimatedCostUsd
    }
  });

  return NextResponse.json({
    speech,
    speechLines: [speech],
    usage: {
      model: aiSpeechModel,
      inputTokens,
      outputTokens,
      totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
      estimatedCostUsd
    }
  });
}
