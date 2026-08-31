import Link from "next/link";
import { accessPackages } from "@/lib/packages";

const benefits = [
  {
    title: "Falas de vídeo com IA",
    text: "Gere Gancho, Interesse e CTA a partir da descrição do produto, revise a prévia e aplique nos cards sem mexer no prompt técnico."
  },
  {
    title: "Prompts por negócio e produto",
    text: "Organize lojas, produtos, imagens, vídeos e copies em uma biblioteca fácil de encontrar."
  },
  {
    title: "Vídeos com partes e falas",
    text: "Separe versões de vídeos por tipo, edite o bloco SPEECH e crie variações de fala com mais agilidade."
  },
  {
    title: "Copiar e produzir rápido",
    text: "Um clique copia o prompt certo para colar na IA que o cliente já usa no dia a dia."
  },
  {
    title: "Escala sem bagunça",
    text: "Duplique produtos, cards e vídeos para criar variações sem começar do zero toda vez."
  }
];

const steps = [
  "Cadastre o negócio ou loja",
  "Descreva o produto para orientar a IA",
  "Salve prompts de imagem, vídeo e copy",
  "Gere falas, copie prompts e produza em escala"
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-nav">
          <Link className="landing-brand" href="/landing">
            <span className="mark">TP</span>
            <span>TikPrompt Studio</span>
          </Link>
          <div className="landing-nav-actions">
            <Link href="/">Entrar</Link>
            <a href="#pacotes">Ver pacotes</a>
          </div>
        </div>

        <div className="landing-hero-content">
          <div className="landing-hero-copy">
            <span className="landing-kicker">Biblioteca de prompts com geração de falas por IA</span>
            <h1>TikPrompt Studio</h1>
            <p>
              Organize prompts de imagem, roteiros de vídeo e copies por negócio e produto. Gere falas de vídeo com IA, revise antes de aplicar e produza conteúdo de vendas com mais velocidade.
            </p>
            <div className="landing-cta-row">
              <a className="landing-primary" href="#pacotes">Quero organizar meus prompts</a>
              <Link className="landing-secondary" href="/">Já tenho acesso</Link>
            </div>
          </div>

          <div className="landing-demo-video">
            <span>Demonstração rápida</span>
            <video src="/tikprompt-studio-demo.mp4" autoPlay muted loop playsInline controls preload="metadata" />
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <span>Para quem é</span>
          <h2>Feito para quem precisa transformar produto em vídeo todos os dias</h2>
          <p>Criadores, gestores de e-commerce, social sellers e equipes que precisam de prompts organizados e falas comerciais prontas para testar.</p>
        </div>
        <div className="benefit-grid">
          {benefits.map((benefit) => (
            <article className="benefit-card" key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section workflow-band">
        <div className="section-heading">
          <span>Como funciona</span>
          <h2>Da descrição do produto à fala pronta em poucos cliques</h2>
        </div>
        <div className="workflow-grid">
          {steps.map((step, index) => (
            <article key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section plans-section" id="pacotes">
        <div className="section-heading">
          <span>Pacotes</span>
          <h2>Comece simples e escale quando sua operação crescer</h2>
          <p>Contrate pacotes de acesso de 1 mês, 3 meses ou 6 meses. O acesso é liberado automaticamente após o pagamento confirmado.</p>
        </div>
        <div className="plans-grid">
          {accessPackages.map((plan) => (
            <article className={plan.featured ? "featured-plan" : ""} key={plan.name}>
              <h3>{plan.landingName}</h3>
              <div className="plan-price-row">
                <strong className="plan-price">{plan.price}</strong>
                {plan.savings && <span className="plan-savings">{plan.savings}</span>}
              </div>
              <p>{plan.description}</p>
              <a href={plan.link} target="_blank" rel="noreferrer">
                Contratar pacote
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final" id="contato">
        <div>
          <span className="landing-kicker">Produção rápida, biblioteca limpa e IA no fluxo</span>
          <h2>Transforme seus prompts em uma operação de conteúdo.</h2>
          <p>Menos procura, menos retrabalho e mais velocidade para gerar falas, revisar vídeos e produzir conteúdo de produto.</p>
        </div>
        <a className="landing-primary" href="#pacotes">Escolher um pacote</a>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>Escala Vendas Ltda</strong>
          <span>CNPJ: 60.328.666/0001-03</span>
        </div>
        <a href="mailto:suporte_tikprompt@escalavendas.com.br">suporte_tikprompt@escalavendas.com.br</a>
      </footer>
    </main>
  );
}
