// Client-side review store used by the export confirmation modal
// and the landing-page "تقييم أصدقاء نشمي" section.

export interface UserReview {
  id: string;
  name?: string;
  rating: number;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = "nashmi-user-reviews";
export const REVIEWS_STORAGE_KEY = STORAGE_KEY;
const EVENT_NAME = "nashmi-reviews-updated";

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

function readLocalReviews(): UserReview[] {
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

function writeLocalReviews(reviews: UserReview[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeReviews(reviews)));
  } catch {
    /* ignore quota / privacy errors */
  }
}

function notifyReviewListeners(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function getReviews(): UserReview[] {
  return readLocalReviews();
}

export async function loadReviews(): Promise<UserReview[]> {
  if (typeof window === "undefined") return [];

  try {
    const res = await fetch("/api/reviews");
    if (res.ok) {
      const data = (await res.json()) as { reviews?: UserReview[] };
      const remote = normalizeReviews(Array.isArray(data.reviews) ? data.reviews : []);
      writeLocalReviews(remote);
      return remote;
    }
  } catch {
    /* fall back to local cache */
  }

  return readLocalReviews();
}

export async function addReview(input: {
  name?: string;
  rating: number;
  text: string;
}): Promise<UserReview> {
  const review: UserReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name?.trim() || undefined,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: review.name,
        rating: review.rating,
        text: review.text,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { review?: UserReview };
      if (data.review) {
        const saved = data.review;
        writeLocalReviews(normalizeReviews([saved, ...readLocalReviews()]));
        notifyReviewListeners();
        return saved;
      }
    }
  } catch {
    /* fall back to local-only storage */
  }

  if (typeof window !== "undefined") {
    writeLocalReviews(normalizeReviews([review, ...readLocalReviews()]));
    notifyReviewListeners();
  }

  return review;
}

export function subscribeToReviews(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    void loadReviews().finally(callback);
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  });
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}
