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
export const MAX_REVIEWS = 6;

const SEED_REVIEW_NAMES = new Set([
  "سارة المطيري",
  "خالد الرشيدي",
  "عمر الزهراني",
  "ريان فهد",
  "khalid al-rashidi",
  "omar al-zahrani",
  "sarah al-mutairi",
  "ryan fahed",
]);

function isSeedReview(review: UserReview): boolean {
  const name = review.name?.trim().toLowerCase() ?? "";
  if (name && [...SEED_REVIEW_NAMES].some((seed) => name.includes(seed))) return true;
  const text = review.text.toLowerCase();
  return (
    text.includes("62% ats to 97%") ||
    text.includes("62% ats إلى 97%") ||
    text.includes("hired at ministry of health") ||
    text.includes("وزارة الصحة") ||
    text.includes("snb hr called me") ||
    text.includes("عروض العمل مباشرة")
  );
}

function normalizeReviews(reviews: UserReview[]): UserReview[] {
  return reviews
    .filter(
      (r): r is UserReview =>
        r && typeof r === "object" && typeof r.rating === "number" && typeof r.text === "string",
    )
    .filter((r) => !isSeedReview(r))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_REVIEWS);
}

export function getReviews(): UserReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const stored = parsed.filter(
      (r): r is UserReview =>
        r && typeof r === "object" && typeof r.rating === "number" && typeof r.text === "string",
    );
    const normalized = normalizeReviews(stored);
    if (JSON.stringify(normalized) !== JSON.stringify(stored)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
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
      const next = normalizeReviews([review, ...getReviews()]);
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
