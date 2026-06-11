const CV_SESSION_KEY = "nashmi:cv-session-id";

/** One ID per paid CV build session (resets after export or a new payment). */
export function getCvSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(CV_SESSION_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    window.localStorage.setItem(CV_SESSION_KEY, id);
    return id;
  } catch {
    return "";
  }
}

/** Start a fresh CV session so AI Improve limits reset for a new resume. */
export function resetCvSessionId(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CV_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
