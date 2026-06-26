"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPromptOutput, getPromptChips } from "@/lib/prompt";

type Prompt = {
  id: string;
  title: string;
  description: string;
  category: string;
  template: string;
  tool: string | null;
  duration: string | null;
  tone: string | null;
  cta: string | null;
  thumb: string | null;
  speechLines: string[];
  lineTokenPrefix: string | null;
  lineSectionTitle: string | null;
  lineHelp: string | null;
  appendLines: boolean;
  productId: string;
  businessId: string;
};

type Product = {
  id: string;
  name: string;
  prompts: Prompt[];
};

type Business = {
  id: string;
  name: string;
  niche: string;
  initials: string;
  color: string;
  products: Product[];
};

const categories = ["Imagem", "Video", "Copy"];

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("Video");
  const [promptId, setPromptId] = useState("");
  const [draft, setDraft] = useState<Prompt | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/data", { cache: "no-store" });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const details = data?.details ? ` ${data.details}` : "";
        throw new Error(`Nao foi possivel carregar os dados.${details}`);
      }

      const data = await response.json();
      setBusinesses(data.businesses);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar o app.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const business = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const product = business?.products.find((item) => item.id === productId) ?? business?.products[0];

  const prompts = useMemo(() => {
    return (
      product?.prompts.filter((prompt) => {
        const haystack = `${prompt.title} ${prompt.description} ${getPromptChips(prompt).join(" ")} ${prompt.template}`.toLowerCase();
        return prompt.category === category && haystack.includes(search.toLowerCase());
      }) ?? []
    );
  }, [product, category, search]);

  useEffect(() => {
    if (!business && businesses.length) setBusinessId(businesses[0].id);
    if (business && !businessId) setBusinessId(business.id);
    if (business && (!product || !business.products.some((item) => item.id === productId))) {
      setProductId(business.products[0]?.id ?? "");
    }
  }, [business, businessId, businesses, product, productId]);

  useEffect(() => {
    const selected = prompts.find((prompt) => prompt.id === promptId) ?? prompts[0] ?? product?.prompts[0];
    if (selected && selected.id !== draft?.id) {
      setPromptId(selected.id);
      setDraft(structuredClone(selected));
    }
  }, [draft?.id, product?.prompts, promptId, prompts]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function copyPrompt(prompt: Prompt) {
    await navigator.clipboard.writeText(buildPromptOutput(prompt));
    showToast("Prompt copiado");
  }

  async function savePrompt() {
    if (!draft) return;
    await fetch(`/api/prompts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    showToast("Edicao salva");
    await loadData();
  }

  async function duplicatePrompt() {
    if (!draft) return;
    const response = await fetch(`/api/prompts/${draft.id}/duplicate`, { method: "POST" });
    const data = await response.json();
    showToast("Prompt duplicado");
    await loadData();
    setPromptId(data.prompt.id);
    setDraft(data.prompt);
  }

  async function duplicateProduct() {
    if (!product) return;
    const response = await fetch(`/api/products/${product.id}/duplicate`, { method: "POST" });
    const data = await response.json();
    showToast("Produto duplicado");
    await loadData();
    setProductId(data.product.id);
  }

  async function renameProduct(name: string) {
    if (!product) return;
    setBusinesses((current) =>
      current.map((biz) =>
        biz.id === business?.id
          ? { ...biz, products: biz.products.map((item) => (item.id === product.id ? { ...item, name } : item)) }
          : biz
      )
    );
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
  }

  if (loading) return <main className="center">Carregando TikPrompt Studio...</main>;

  if (loadError) {
    return (
      <main className="center">
        <h1>TikPrompt Studio</h1>
        <p>{loadError}</p>
        <button className="primary" onClick={loadData}>
          Tentar novamente
        </button>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="center">
        <h1>TikPrompt Studio</h1>
        <p>Banco vazio. Crie os dados iniciais para comecar.</p>
        <button
          className="primary"
          onClick={async () => {
            await fetch("/api/seed", { method: "POST" });
            await loadData();
          }}
        >
          Criar dados iniciais
        </button>
      </main>
    );
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">TP</div>
          <div>
            <strong>TikPrompt Studio</strong>
            <span>Biblioteca de prompts</span>
          </div>
        </div>

        <section className="side-section">
          <div className="side-title">Negocios</div>
          {businesses.map((item) => (
            <button
              className={`business-button ${item.id === business.id ? "active" : ""}`}
              key={item.id}
              onClick={() => {
                setBusinessId(item.id);
                setProductId(item.products[0]?.id ?? "");
              }}
            >
              <span className="business-avatar" style={{ background: item.color }}>
                {item.initials}
              </span>
              <span className="business-name">
                <strong>{item.name}</strong>
                <span>{item.niche}</span>
              </span>
              <span className="count">{item.products.reduce((sum, current) => sum + current.prompts.length, 0)}</span>
            </button>
          ))}
        </section>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h1>{business.name}</h1>
            <p>
              {business.niche} - {product?.name} - {category}
            </p>
          </div>
          <label className="search">
            Buscar
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Prompt, tag ou produto" />
          </label>
        </header>

        <section className="product-row">
          <div>
            <div className="field-label">Produtos</div>
            <div className="product-tabs">
              {business.products.map((item) => (
                <button
                  className={`product-tab ${item.id === product?.id ? "active" : ""}`}
                  key={item.id}
                  onClick={() => setProductId(item.id)}
                >
                  {item.name}
                  <span>{item.prompts.length}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">Produto atual</span>
            <input value={product?.name ?? ""} onChange={(event) => renameProduct(event.target.value)} />
          </label>
          <button className="secondary" onClick={duplicateProduct}>
            Duplicar produto
          </button>
        </section>

        <section className="tabs-row">
          <div className="tabs">
            {categories.map((item) => (
              <button className={`tab ${item === category ? "active" : ""}`} key={item} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="metrics">
            <div className="metric">
              <strong>{product?.prompts.length ?? 0}</strong> prompts
            </div>
          </div>
        </section>

        <section className="workspace">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Biblioteca</h2>
                <span>
                  {prompts.length} itens em {product?.name} / {category}
                </span>
              </div>
              <button className="secondary" onClick={duplicatePrompt}>
                Duplicar
              </button>
            </div>
            <div className="prompt-list">
              {prompts.map((prompt) => (
                <article className={`prompt-card ${prompt.id === promptId ? "active" : ""}`} key={prompt.id}>
                  <div className="prompt-top">
                    <span className="thumb" style={{ background: prompt.thumb ?? undefined }} />
                    <span>
                      <h3>{prompt.title}</h3>
                      <p>{prompt.description}</p>
                    </span>
                  </div>
                  <div className="chips">
                    {getPromptChips(prompt).map((chip) => (
                      <span className="chip" key={chip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="prompt-actions">
                    <button className="prompt-action copy" onClick={() => copyPrompt(prompt)}>
                      Copiar
                    </button>
                    <button
                      className="prompt-action"
                      onClick={() => {
                        setPromptId(prompt.id);
                        setDraft(structuredClone(prompt));
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel editor">
            <div className="panel-head">
              <div>
                <h2>{draft?.title ?? "Editor"}</h2>
                <span>Prompt completo salvo para copiar e colar</span>
              </div>
              <button className="secondary" onClick={savePrompt}>
                Salvar edicao
              </button>
            </div>

            {draft && (
              <div className="editor-body">
                <div className="card-meta-grid">
                  <label className="field">
                    <span className="field-label">Nome do card</span>
                    <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                  </label>
                  <label className="field">
                    <span className="field-label">Rotulo / descricao</span>
                    <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                  </label>
                </div>

                <label className="template-area">
                  <span className="field-label">
                    Prompt completo
                    <span>{draft.template.length} caracteres</span>
                  </span>
                  <textarea value={draft.template} onChange={(event) => setDraft({ ...draft, template: event.target.value })} />
                </label>

                {draft.lineTokenPrefix && (
                  <section className="speech-card">
                    <div className="speech-card-head">
                      <span className="speech-pill">{draft.lineSectionTitle ?? "SPEECH (Portuguese BR)"}</span>
                      <span className="speech-hint">{draft.lineHelp ?? "Campo de edicao rapida"}</span>
                    </div>
                    <textarea
                      value={draft.speechLines.join("\n\n")}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          speechLines: event.target.value
                            .split(/\n+/)
                            .map((line) => line.trim())
                            .filter(Boolean)
                        })
                      }
                    />
                  </section>
                )}
              </div>
            )}

            <div className="editor-footer">
              <button className="ghost" onClick={() => draft && setDraft(structuredClone(product?.prompts.find((item) => item.id === draft.id) ?? draft))}>
                Restaurar
              </button>
              <button className="primary" onClick={() => draft && copyPrompt(draft)}>
                Copiar
              </button>
            </div>
          </section>
        </section>
      </section>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </main>
  );
}
