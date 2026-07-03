import Link from "next/link";
import { accessPackages } from "@/lib/packages";

const benefits = [
  {
    title: "Prompts por negócio e produto",
    text: "Organize lojas, produtos, imagens, vídeos e copies em uma biblioteca fácil de encontrar."
  },
  {
    title: "Vídeos com partes e falas",
    text: "Separe versões de vídeos por tipo, edite o bloco SPEECH e mantenha os prompts originais salvos."
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
  "Crie produtos e categorias",
  "Salve prompts de imagem, vídeo e copy",
  "Copie, cole na IA e produza em escala"
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

        <div className="hero-scene" aria-hidden="true">
          <div className="scene-sidebar">
            <span />
            <strong>Loja da Danii</strong>
            <small>Vestido Midi etc...</small>
          </div>
          <div className="scene-board">
            <div className="scene-tabs">
              <span>Imagem</span>
              <strong>Vídeo</strong>
              <span>Copy-postagens</span>
            </div>
            <div className="scene-columns">
              <div className="scene-column">
                <strong>Video 1</strong>
                <div className="scene-card">
                  <span />
                  <b>Parte 1</b>
                  <small>SPEECH editável</small>
                </div>
                <div className="scene-card compact">
                  <span />
                  <b>Parte 2</b>
                </div>
              </div>
              <div className="scene-column warm">
                <strong>UGC curto</strong>
                <div className="scene-card">
                  <span />
                  <b>Copy 1</b>
                  <small>Copiar em 1 clique</small>
                </div>
              </div>
              <div className="scene-prompt">
                <small>SPEECH (Portuguese BR)</small>
                <p>Meninas, olha esse modelo que acabou de chegar...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-hero-copy">
          <span className="landing-kicker">Biblioteca de prompts para produção em escala</span>
          <h1>TikPrompt Studio</h1>
          <p>
            Organize prompts de imagem, roteiros de vídeo e copies por negócio e produto para produzir conteúdo de vendas com mais velocidade no TikTok, Instagram, Facebook e e-commerce.
          </p>
          <div className="landing-cta-row">
            <a className="landing-primary" href="#pacotes">Quero organizar meus prompts</a>
            <Link className="landing-secondary" href="/">Já tenho acesso</Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <span>Para quem é</span>
          <h2>Feito para quem produz conteúdo comercial todos os dias</h2>
          <p>Criadores profissionais, gestores de e-commerce, social sellers e equipes que precisam transformar produtos em conteúdo pronto para venda.</p>
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
          <h2>Da ideia ao prompt certo em poucos cliques</h2>
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
          <span className="landing-kicker">Produção rápida, biblioteca limpa</span>
          <h2>Transforme seus prompts em um sistema de trabalho.</h2>
          <p>Menos procura, menos retrabalho e mais velocidade para criar conteúdo de produto.</p>
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
