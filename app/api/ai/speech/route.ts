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
  const response = data as { output_text?: string; output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  if (response.output_text) return response.output_text.trim();

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
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
  promptTitle: string;
  takeType: string;
  scriptGroup: string;
  takeOrder: number;
  currentSpeech: string;
}) {
  return [
    "Você é um copywriter brasileiro especialista em vídeos curtos para TikTok Shop, Instagram e e-commerce.",
    "Crie uma única fala natural em português brasileiro para o campo SPEECH de um prompt de vídeo.",
    "A fala deve caber em até 8 segundos, ser simples, comercial, humana e direta.",
    "Não altere o prompt técnico. Não mencione instruções de câmera, ambiente, modelo, iluminação ou edição.",
    "Não invente características específicas do produto que não estejam no nome, imagem ou contexto enviado.",
    "Responda somente com a fala final, sem título, sem aspas, sem markdown e sem explicações.",
    "",
    `Negócio: ${options.businessName}`,
    `Produto: ${options.productName}`,
    `Card: ${options.promptTitle}`,
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
  const text = buildSpeechInstruction({
    businessName: prompt.business.name,
    productName: prompt.product.name,
    promptTitle: prompt.title,
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
      max_output_tokens: 120,
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
    return NextResponse.json({ error: "A IA não retornou uma fala válida." }, { status: 502 });
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

