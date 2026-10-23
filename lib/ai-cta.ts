export const noSizeCta = "Confira todos detalhes no carrinho laranja e entregamos para todo Brasil.";

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

export function removeSizeReferences(text: string) {
  const normalized = normalizedDescription(text);
  const sizeList = new RegExp(
    `\\b(?:TAMANHOS?|NUMERACAO|NUMERACOES|VESTE|DISPONIVEL(?:\\s+NOS)?(?:\\s+TAMANHOS?)?)` +
      `(?:\\s+(?:DISPONIVEIS?|DO|DE|NOS?|EM|ENTRE|TAMANHOS?))*\\s*:?\\s*` +
      `(?:${sizeToken})(?:(?:\\s*(?:,|/|-)\\s*|\\s+(?:E|AO|A)\\s+)(?:${sizeToken}))*`,
    "gi"
  );
  const sizeRange = new RegExp(`\\b(?:DO|DE)\\s+${sizeToken}\\s+(?:AO|A|-)\\s+${sizeToken}\\b`, "gi");
  const standaloneSizeSequence = new RegExp(
    `\\b(?:${sizeToken})(?:(?:\\s*(?:,|/|-)\\s*|\\s+(?:E|AO|A)\\s+)(?:${sizeToken})){1,}\\b`,
    "gi"
  );
  const oneSize = /\b(?:TAMANHO|NUMERACAO|GRADE)\s+UNICO\b/gi;
  const ranges: Array<{ start: number; end: number }> = [];

  for (const pattern of [sizeList, sizeRange, standaloneSizeSequence, oneSize]) {
    pattern.lastIndex = 0;
    let match = pattern.exec(normalized);
    while (match) {
      let end = match.index + match[0].length;
      const trailingConnector = normalized.slice(end).match(/^\s*,?\s*(?:E|OU)\s+/);
      if (trailingConnector) end += trailingConnector[0].length;
      ranges.push({ start: match.index, end });
      match = pattern.exec(normalized);
    }
  }

  const mergedRanges = ranges
    .sort((left, right) => left.start - right.start)
    .reduce<Array<{ start: number; end: number }>>((merged, range) => {
      const previous = merged.at(-1);
      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push({ ...range });
      }
      return merged;
    }, []);

  let cleaned = text;
  for (const range of mergedRanges.sort((left, right) => right.start - left.start)) {
    cleaned = `${cleaned.slice(0, range.start)}${cleaned.slice(range.end)}`;
  }

  return cleaned
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?:\s*[,;:])+/g, "$1")
    .replace(/(?:^|\s)[,;:]+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function descriptionWithoutSizes(description: string) {
  return removeSizeReferences(description);
}

export function lockProductCta(speech: string, role: string, _productDescription = "") {
  const normalizedRole = role.toLowerCase();
  const isCta = normalizedRole.includes("cta") || normalizedRole.includes("carrinho") || normalizedRole.includes("chamada");
  return isCta ? noSizeCta : removeSizeReferences(speech);
}