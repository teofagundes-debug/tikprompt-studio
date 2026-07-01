"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
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
  scriptGroup: string | null;
  takeOrder: number | null;
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

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  forcePasswordChange: boolean;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  plan: string | null;
  paymentId: string | null;
  forcePasswordChange: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { businesses: number };
};

const categories = ["Imagem", "Video", "Copy"];
const defaultVideoTypes = ["1-POV", "2-UGC"];
const speechHeaderPattern = /SPEECH\s*\(Portuguese BR\):/i;
const customVideoTypesKey = "tikprompt-video-types";

function categoryLabel(value: string) {
  return value === "Video" ? "Vídeo" : value;
}

function categoryTabLabel(value: string) {
  return value === "Copy" ? "Copy-postagens" : categoryLabel(value);
}

function takeTypeLabel(value: string) {
  const normalized = value === "varios takes" ? "+de 3 takes" : value;
  return normalized.replace(/\btakes\b/gi, "partes").replace(/\btake\b/gi, "parte");
}

function matchesTakeType(promptTakeType: string | null, selectedTakeType: string) {
  const value = promptTakeType ?? defaultVideoTypes[0];
  if (selectedTakeType === "+de 3 takes") return value === "+de 3 takes" || value === "varios takes";
  return value === selectedTakeType;
}

function inferScriptNumber(title: string) {
  const match = title.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function inferTakeOrder(title: string) {
  const normalized = title.trim().toLowerCase();
  if (normalized.startsWith("gatilho")) return 1;
  if (normalized.startsWith("interesse")) return 2;
  if (normalized.startsWith("cta")) return 3;
  const match = normalized.match(/(?:take|parte)\s*(\d+)/);
  return match ? Number(match[1]) : 99;
}

function scriptGroupForPrompt(prompt: Prompt) {
  if (prompt.scriptGroup) return normalizeScriptGroup(prompt.scriptGroup);
  const scriptNumber = inferScriptNumber(prompt.title);
  return scriptNumber ? `Video ${scriptNumber}` : "Video sem grupo";
}

function scriptGroupLabel(value: string) {
  return normalizeScriptGroup(value).replace(/^Roteiro/i, "Video");
}

function normalizeScriptGroup(value: string) {
  const normalized = value.trim().replace(/^Roteiro/i, "Video");
  return normalized.replace(/\s*[-–—]\s*(?:Take|Parte)\s*\d+\s*$/i, "").trim() || "Video sem grupo";
}

function parseScriptGroupInput(value: string, currentTakeOrder: number | null) {
  const takeMatch = value.match(/(?:Take|Parte)\s*(\d+)\s*$/i);
  return {
    scriptGroup: normalizeScriptGroup(value),
    takeOrder: takeMatch ? Number(takeMatch[1]) : currentTakeOrder
  };
}

function takeOrderForPrompt(prompt: Prompt) {
  return prompt.takeOrder ?? inferTakeOrder(prompt.title);
}

function sortScriptGroups(left: string, right: string) {
  const leftNumber = inferScriptNumber(left);
  const rightNumber = inferScriptNumber(right);
  if (leftNumber && rightNumber) return leftNumber - rightNumber;
  if (leftNumber) return -1;
  if (rightNumber) return 1;
  return left.localeCompare(right, "pt-BR");
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
  const normalizedPrompt = prompt.takeType === "varios takes" ? { ...prompt, takeType: "+de 3 takes" } : prompt;
  if (normalizedPrompt.category !== "Video" || !normalizedPrompt.lineTokenPrefix) return normalizedPrompt;

  const speechLines = extractSpeechLines(normalizedPrompt.template);
  const onlyTokens = speechLines.length > 0 && speechLines.every((line) => /^\{[^}]+\}$/.test(line));
  if (!speechLines.length || onlyTokens) return normalizedPrompt;

  return { ...normalizedPrompt, speechLines };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 220) };
  }
}

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPlan, setNewUserPlan] = useState("");
  const [generatedAccess, setGeneratedAccess] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("Imagem");
  const [videoTakeType, setVideoTakeType] = useState(defaultVideoTypes[0]);
  const [videoTypesByBusiness, setVideoTypesByBusiness] = useState<Record<string, string[]>>({});
  const [view, setView] = useState<"home" | "library" | "admin" | "password">("home");
  const [promptId, setPromptId] = useState("");
  const [draft, setDraft] = useState<Prompt | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadAuth() {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data.error ?? data.details ?? "Não foi possível carregar autenticação.");
      }
      setCurrentUser(data.user);
      setNeedsSetup(Boolean(data.needsSetup));

      if (data.user && !data.user.forcePasswordChange) {
        await loadData(false);
      } else {
        setBusinesses([]);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar autenticação.");
    } finally {
      setLoading(false);
    }
  }

  async function loadData(showLoader = true) {
    if (showLoader) {
      setLoading(true);
    }
    setLoadError("");

    try {
      const response = await fetch("/api/data", { cache: "no-store" });

      if (!response.ok) {
        if (response.status === 401) {
          setCurrentUser(null);
          setBusinesses([]);
          return;
        }
        const data = await readJson(response);
        const details = data?.details ? ` ${data.details}` : "";
        throw new Error(`Não foi possível carregar os dados.${details}`);
      }

      const data = await readJson(response);
      setBusinesses(data.businesses);
      if (data.user) setCurrentUser(data.user);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar o app.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    try {
      const storedTypes = JSON.parse(window.localStorage.getItem(customVideoTypesKey) ?? "[]");
      if (storedTypes && typeof storedTypes === "object" && !Array.isArray(storedTypes)) {
        setVideoTypesByBusiness(storedTypes);
      }
    } catch {
      setVideoTypesByBusiness({});
    }
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

  const businessVideoTypes = useMemo(() => {
    if (!business) return defaultVideoTypes;
    const savedTypes = videoTypesByBusiness[business.id] ?? [];
    return savedTypes.length ? savedTypes : defaultVideoTypes;
  }, [business, videoTypesByBusiness]);

  const videoTypeOptions = useMemo(() => {
    const promptTypes =
      business?.products
        .flatMap((item) => item.prompts)
        .filter((prompt) => prompt.category === "Video")
        .map((prompt) => (prompt.takeType === "varios takes" ? "+de 3 takes" : prompt.takeType ?? defaultVideoTypes[0])) ?? [];

    return [...new Set([...businessVideoTypes, ...promptTypes].filter(Boolean))];
  }, [business, businessVideoTypes]);

  const prompts = useMemo(() => {
    return (
      product?.prompts.filter((prompt) => {
        const haystack = `${prompt.title} ${prompt.description} ${getPromptChips(prompt).join(" ")} ${prompt.template}`.toLowerCase();
        const matchesCategory = prompt.category === category;
        const matchesTake = category !== "Video" || matchesTakeType(prompt.takeType, videoTakeType);
        return matchesCategory && matchesTake && haystack.includes(search.toLowerCase());
      }) ?? []
    );
  }, [product, category, videoTakeType, search]);

  const promptGroups = useMemo(() => {
    const groups = prompts.reduce<Record<string, Prompt[]>>((acc, prompt) => {
      const group = scriptGroupForPrompt(prompt);
      acc[group] = acc[group] ? [...acc[group], prompt] : [prompt];
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([left], [right]) => sortScriptGroups(left, right))
      .map(([scriptGroup, groupPrompts]) => ({
        scriptGroup,
        prompts: groupPrompts.sort((left, right) => takeOrderForPrompt(left) - takeOrderForPrompt(right) || left.title.localeCompare(right.title, "pt-BR"))
      }));
  }, [prompts]);

  useEffect(() => {
    if (!business && businesses.length) setBusinessId(businesses[0].id);
    if (business && !businessId) setBusinessId(business.id);
    if (business && (!product || !business.products.some((item) => item.id === productId))) {
      setProductId(business.products[0]?.id ?? "");
    }
  }, [business, businessId, businesses, product, productId]);

  useEffect(() => {
    if (category === "Video" && videoTypeOptions.length && !videoTypeOptions.includes(videoTakeType)) {
      setVideoTakeType(videoTypeOptions[0]);
    }
  }, [category, videoTakeType, videoTypeOptions]);

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
    const data = await readJson(response);

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
    const data = await readJson(response);

    await loadData();
    setProductId(data.product.id);
    closeEditor();
    showToast("Produto criado");
  }

  async function duplicateProduct() {
    if (!product) return;
    const response = await fetch(`/api/products/${product.id}/duplicate`, { method: "POST" });
    const data = await readJson(response);
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

  function saveBusinessVideoTypes(types: string[]) {
    if (!business) return;
    const uniqueTypes = [...new Set(types.filter(Boolean))];
    const nextTypesByBusiness = { ...videoTypesByBusiness, [business.id]: uniqueTypes.length ? uniqueTypes : defaultVideoTypes };
    setVideoTypesByBusiness(nextTypesByBusiness);
    window.localStorage.setItem(customVideoTypesKey, JSON.stringify(nextTypesByBusiness));
  }

  function createVideoType() {
    if (!business) return;
    const name = window.prompt("Nome do tipo de vídeo", "Novo tipo")?.trim();
    if (!name) return;

    const exists = videoTypeOptions.some((item) => item.toLowerCase() === name.toLowerCase());
    if (exists) {
      setVideoTakeType(videoTypeOptions.find((item) => item.toLowerCase() === name.toLowerCase()) ?? name);
      return;
    }

    saveBusinessVideoTypes([...businessVideoTypes, name]);
    setVideoTakeType(name);
    closeEditor();
    showToast("Tipo de vídeo criado");
  }

  async function editVideoType() {
    if (!business || !videoTakeType) return;

    const name = window.prompt("Editar tipo de vídeo", videoTakeType)?.trim();
    if (!name || name === videoTakeType) return;

    const exists = videoTypeOptions.some((item) => item.toLowerCase() === name.toLowerCase() && item !== videoTakeType);
    if (exists) {
      showToast("Este tipo de vídeo já existe");
      return;
    }

    const nextTypes = businessVideoTypes.map((item) => (item === videoTakeType ? name : item));
    const finalTypes = nextTypes.includes(name) ? nextTypes : [...nextTypes, name];
    saveBusinessVideoTypes(finalTypes);

    const promptsToUpdate = business.products
      .flatMap((item) => item.prompts)
      .filter((prompt) => prompt.category === "Video" && matchesTakeType(prompt.takeType, videoTakeType));
    await Promise.all(
      promptsToUpdate.map((prompt) =>
        fetch(`/api/prompts/${prompt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...prompt, takeType: name })
        })
      )
    );

    setVideoTakeType(name);
    closeEditor();
    await loadData();
    showToast("Tipo de vídeo atualizado");
  }

  async function deleteVideoType() {
    if (!business || !videoTakeType) return;
    if (videoTypeOptions.length <= 1) {
      showToast("Mantenha pelo menos um tipo de vídeo");
      return;
    }

    const fallbackType = videoTypeOptions.find((item) => item !== videoTakeType) ?? defaultVideoTypes[0];
    if (!window.confirm(`Excluir o tipo "${takeTypeLabel(videoTakeType)}"? Os prompts deste tipo serao movidos para "${takeTypeLabel(fallbackType)}".`)) return;

    saveBusinessVideoTypes(businessVideoTypes.filter((item) => item !== videoTakeType));

    const promptsToUpdate = business.products
      .flatMap((item) => item.prompts)
      .filter((prompt) => prompt.category === "Video" && matchesTakeType(prompt.takeType, videoTakeType));
    await Promise.all(
      promptsToUpdate.map((prompt) =>
        fetch(`/api/prompts/${prompt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...prompt, takeType: fallbackType })
        })
      )
    );

    setVideoTakeType(fallbackType);
    closeEditor();
    await loadData();
    showToast("Tipo de vídeo excluído");
  }

  async function createPrompt() {
    if (!business || !product) return;
    const nextScriptNumber = promptGroups.length + 1;

    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        businessId: business.id,
        productId: product.id,
        category,
        takeType: category === "Video" ? videoTakeType : defaultVideoTypes[0],
        scriptGroup: category === "Video" ? `Video ${nextScriptNumber}` : null,
        takeOrder: 1
      })
    });
    const data = await readJson(response);

    await loadData();
    setPromptId(data.prompt.id);
    setDraft(normalizePromptForEditor(data.prompt));
    setEditorOpen(true);
    showToast("Prompt criado");
  }

  async function savePrompt() {
    if (!draft) return;
    const parsedGroup = draft.category === "Video" ? parseScriptGroupInput(draft.scriptGroup ?? "", draft.takeOrder) : null;
    const payload = parsedGroup ? { ...draft, scriptGroup: parsedGroup.scriptGroup, takeOrder: parsedGroup.takeOrder } : draft;
    const response = await fetch(`/api/prompts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readJson(response);

    setPromptId(data.prompt.id);
    await loadData();
    closeEditor();
    showToast("Edição salva");
  }

  async function duplicatePrompt(prompt: Prompt) {
    const response = await fetch(`/api/prompts/${prompt.id}/duplicate`, { method: "POST" });
    const data = await readJson(response);
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

  async function duplicateScriptGroup(scriptGroup: string, groupPrompts: Prompt[]) {
    if (!business || !product) return;
    const response = await fetch("/api/prompts/group-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: business.id,
        productId: product.id,
        scriptGroup,
        takeType: videoTakeType,
        promptIds: groupPrompts.map((prompt) => prompt.id)
      })
    });
    const data = await readJson(response);

    if (!response.ok) {
      showToast(data.error ?? "Nao foi possivel duplicar o video");
      return;
    }

    await loadData();
    showToast("Video duplicado");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail, password: authPassword, name: authName })
    });
    const data = await readJson(response);

    if (!response.ok) {
      const details = data.details ? ` ${data.details}` : "";
      setLoadError(`${data.error ?? "Não foi possível entrar."}${details}`);
      return;
    }

    setCurrentUser(data.user);
    setNeedsSetup(false);
    setAuthPassword("");
    setAuthName("");

    if (data.user.forcePasswordChange) {
      setView("password");
      setBusinesses([]);
    } else {
      await loadData();
      setView("home");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setBusinesses([]);
    setBusinessId("");
    setProductId("");
    setView("home");
    closeEditor();
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadError("");

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await readJson(response);

    if (!response.ok) {
      setLoadError(data?.error ?? "Não foi possível trocar a senha.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    await loadAuth();
    setView("home");
    showToast("Senha atualizada");
  }

  async function loadAdminUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (!response.ok) return;
    const data = await readJson(response);
    setAdminUsers(data.users);
  }

  async function openAdmin() {
    setView("admin");
    closeEditor();
    await loadAdminUsers();
  }

  function openBusiness(businessItem: Business) {
    setBusinessId(businessItem.id);
    setProductId(businessItem.products[0]?.id ?? "");
    setCategory("Imagem");
    setVideoTakeType(defaultVideoTypes[0]);
    setView("library");
    closeEditor();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneratedAccess("");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newUserEmail, name: newUserName, phone: newUserPhone, plan: newUserPlan })
    });
    const data = await readJson(response);

    if (!response.ok) {
      setGeneratedAccess(data.error ?? "Não foi possível criar o usuário.");
      return;
    }

    setGeneratedAccess(`Login: ${data.user.email}\nSenha temporária: ${data.temporaryPassword}\nLink: ${data.loginUrl}`);
    setNewUserEmail("");
    setNewUserName("");
    setNewUserPhone("");
    setNewUserPlan("");
    await loadAdminUsers();
  }

  async function resetUserPassword(userId: string) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password" })
    });
    const data = await readJson(response);
    setGeneratedAccess(`Login: ${data.user.email}\nSenha temporária: ${data.temporaryPassword}\nLink: ${data.loginUrl}`);
    await loadAdminUsers();
  }

  async function editAdminUser(user: AdminUser) {
    const name = window.prompt("Nome do usuário", user.name)?.trim();
    if (!name) return;

    const email = window.prompt("Email do usuário", user.email)?.trim();
    if (!email) return;

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });
    const data = await readJson(response);

    if (!response.ok) {
      setGeneratedAccess(data.error ?? "Não foi possível editar o usuário.");
      return;
    }

    await loadAdminUsers();
    showToast("Usuário atualizado");
  }

  async function deleteAdminUser(user: AdminUser) {
    if (!window.confirm(`Excluir o usuário "${user.email}"? Os negócios dele também serão excluídos.`)) return;

    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await readJson(response);

    if (!response.ok) {
      setGeneratedAccess(data.error ?? "Não foi possível excluir o usuário.");
      return;
    }

    await loadAdminUsers();
    showToast("Usuário excluído");
  }

  async function toggleUserStatus(user: AdminUser) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE" })
    });
    await loadAdminUsers();
  }

  function renderPromptCard(prompt: Prompt) {
    return (
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
          {prompt.category === "Video" && <span className="chip strong-chip">{`${scriptGroupLabel(scriptGroupForPrompt(prompt))} - Parte ${takeOrderForPrompt(prompt)}`}</span>}
        </div>
        <div className="prompt-actions">
          <button className="prompt-action copy" onClick={() => copyPrompt(prompt)}>
            Copiar
          </button>
          <button
            className="prompt-action"
            onClick={() => {
              setPromptId(prompt.id);
              setDraft(normalizePromptForEditor({ ...structuredClone(prompt), scriptGroup: scriptGroupLabel(scriptGroupForPrompt(prompt)), takeOrder: takeOrderForPrompt(prompt) }));
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
    );
  }

  if (loading) return <main className="center">Carregando TikPrompt Studio...</main>;

  if (!currentUser) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="mark">TP</div>
          <h1 className="auth-title">
            {needsSetup ? (
              "Criar admin inicial"
            ) : (
              <>
                <span>Entrar no</span>
                <span>TikPrompt Studio</span>
              </>
            )}
          </h1>
          <p>
            {needsSetup
              ? "Cadastre seu primeiro acesso administrativo. Depois disso, novos usuários entram pelo painel ou webhook."
              : "Acesse sua biblioteca com email e senha."}
          </p>
          <form className="auth-form" onSubmit={login}>
            {needsSetup && (
              <label className="field">
                <span className="field-label">Seu nome</span>
                <input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Ex: Teo" />
              </label>
            )}
            <label className="field">
              <span className="field-label">Email</span>
              <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="voce@email.com" type="email" />
            </label>
            <label className="field">
              <span className="field-label">Senha</span>
              <input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Senha" type="password" />
            </label>
            {loadError && <p className="form-error">{loadError}</p>}
            <button className="primary" type="submit">
              {needsSetup ? "Criar admin e entrar" : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (currentUser.forcePasswordChange || view === "password") {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="mark">TP</div>
          <h1>Trocar senha</h1>
          <p>{currentUser.forcePasswordChange ? "Este é seu primeiro acesso. Crie uma senha nova para continuar." : "Atualize sua senha de acesso."}</p>
          <form className="auth-form" onSubmit={changePassword}>
            {!currentUser.forcePasswordChange && (
              <label className="field">
                <span className="field-label">Senha atual</span>
                <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" />
              </label>
            )}
            <label className="field">
              <span className="field-label">Nova senha</span>
              <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" minLength={8} />
            </label>
            {loadError && <p className="form-error">{loadError}</p>}
            <div className="auth-actions">
              {!currentUser.forcePasswordChange && (
                <button className="secondary" type="button" onClick={() => setView("home")}>
                  Cancelar
                </button>
              )}
              <button className="primary" type="submit">
                Salvar senha
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="center">
        <h1>TikPrompt Studio</h1>
        <p>{loadError}</p>
        <button className="primary" onClick={() => loadData()}>
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

        <section className="user-box">
          <strong>{currentUser.name}</strong>
          <span>{currentUser.email}</span>
          <div className="user-actions">
            {currentUser.role === "ADMIN" && (
              <button onClick={openAdmin}>
                Admin
              </button>
            )}
            <button onClick={() => setView("password")}>Senha</button>
            <button onClick={logout}>Sair</button>
          </div>
        </section>

        <section className="side-section">
          <div className="side-title">Negócios</div>
          {businesses.map((item) => (
            <button
              className={`business-button ${item.id === business.id ? "active" : ""}`}
              key={item.id}
              onClick={() => openBusiness(item)}
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
        {view === "admin" ? (
          <section className="admin-screen">
            <header className="topbar admin-topbar">
              <div>
                <h1>Gestão de usuários</h1>
                <p>Crie acessos, gere senha temporária e bloqueie clientes quando necessário.</p>
              </div>
              <button className="secondary" onClick={loadAdminUsers}>
                Atualizar
              </button>
            </header>

            <section className="admin-grid">
              <form className="admin-create" onSubmit={createUser}>
                <h2>Novo usuário</h2>
                <label className="field">
                  <span className="field-label">Email</span>
                  <input value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} type="email" placeholder="cliente@email.com" />
                </label>
                <label className="field">
                  <span className="field-label">Nome</span>
                  <input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Nome do cliente" />
                </label>
                <label className="field">
                  <span className="field-label">WhatsApp</span>
                  <input value={newUserPhone} onChange={(event) => setNewUserPhone(event.target.value)} placeholder="5511999999999" />
                </label>
                <label className="field">
                  <span className="field-label">Plano</span>
                  <input value={newUserPlan} onChange={(event) => setNewUserPlan(event.target.value)} placeholder="Mensal" />
                </label>
                <button className="primary" type="submit">
                  Criar acesso
                </button>
                {generatedAccess && <textarea className="access-box" readOnly value={generatedAccess} />}
              </form>

              <section className="admin-users">
                <div className="panel-head">
                  <div>
                    <h2>Usuários</h2>
                    <span>{adminUsers.length} cadastros</span>
                  </div>
                </div>
                <div className="user-list">
                  {adminUsers.map((user) => (
                    <article className="user-card" key={user.id}>
                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                        <small>
                          {user.role} - {user.status} - {user._count.businesses} negócios
                        </small>
                      </div>
                      <div className="user-card-actions">
                        <button className="secondary" onClick={() => editAdminUser(user)}>
                          Editar
                        </button>
                        <button className="secondary" onClick={() => resetUserPassword(user.id)}>
                          Resetar senha
                        </button>
                        <button className={`secondary ${user.status === "ACTIVE" ? "danger" : ""}`} onClick={() => toggleUserStatus(user)}>
                          {user.status === "ACTIVE" ? "Bloquear" : "Liberar"}
                        </button>
                        <button className="secondary danger" onClick={() => deleteAdminUser(user)}>
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                  {!adminUsers.length && <p className="empty-state">Nenhum usuário carregado.</p>}
                </div>
              </section>
            </section>
          </section>
        ) : view === "home" ? (
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
                <button
                  className="primary"
                  onClick={() => {
                    setCategory("Imagem");
                    setVideoTakeType(defaultVideoTypes[0]);
                    setView("library");
                  }}
                >
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
                <span>Parte + fala + copy</span>
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
                <h2>Tudo em um só lugar</h2>
                <p>Chega de abrir 10 abas diferentes para encontrar o prompt certo. Imagens, roteiros de vídeo e copies ficam organizados a um clique.</p>
              </article>
              <article className="welcome-card">
                <h2>Prompts por negócio e produto</h2>
                <p>Cada negócio tem sua própria estrutura de produtos. Você cria uma vez, organiza do seu jeito e acessa sem confusão.</p>
              </article>
              <article className="welcome-card">
                <h2>Videos com partes numeradas</h2>
                <p>Produza videos com consistencia usando partes individuais e o campo SPEECH destacado para editar a fala com agilidade.</p>
              </article>
              <article className="welcome-card">
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
              {business.niche} - {product?.name ?? "sem produto"} - {categoryTabLabel(category)}
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
                  if (item === "Video" && videoTypeOptions.length) setVideoTakeType(videoTypeOptions[0]);
                  closeEditor();
                }}
              >
                  {categoryTabLabel(item)}
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
            <span className="subtabs-label">Tipos de vídeos</span>
            <div className="subtabs">
              {videoTypeOptions.map((item) => (
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
              <button className="subtab add-subtab" onClick={createVideoType} title="Criar tipo de vídeo">
                +
              </button>
              <button className="subtab manage-subtab" onClick={editVideoType} disabled={!product || !videoTakeType}>
                Editar
              </button>
              <button className="subtab manage-subtab danger-subtab" onClick={deleteVideoType} disabled={!product || !videoTakeType || videoTypeOptions.length <= 1}>
                Excluir
              </button>
            </div>
            <span className="subtabs-note">Crie, edite e separe suas versões de vídeos do mesmo produto.</span>
          </section>
        )}

        <section className={`workspace ${editorOpen ? "" : "library-only"}`}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Biblioteca</h2>
                <span>
                  {prompts.length} itens em {product?.name ?? "sem produto"} / {categoryTabLabel(category)}
                </span>
              </div>
              <button className="secondary" onClick={createPrompt} disabled={!product}>
                Criar prompt
              </button>
            </div>
            <div className="prompt-list">
              {!product && <p className="empty-state">Crie um produto para salvar prompts.</p>}
              {product && !prompts.length && <p className="empty-state">Nenhum prompt nesta categoria. Clique em Criar prompt.</p>}
              {category !== "Video" && prompts.map((prompt) => renderPromptCard(prompt))}
              {category === "Video" &&
                promptGroups.map((group) => (
                  <section className="script-group" key={group.scriptGroup}>
                    <div className="script-group-head">
                      <div>
                        <h3>{scriptGroupLabel(group.scriptGroup)}</h3>
                        <span>{group.prompts.length} partes neste video</span>
                      </div>
                      <button className="secondary" onClick={() => duplicateScriptGroup(group.scriptGroup, group.prompts)}>
                        Duplicar video
                      </button>
                    </div>
                    <div className="script-group-grid">{group.prompts.map((prompt) => renderPromptCard(prompt))}</div>
                  </section>
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
                        <span className="field-label">Tipo de video</span>
                        <select value={draft.takeType ?? defaultVideoTypes[0]} onChange={(event) => setDraft({ ...draft, takeType: event.target.value })}>
                          {videoTypeOptions.map((item) => (
                            <option value={item} key={item}>
                              {takeTypeLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {draft.category === "Video" && (
                      <label className="field">
                        <span className="field-label">Video / grupo</span>
                        <input
                          value={draft.scriptGroup ?? ""}
                          onChange={(event) => setDraft({ ...draft, scriptGroup: event.target.value })}
                          placeholder="Ex: Video 1"
                        />
                      </label>
                    )}
                    {draft.category === "Video" && (
                      <label className="field">
                        <span className="field-label">Ordem da parte</span>
                        <input
                          value={draft.takeOrder ?? ""}
                          onChange={(event) => setDraft({ ...draft, takeOrder: Number(event.target.value) || null })}
                          min={1}
                          type="number"
                        />
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
                <button className="primary" onClick={savePrompt}>
                  Salvar
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
