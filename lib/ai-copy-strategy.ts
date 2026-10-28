export type CopyStrategy = {
  name: string;
  hookStyle: string;
  focus: string;
};

export const copyStrategies: CopyStrategy[] = [
  {
    name: "Conforto no uso real",
    hookStyle: "comece por uma necessidade cotidiana, uma sensação ao vestir ou um incômodo que o produto resolve",
    focus: "maciez, liberdade de movimento, segurança, caimento e conforto durante o dia"
  },
  {
    name: "Detalhes que fazem diferença",
    hookStyle: "abra com um detalhe concreto ou inesperado da peça, sem usar uma pergunta genérica",
    focus: "bolsos, botões, mangas, alças, barra, fechamento, acabamento e outros elementos visíveis"
  },
  {
    name: "Tecido e qualidade percebida",
    hookStyle: "apresente uma qualidade observável do tecido e o efeito prático que ela traz",
    focus: "toque, estrutura, leveza, elasticidade, transparência, resistência, composição e facilidade de cuidado"
  },
  {
    name: "Aparência de boutique",
    hookStyle: "descreva a primeira impressão visual ou o que faz a peça parecer mais sofisticada",
    focus: "design, acabamento, recortes, proporções, elegância natural e detalhes que valorizam o visual"
  },
  {
    name: "Cor e combinações",
    hookStyle: "comece pela cor cadastrada ou por uma possibilidade concreta de combinação",
    focus: "cor selecionada, acessórios, calçados e maneiras realistas de coordenar a peça"
  },
  {
    name: "Ocasião e versatilidade",
    hookStyle: "coloque a cliente em uma situação real na qual a peça resolve o look",
    focus: "trabalho, passeio, encontro, evento, viagem, estação do ano e transição entre ocasiões"
  },
  {
    name: "Objeção resolvida",
    hookStyle: "comece por uma dúvida comum de compra que a descrição realmente permita responder",
    focus: "não marcar, não apertar, não ficar transparente, não amassar, ter elasticidade ou oferecer segurança"
  },
  {
    name: "Look pronto sem complicação",
    hookStyle: "abra com o desejo de ficar bem arrumada com pouco esforço",
    focus: "facilidade para montar o look, praticidade, peças complementares e resultado visual no dia a dia"
  }
];

export function copyStrategyIndexFor(seed: string, generationIndex: number) {
  const seedOffset = [...seed].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0);
  const safeGeneration = Number.isFinite(generationIndex) ? Math.max(0, Math.floor(generationIndex)) : 0;
  return (seedOffset + safeGeneration) % copyStrategies.length;
}

export function copyStrategyFor(generationIndex: number) {
  const safeIndex = Number.isFinite(generationIndex) ? Math.max(0, Math.floor(generationIndex)) : 0;
  return copyStrategies[safeIndex % copyStrategies.length];
}

export function copyStrategyInstruction(generationIndex: number) {
  const strategy = copyStrategyFor(generationIndex);
  return [
    `Estratégia obrigatória desta versão: ${strategy.name}.`,
    `Formato da abertura: ${strategy.hookStyle}.`,
    `Aspectos prioritários: ${strategy.focus}.`,
    "Use essa estratégia somente quando houver apoio na descrição. Se faltarem fatos, avance mentalmente para a próxima estratégia compatível; nunca invente características."
  ];
}