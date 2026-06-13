import { getSessionPlanTier, clearPaidSession } from "@/nashmi/lib/plan-session";
import { resetCvSessionId } from "@/nashmi/lib/session";

export const CV_STORAGE_KEY = "nashmi-cv-draft";
export const CV_DRAFT_TS_KEY = "nashmi-cv-draft-ts";
export const STARTMODE_STORAGE_KEY = "nashmi-cv-startmode";
export const EDITMODE_STORAGE_KEY = "nashmi-edit-mode";
export const ELITE_DRAFT_KEYS = ["nashmi-cv-draft-ar", "nashmi-cv-draft-en"] as const;
export const MOBILE_TOUR_STORAGE_KEY = "nashmi:mobile-builder-tour-v2";

/** Free users: draft expires after 3 minutes without returning. */
export const FREE_DRAFT_TTL_MS = 3 * 60 * 1000;

export function hasActivePaidSession(): boolean {
  const tier = getSessionPlanTier();
  return tier === "premium" || tier === "elite" || tier === "enterprise";
}

export function touchFreeDraftTimestamp(): void {
  if (typeof window === "undefined" || hasActivePaidSession()) return;
  try {
    window.localStorage.setItem(CV_DRAFT_TS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isFreeDraftExpired(): boolean {
  if (typeof window === "undefined" || hasActivePaidSession()) return false;
  try {
    const raw = window.localStorage.getItem(CV_DRAFT_TS_KEY);
    if (!raw) {
      // Legacy drafts without a timestamp — treat as expired if CV data exists.
      return !!window.localStorage.getItem(CV_STORAGE_KEY);
    }
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > FREE_DRAFT_TTL_MS;
  } catch {
    return false;
  }
}

/** Remove stored CV content for free users (keeps paid session tokens). */
export function wipeFreeClientCvData(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CV_STORAGE_KEY);
    window.localStorage.removeItem(CV_DRAFT_TS_KEY);
    window.localStorage.removeItem(STARTMODE_STORAGE_KEY);
    window.localStorage.removeItem(EDITMODE_STORAGE_KEY);
    for (const key of ELITE_DRAFT_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** Returns true when stale free draft was removed. */
export function expireFreeDraftIfStale(): boolean {
  if (!isFreeDraftExpired()) return false;
  wipeFreeClientCvData();
  return true;
}

/** Wipe all locally stored CV content and paid-session tokens after export. */
export function wipeAllClientCvData(): void {
  if (typeof window === "undefined") return;

  wipeFreeClientCvData();

  try {
    resetCvSessionId();
  } catch {
    /* ignore */
  }

  try {
    window.sessionStorage.removeItem(MOBILE_TOUR_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  clearPaidSession();
}
