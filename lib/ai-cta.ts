export const noSizeCta = "Confira todos detalhes e tamanhos no carrinho laranja e entregamos para todo Brasil.";

export function hasExplicitProductSizes(description: string) {
  const text = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const letterSize = "(?:PP|P|M|G|GG|XG|XGG|G1|G2|G3|G4|G5)";

  return [
    new RegExp(`\\bTAMANHOS?\\s+(?:UNICO|${letterSize}|\\d{2})\\b`),
    new RegExp(`\\bVESTE\\s+(?:DO\\s+|DE\\s+)?(?:${letterSize}|\\d{2})\\b`),
    new RegExp(`\\b${letterSize}\\s*(?:,|/|AO|A|-)\\s*${letterSize}\\b`),
    /\b\d{2}\s*(?:,|\/|AO|A|-)\s*\d{2}\b/
  ].some((pattern) => pattern.test(text));
}

export function lockCtaWithoutSizes(speech: string, role: string, productDescription: string) {
  const normalizedRole = role.toLowerCase();
  const isCta = normalizedRole.includes("cta") || normalizedRole.includes("carrinho") || normalizedRole.includes("chamada");
  return isCta && !hasExplicitProductSizes(productDescription) ? noSizeCta : speech;
}
