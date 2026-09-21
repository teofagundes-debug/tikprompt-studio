export const noSizeCta = "Confira todos detalhes e tamanhos no carrinho laranja e entregamos para todo Brasil.";
const ctaEnding = "confira todos detalhes no carrinho laranja e entregamos para todo Brasil.";
const sizeToken = "(?:XGG|XG|GG|PP|G[1-5]|P|M|G|[0-9]{1,3})";

function normalizedDescription(description: string) {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function productSizeStatement(description: string) {
  const text = normalizedDescription(description);

  if (/\bTAMANHO\s+UNICO\b/.test(text)) return "Veste tamanho único";

  const range = text.match(new RegExp(`\\b(${sizeToken})\\s*(?:AO|A|-)\\s*(${sizeToken})\\b`));
  if (range) return `Veste do ${range[1]} ao ${range[2]}`;

  const sizeContext = text.match(
    new RegExp(
      `\\b(?:TAMANHOS?|VESTE|DISPONIVEL(?:\\s+NOS)?(?:\\s+TAMANHOS?)?)\\b` +
        `(?:\\s+(?:DISPONIVEIS?|DO|DE|NOS?|EM|TAMANHOS?))*\\s*:?\\s*` +
        `((?:${sizeToken})(?:\\s*(?:,|/|E|AO|A|-)\\s*(?:${sizeToken}))*)`
    )
  );
  const listedSizes = sizeContext?.[1].match(new RegExp(`\\b${sizeToken}\\b`, "g")) ?? [];
  const uniqueSizes = [...new Set(listedSizes)];

  if (uniqueSizes.length > 1) return `Veste do ${uniqueSizes[0]} ao ${uniqueSizes.at(-1)}`;
  if (uniqueSizes.length === 1) return `Veste tamanho ${uniqueSizes[0]}`;

  return null;
}

export function hasExplicitProductSizes(description: string) {
  return Boolean(productSizeStatement(description));
}

export function lockProductCta(speech: string, role: string, productDescription: string) {
  const normalizedRole = role.toLowerCase();
  const isCta = normalizedRole.includes("cta") || normalizedRole.includes("carrinho") || normalizedRole.includes("chamada");
  if (!isCta) return speech;

  const sizeStatement = productSizeStatement(productDescription);
  return sizeStatement ? `${sizeStatement}, ${ctaEnding}` : noSizeCta;
}
