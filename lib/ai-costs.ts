export const aiSpeechModel = "gpt-4o";

const modelPrices: Record<string, { input: number; output: number }> = {
  "gpt-5-nano": {
    input: 0.05,
    output: 0.4
  },
  "gpt-4o-mini": {
    input: 0.15,
    output: 0.6
  },
  "gpt-4o": {
    input: 2.5,
    output: 10
  }
};

export function estimateAiCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const prices = modelPrices[model] ?? modelPrices[aiSpeechModel];
  return (inputTokens / 1_000_000) * prices.input + (outputTokens / 1_000_000) * prices.output;
}
