import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function readPurchaseToken(request: Request): string | null {
  const raw = request.headers.get("x-nashmi-purchase-token")?.trim();
  return raw && raw.length >= 16 ? raw.slice(0, 128) : null;
}

function readSessionId(request: Request): string | null {
  const raw = request.headers.get("x-nashmi-session-id")?.trim();
  return raw && raw.length >= 8 ? raw.slice(0, 128) : null;
}

async function consumePurchase(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return json({ error: "Supabase is not configured", code: "SUPABASE_NOT_CONFIGURED" }, 503);
  }

  const token = readPurchaseToken(request);
  const sessionId = readSessionId(request);
  if (!token || !sessionId) {
    return json({ error: "Purchase token and session ID required", code: "MISSING_HEADERS" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("purchases")
    .update({ consumed_at: new Date().toISOString() })
    .eq("purchase_token", token)
    .eq("cv_session_id", sessionId)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[api/purchase] consume failed", error);
    return json({ error: "Could not consume purchase", code: "CONSUME_FAILED" }, 500);
  }
  if (!data) {
    return json({ error: "Purchase not found or already used", code: "NOT_FOUND" }, 404);
  }

  return json({ ok: true });
}

/** Marks a paid session as consumed after PDF export. */
export async function handlePurchaseRequest(request: Request): Promise<Response> {
  if (request.method === "POST") {
    return consumePurchase(request);
  }

  return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
}
