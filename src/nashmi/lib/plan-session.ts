const PLAN_KEY = "nashmi:current-plan";

export function setSessionPlanTier(tier: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (tier) window.sessionStorage.setItem(PLAN_KEY, tier);
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
