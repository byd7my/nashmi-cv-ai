const PLAN_KEY = "nashmi:current-plan";
const PURCHASE_TOKEN_KEY = "nashmi:purchase-token";

export function setSessionPlanTier(tier: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (tier && tier !== "starter") window.sessionStorage.setItem(PLAN_KEY, tier);
    else window.sessionStorage.removeItem(PLAN_KEY);
  } catch {
    /* ignore */
  }
}

export function getSessionPlanTier(): string {
  if (typeof window === "undefined") return "starter";
  try {
    return window.sessionStorage.getItem(PLAN_KEY) || "starter";
  } catch {
    return "starter";
  }
}

export function setPurchaseToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(PURCHASE_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(PURCHASE_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getPurchaseToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PURCHASE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearPaidSession(): void {
  setSessionPlanTier(null);
  setPurchaseToken(null);
}
