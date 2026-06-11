// Lightweight client-side review store used by the export confirmation modal
// and the landing-page "تقييم أصدقاء نشمي" section.

export interface UserReview {
  id: string;
  name?: string;
  rating: number;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = "nashmi-user-reviews";
const EVENT_NAME = "nashmi-reviews-updated";

// Rolling window: keep only the newest MAX_REVIEWS. A new review pushes out
// the oldest one so the landing section always shows the latest feedback.
const MAX_REVIEWS = 6;

export function getReviews(): UserReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is UserReview =>
        r && typeof r === "object" && typeof r.rating === "number" && typeof r.text === "string",
    );
  } catch {
    return [];
  }
}

export function addReview(input: { name?: string; rating: number; text: string }): UserReview {
  const review: UserReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name?.trim() || undefined,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const all = getReviews();
      const next = [review, ...all].slice(0, MAX_REVIEWS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      /* ignore quota / privacy errors */
    }
  }
  return review;
}

export function subscribeToReviews(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  });
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}
