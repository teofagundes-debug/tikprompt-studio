import Link from "next/link";
import { accessPackages } from "@/lib/packages";

export default function RenewPage() {
  return (
    <main className="renew-page">
      <section className="renew-card">
        <div className="renew-head">
          <Link className="landing-brand" href="/landing">
            <span className="mark">TP</span>
            <span>TikPrompt Studio</span>
          </Link>
          <Link href="/">Entrar</Link>
        </div>

        <div className="renew-title">
          <span className="landing-kicker">Renovação de acesso</span>
          <h1>Escolha seu pacote e continue usando o TikPrompt Studio</h1>
          <p>Após o pagamento confirmado, seu acesso é renovado automaticamente pelo período escolhido.</p>
        </div>

        <div className="renew-grid">
          {accessPackages.map((plan) => (
            <article className={plan.featured ? "featured-plan" : ""} key={plan.name}>
              <h2>{plan.name}</h2>
              <strong className="plan-price">{plan.price}</strong>
              <p>{plan.description}</p>
              <a href={plan.link} target="_blank" rel="noreferrer">
                Renovar agora
              </a>
            </article>
          ))}
        </div>

        <p className="renew-support">
          Precisa de ajuda? Fale com o suporte: <a href="mailto:suporte_tikprompt@escalavendas.com.br">suporte_tikprompt@escalavendas.com.br</a>
        </p>
      </section>
    </main>
  );
}
