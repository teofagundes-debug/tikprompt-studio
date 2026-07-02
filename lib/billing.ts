const dayMs = 24 * 60 * 60 * 1000;

const planDurations: Record<string, number> = {
  mensal: 30,
  monthly: 30,
  mes: 30,
  trimestral: 90,
  quarterly: 90,
  trimestre: 90,
  semestral: 180,
  semester: 180,
  semestre: 180
};

export function normalizePlan(plan?: string | null) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) return "mensal";
  if (normalized.includes("semes")) return "semestral";
  if (normalized.includes("trimes") || normalized.includes("quarter")) return "trimestral";
  if (normalized.includes("month") || normalized.includes("mens") || normalized.includes("mes")) return "mensal";
  return normalized;
}

export function planDays(plan?: string | null) {
  return planDurations[normalizePlan(plan)] ?? 30;
}

export function addPlanDays(date: Date, plan?: string | null) {
  return new Date(date.getTime() + planDays(plan) * dayMs);
}

export function nextExpiration(currentExpiration: Date | string | null | undefined, plan?: string | null) {
  const now = new Date();
  const current = currentExpiration ? new Date(currentExpiration) : null;
  const base = current && current.getTime() > now.getTime() ? current : now;
  return addPlanDays(base, plan);
}

export function isSubscriptionActive(expiresAt?: Date | string | null) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() >= Date.now();
}

export function subscriptionStatus(expiresAt?: Date | string | null) {
  return isSubscriptionActive(expiresAt) ? "ACTIVE" : "EXPIRED";
}
