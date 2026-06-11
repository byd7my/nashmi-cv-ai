import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

export const MAX_REVIEWS = 6;

export interface StoredReview {
  id: string;
  name?: string;
  rating: number;
  text: string;
  createdAt: string;
}

type ReviewRow = {
  id: string;
  name: string | null;
  rating: number;
  text: string;
  created_at: string;
};

function mapRow(row: ReviewRow): StoredReview {
  return {
    id: row.id,
    name: row.name?.trim() || undefined,
    rating: row.rating,
    text: row.text,
    createdAt: row.created_at,
  };
}

async function trimToMaxReviews(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_reviews")
    .select("id")
    .order("created_at", { ascending: false });

  if (error || !data || data.length <= MAX_REVIEWS) return;

  const staleIds = data.slice(MAX_REVIEWS).map((row) => row.id);
  await supabase.from("user_reviews").delete().in("id", staleIds);
}

async function listReviews(): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_reviews")
    .select("id, name, rating, text, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_REVIEWS);

  if (error) {
    console.error("[api/reviews] Failed to list reviews", error);
    return Response.json({ error: "Failed to load reviews" }, { status: 500 });
  }

  return Response.json({ reviews: (data ?? []).map(mapRow) });
}

async function createReview(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as { name?: unknown; rating?: unknown; text?: unknown };
  const rating = Math.min(5, Math.max(1, Math.round(Number(payload.rating))));
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim().slice(0, 120)
      : null;

  if (!Number.isFinite(rating) || rating < 1 || text.length < 10) {
    return Response.json({ error: "Rating and feedback are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_reviews")
    .insert({ name, rating, text })
    .select("id, name, rating, text, created_at")
    .single();

  if (error || !data) {
    console.error("[api/reviews] Failed to insert review", error);
    return Response.json({ error: "Failed to save review" }, { status: 500 });
  }

  await trimToMaxReviews();

  return Response.json({ review: mapRow(data) }, { status: 201 });
}

export async function handleReviewsRequest(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Reviews service unavailable" }, { status: 503 });
  }

  if (request.method === "GET") return listReviews();
  if (request.method === "POST") return createReview(request);

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
