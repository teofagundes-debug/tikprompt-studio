export type PromptLike = {
  category: string;
  title: string;
  description: string;
  template: string;
  tool: string | null;
  duration: string | null;
  takeType?: string | null;
  lineTokenPrefix: string | null;
  speechLines: string[];
};

export function buildPromptOutput(prompt: PromptLike) {
  let output = prompt.template;

  if (prompt.lineTokenPrefix && prompt.speechLines.length) {
    prompt.speechLines.forEach((line, index) => {
      output = output.replaceAll(`{${prompt.lineTokenPrefix}${index + 1}}`, line);
    });
  }

  return output;
}

export function getPromptChips(prompt: PromptLike) {
  const text = `${prompt.title} ${prompt.description} ${prompt.template}`.toLowerCase();
  const category = prompt.category === "Video" ? "Vídeo" : prompt.category === "Copy" ? "Copy-postagens" : prompt.category;
  const takeType = prompt.takeType === "varios takes" ? "+de 3 takes" : prompt.takeType;
  const chips = [category];

  if (prompt.tool) chips.push(prompt.tool);
  if (takeType) chips.push(takeType);
  if (prompt.duration && prompt.duration !== "-") chips.push(prompt.duration);
  if (prompt.lineTokenPrefix || text.includes("speech")) chips.push("fala");
  if (text.includes("9:16")) chips.push("9:16");
  if (text.includes("ultra-realistic") || text.includes("ultra-realista")) chips.push("realista");
  if (text.includes("tiktok shop")) chips.push("TikTok Shop");
  if (text.includes("prova social")) chips.push("prova social");
  if (text.includes("objecao") || text.includes("objection")) chips.push("objecao");
  if (text.includes("copy")) chips.push("copy");

  return [...new Set(chips.filter(Boolean))].slice(0, 6);
}
