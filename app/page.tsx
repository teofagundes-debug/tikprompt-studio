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
  takeType: string | null;
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
const videoTakeTypes = ["Todos", "1 take", "varios takes"];
const speechHeaderPattern = /SPEECH\s*\(Portuguese BR\):/i;

function categoryLabel(value: string) {
  return value === "Video" ? "Vídeo" : value;
}

function takeTypeLabel(value: string) {
  return value === "varios takes" ? "vários takes" : value;
}

function extractSpeechLines(template: string) {
  const match = speechHeaderPattern.exec(template);
  if (!match) return [];

  const sectionStart = match.index + match[0].length;
  const rest = template.slice(sectionStart);
  const sectionEnd = rest.search(/\n---/);
  const body = (sectionEnd >= 0 ? rest.slice(0, sectionEnd) : rest).trim().replace(/^"+|"+$/g, "");

  return body
    .split(/\n+/)
    .map((line) => line.trim().replace(/^"+|"+$/g, ""))
    .filter((line) => line && line !== "---");
}

function formatSpeechSection(speechLines: string[]) {
  const body = speechLines.length ? `"${speechLines.join("\n\n")}"` : "\"\"";
  return `SPEECH (Portuguese BR):\n\n${body}`;
}

function syncSpeechSection(template: string, speechLines: string[]) {
  const match = speechHeaderPattern.exec(template);
  const speechSection = formatSpeechSection(speechLines);

  if (!match) {
    return `${template.trimEnd()}\n\n---\n\n${speechSection}`;
  }

  const sectionStart = match.index;
  const afterHeader = match.index + match[0].length;
  const rest = template.slice(afterHeader);
  const nextDivider = rest.search(/\n---/);
  const sectionEnd = nextDivider >= 0 ? afterHeader + nextDivider : template.length;

  return `${template.slice(0, sectionStart)}${speechSection}${template.slice(sectionEnd)}`;
}

function normalizePromptForEditor(prompt: Prompt) {
  if (prompt.category !== "Video" || !prompt.lineTokenPrefix) return prompt;

  const speechLines = extractSpeechLines(prompt.template);
  const onlyTokens = speechLines.length > 0 && speechLines.every((line) => /^\{[^}]+\}$/.test(line));
  if (!speechLines.length || onlyTokens) return prompt;

  return { ...prompt, speechLines };
}

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("Video");
  const [videoTakeType, setVideoTakeType] = useState("Todos");
  const [view, setView] = useState<"home" | "library">("home");
  const [promptId, setPromptId] = useState("");
  const [draft, setDraft] = useState<Prompt | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState("");
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
        throw new Error(`Não foi possível carregar os dados.${details}`);
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
  const totalProducts = businesses.reduce((sum, item) => sum + item.products.length, 0);
  const totalPrompts = businesses.reduce((sum, item) => sum + item.products.reduce((productSum, current) => productSum + current.prompts.length, 0), 0);
  const totalVideos = businesses.reduce(
    (sum, item) =>
      sum +
      item.products.reduce((productSum, current) => productSum + current.prompts.filter((prompt) => prompt.category === "Video").length, 0),
    0
  );

  const prompts = useMemo(() => {
    return (
      product?.prompts.filter((prompt) => {
        const haystack = `${prompt.title} ${prompt.description} ${getPromptChips(prompt).join(" ")} ${prompt.template}`.toLowerCase();
        const matchesCategory = prompt.category === category;
        const matchesTake = category !== "Video" || videoTakeType === "Todos" || (prompt.takeType ?? "1 take") === videoTakeType;
        return matchesCategory && matchesTake && haystack.includes(search.toLowerCase());
      }) ?? []
    );
  }, [product, category, videoTakeType, search]);

  useEffect(() => {
    if (!business && businesses.length) setBusinessId(businesses[0].id);
    if (business && !businessId) setBusinessId(business.id);
    if (business && (!product || !business.products.some((item) => item.id === productId))) {
      setProductId(business.products[0]?.id ?? "");
    }
  }, [business, businessId, businesses, product, productId]);

  useEffect(() => {
    if (prompts.length && !prompts.some((prompt) => prompt.id === promptId)) {
      setPromptId(prompts[0].id);
    }

    if (!prompts.length) {
      setPromptId("");
    }
  }, [promptId, prompts]);

  function closeEditor() {
    setEditorOpen(false);
    setDraft(null);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function copyPrompt(prompt: Prompt) {
    await navigator.clipboard.writeText(buildPromptOutput(prompt));
    setCopiedPromptId(prompt.id);
    showToast("Prompt copiado");
  }

  async function createBusiness() {
    const name = window.prompt("Nome do negócio", "Novo negócio")?.trim();
    if (!name) return;

    const niche = window.prompt("Nicho / descrição", "TikTok Shop")?.trim() || "TikTok Shop";
    const response = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, niche })
    });
    const data = await response.json();

    await loadData();
    setBusinessId(data.business.id);
    setProductId(data.business.products[0]?.id ?? "");
    setView("library");
    closeEditor();
    showToast("Negócio criado");
  }

  async function editBusiness() {
    if (!business) return;
    const name = window.prompt("Nome do negócio", business.name)?.trim();
    if (!name) return;

    const niche = window.prompt("Nicho / descrição", business.niche)?.trim() || business.niche;
    await fetch(`/api/businesses/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, niche })
    });

    await loadData();
    showToast("Negócio atualizado");
  }

  async function deleteBusiness() {
    if (!business) return;
    if (!window.confirm(`Excluir o negócio "${business.name}" e todos os produtos/prompts dele?`)) return;

    await fetch(`/api/businesses/${business.id}`, { method: "DELETE" });
    setBusinessId("");
    setProductId("");
    closeEditor();
    await loadData();
    showToast("Negócio excluído");
  }

  async function createProduct() {
    if (!business) return;
    const name = window.prompt("Nome do produto", "Novo produto")?.trim();
    if (!name) return;

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, businessId: business.id })
    });
    const data = await response.json();

    await loadData();
    setProductId(data.product.id);
    closeEditor();
    showToast("Produto criado");
  }

  async function duplicateProduct() {
    if (!product) return;
    const response = await fetch(`/api/products/${product.id}/duplicate`, { method: "POST" });
    const data = await response.json();
    await loadData();
    setProductId(data.product.id);
    closeEditor();
    showToast("Produto duplicado");
  }

  async function deleteProduct() {
    if (!product) return;
    if (!window.confirm(`Excluir o produto "${product.name}" e todos os prompts dele?`)) return;

    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    setProductId("");
    closeEditor();
    await loadData();
    showToast("Produto excluído");
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

  async function createPrompt() {
    if (!business || !product) return;

    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: business.id,
        productId: product.id,
        category,
        takeType: category === "Video" && videoTakeType !== "Todos" ? videoTakeType : "1 take"
      })
    });
    const data = await response.json();

    await loadData();
    setPromptId(data.prompt.id);
    setDraft(normalizePromptForEditor(data.prompt));
    setEditorOpen(true);
    showToast("Prompt criado");
  }

  async function savePrompt() {
    if (!draft) return;
    const response = await fetch(`/api/prompts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    const data = await response.json();

    setPromptId(data.prompt.id);
    await loadData();
    closeEditor();
    showToast("Edição salva");
  }

  async function duplicatePrompt(prompt: Prompt) {
    const response = await fetch(`/api/prompts/${prompt.id}/duplicate`, { method: "POST" });
    const data = await response.json();
    await loadData();
    setPromptId(data.prompt.id);
    setDraft(normalizePromptForEditor(data.prompt));
    setEditorOpen(true);
    showToast("Prompt duplicado");
  }

  async function deletePrompt(prompt: Prompt) {
    if (!window.confirm(`Excluir o prompt "${prompt.title}"?`)) return;

    await fetch(`/api/prompts/${prompt.id}`, { method: "DELETE" });
    if (draft?.id === prompt.id) closeEditor();
    await loadData();
    showToast("Prompt excluído");
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
        <p>Banco vazio. Crie dados iniciais ou comece um negócio do zero.</p>
        <div className="center-actions">
          <button
            className="secondary"
            onClick={async () => {
              await fetch("/api/seed", { method: "POST" });
              await loadData();
            }}
          >
            Criar dados iniciais
          </button>
          <button className="primary" onClick={createBusiness}>
            Criar negócio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")}>
          <div className="mark">TP</div>
          <div>
            <strong>TikPrompt Studio</strong>
            <span>Biblioteca de prompts</span>
          </div>
        </button>

        <section className="side-section">
          <div className="side-title">Negócios</div>
          {businesses.map((item) => (
            <button
              className={`business-button ${item.id === business.id ? "active" : ""}`}
              key={item.id}
              onClick={() => {
                setBusinessId(item.id);
                setProductId(item.products[0]?.id ?? "");
                setView("library");
                closeEditor();
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
          <div className="side-actions">
            <button onClick={createBusiness}>Criar</button>
            <button onClick={editBusiness}>Editar</button>
            <button className="danger-action" onClick={deleteBusiness}>
              Excluir
            </button>
          </div>
        </section>
      </aside>

      <section className="main">
        {view === "home" ? (
          <section className="welcome-screen">
            <div className="welcome-hero">
              <span className="welcome-kicker">Bem-vindo</span>
              <h1>TikPrompt Studio</h1>
              <p>
                Organize prompts por negócio e produto, copie com velocidade e mantenha suas variações de imagem, vídeo e copy prontas para produção.
              </p>
              <div className="welcome-audience">
                <strong>Público-alvo</strong>
                <span>Criadores de conteúdo para vendas no TikTok, Instagram, Facebook e empreendedores de e-commerce que produzem conteúdo em escala.</span>
              </div>
              <div className="welcome-actions">
                <button className="primary" onClick={() => setView("library")}>
                  Abrir biblioteca
                </button>
                <button className="secondary" onClick={createBusiness}>
                  Criar negócio
                </button>
              </div>
            </div>

            <div className="welcome-stats">
              <h2>Cadastros</h2>
              <div className="welcome-stats-grid">
                <div>
                  <strong>{businesses.length}</strong>
                  <span>negócios</span>
                </div>
                <div>
                  <strong>{totalProducts}</strong>
                  <span>produtos</span>
                </div>
                <div>
                  <strong>{totalPrompts}</strong>
                  <span>prompts</span>
                </div>
                <div>
                  <strong>{totalVideos}</strong>
                  <span>vídeos</span>
                </div>
              </div>
            </div>

            <section className="welcome-creative" aria-label="Produção de conteúdo para redes sociais">
              <div className="creative-phone">
                <div className="phone-top" />
                <div className="phone-video">
                  <span className="play-mark">▶</span>
                </div>
                <strong>Prompt pronto</strong>
                <span>copiar e produzir</span>
              </div>
              <div className="creative-strip" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="creative-clapper">
                <div className="clapper-top">
                  <span />
                  <span />
                  <span />
                </div>
                <strong>Vídeo 01</strong>
                <span>Take + fala + copy</span>
              </div>
              <div className="creative-socials">
                <span className="social-logo tiktok">TikTok</span>
                <span className="social-logo instagram">Instagram</span>
                <span className="social-logo facebook">Facebook</span>
                <span className="social-logo youtube">YouTube</span>
              </div>
              <div className="creative-caption">
                <strong>Conteúdo em escala</strong>
                <span>Imagem, vídeo e copy organizados para vender todos os dias.</span>
              </div>
            </section>

            <div className="welcome-grid">
              <article className="welcome-card">
                <span>01</span>
                <h2>Tudo em um só lugar</h2>
                <p>Chega de abrir 10 abas diferentes para encontrar o prompt certo. Imagens, roteiros de vídeo e copies ficam organizados a um clique.</p>
              </article>
              <article className="welcome-card">
                <span>02</span>
                <h2>Prompts por negócio e produto</h2>
                <p>Cada negócio tem sua própria estrutura de produtos. Você cria uma vez, organiza do seu jeito e acessa sem confusão.</p>
              </article>
              <article className="welcome-card">
                <span>03</span>
                <h2>Roteiros com takes numerados</h2>
                <p>Produza vídeos com consistência usando takes individuais e o campo SPEECH destacado para editar a fala com agilidade.</p>
              </article>
              <article className="welcome-card">
                <span>04</span>
                <h2>Copies prontas para copiar</h2>
                <p>Legendas, CTAs e copies de postagem ficam salvas por produto, com cópia em um clique para não reescrever o que já funcionou.</p>
              </article>
            </div>
          </section>
        ) : (
          <>
        <header className="topbar">
          <div>
            <h1>{business.name}</h1>
            <p>
              {business.niche} - {product?.name ?? "sem produto"} - {categoryLabel(category)}
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
                  onClick={() => {
                    setProductId(item.id);
                    closeEditor();
                  }}
                >
                  {item.name}
                  <span>{item.prompts.length}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">Produto atual</span>
            <input value={product?.name ?? ""} onChange={(event) => renameProduct(event.target.value)} disabled={!product} />
          </label>
          <div className="action-row">
            <button className="secondary" onClick={createProduct}>
              Criar produto
            </button>
            <button className="secondary" onClick={duplicateProduct} disabled={!product}>
              Duplicar
            </button>
            <button className="secondary danger" onClick={deleteProduct} disabled={!product}>
              Excluir
            </button>
          </div>
        </section>

        <section className="tabs-row">
          <div className="tabs">
            {categories.map((item) => (
              <button
                className={`tab ${item === category ? "active" : ""}`}
                key={item}
                onClick={() => {
                  setCategory(item);
                  if (item !== "Video") setVideoTakeType("Todos");
                  closeEditor();
                }}
              >
                {categoryLabel(item)}
              </button>
            ))}
          </div>
          <div className="metrics">
            <div className="metric">
              <strong>{product?.prompts.length ?? 0}</strong> prompts
            </div>
          </div>
        </section>

        {category === "Video" && (
          <section className="subtabs-row">
            <div className="subtabs">
              {videoTakeTypes.map((item) => (
                <button
                  className={`subtab ${item === videoTakeType ? "active" : ""}`}
                  key={item}
                  onClick={() => {
                    setVideoTakeType(item);
                    closeEditor();
                  }}
                >
                  {takeTypeLabel(item)}
                </button>
              ))}
            </div>
            <span className="subtabs-note">Separe versões do mesmo produto por take e salve as copies como cards.</span>
          </section>
        )}

        <section className={`workspace ${editorOpen ? "" : "library-only"}`}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Biblioteca</h2>
                <span>
                  {prompts.length} itens em {product?.name ?? "sem produto"} / {categoryLabel(category)}
                </span>
              </div>
              <button className="secondary" onClick={createPrompt} disabled={!product}>
                Criar prompt
              </button>
            </div>
            <div className="prompt-list">
              {!product && <p className="empty-state">Crie um produto para salvar prompts.</p>}
              {product && !prompts.length && <p className="empty-state">Nenhum prompt nesta categoria. Clique em Criar prompt.</p>}
              {prompts.map((prompt) => (
                <article className={`prompt-card ${prompt.id === promptId ? "active" : ""} ${prompt.id === copiedPromptId ? "copied" : ""}`} key={prompt.id}>
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
                        setDraft(normalizePromptForEditor(structuredClone(prompt)));
                        setEditorOpen(true);
                      }}
                    >
                      Editar
                    </button>
                    <button className="prompt-action" onClick={() => duplicatePrompt(prompt)}>
                      Duplicar
                    </button>
                    <button className="prompt-action danger" onClick={() => deletePrompt(prompt)}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {editorOpen && (
            <section className="panel editor">
              <div className="panel-head">
                <div>
                  <h2>{draft?.title ?? "Editor"}</h2>
                  <span>Prompt completo salvo para copiar e colar</span>
                </div>
                <div className="editor-head-actions">
                  <button className="ghost" onClick={closeEditor}>
                    Fechar
                  </button>
                  <button className="secondary" onClick={savePrompt}>
                    Salvar edição
                  </button>
                </div>
              </div>

              {draft && (
                <div className="editor-body">
                  <div className="card-meta-grid">
                    <label className="field">
                      <span className="field-label">Nome do card</span>
                      <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                    </label>
                    <label className="field">
                      <span className="field-label">Rótulo / descrição</span>
                      <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                    </label>
                    {draft.category === "Video" && (
                      <label className="field">
                        <span className="field-label">Take</span>
                        <select value={draft.takeType ?? "1 take"} onChange={(event) => setDraft({ ...draft, takeType: event.target.value })}>
                          <option value="1 take">1 take</option>
                          <option value="varios takes">vários takes</option>
                        </select>
                      </label>
                    )}
                  </div>

                  {draft.lineTokenPrefix && (
                    <section className="speech-card">
                      <div className="speech-card-head">
                        <span className="speech-pill">{draft.lineSectionTitle ?? "SPEECH (Portuguese BR)"}</span>
                        <span className="speech-hint">{draft.lineHelp ?? "Campo de edição rápida"}</span>
                      </div>
                      <textarea
                        value={draft.speechLines.join("\n\n")}
                        onChange={(event) =>
                          {
                            const speechLines = event.target.value
                              .split(/\n+/)
                              .map((line) => line.trim())
                              .filter(Boolean);
                            setDraft({
                              ...draft,
                              speechLines,
                              template: syncSpeechSection(draft.template, speechLines)
                            });
                          }
                        }
                      />
                    </section>
                  )}

                  <label className="template-area">
                    <span className="field-label">
                      Prompt completo
                      <span>{draft.template.length} caracteres</span>
                    </span>
                    <textarea
                      value={draft.template}
                      onChange={(event) => {
                        const template = event.target.value;
                        const speechLines = draft.category === "Video" ? extractSpeechLines(template) : [];
                        setDraft({ ...draft, template, speechLines: speechLines.length ? speechLines : draft.speechLines });
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="editor-footer">
                <button className="primary" onClick={() => draft && copyPrompt(draft)}>
                  Copiar
                </button>
              </div>
            </section>
          )}
        </section>
          </>
        )}
      </section>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </main>
  );
}
