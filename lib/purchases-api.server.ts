import { randomUUID } from "node:crypto";

import { normalizePlanTier, type PlanTier } from "./plan-limits.server";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function readSessionId(request: Request): string | null {
  const raw = request.headers.get("x-nashmi-session-id")?.trim();
  return raw && raw.length >= 8 ? raw.slice(0, 128) : null;
}

function readPurchaseToken(request: Request): string | null {
  const raw = request.headers.get("x-nashmi-purchase-token")?.trim();
  return raw && raw.length >= 16 ? raw.slice(0, 128) : null;
}

export async function lookupActivePurchaseTier(
  purchaseToken: string,
  cvSessionId: string,
): Promise<PlanTier | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("purchases")
    .select("plan_tier, consumed_at, cv_session_id")
    .eq("purchase_token", purchaseToken)
    .maybeSingle();

  if (error || !data || data.consumed_at || data.cv_session_id !== cvSessionId) {
    return null;
  }

  const tier = normalizePlanTier(data.plan_tier);
  return tier === "premium" || tier === "elite" ? tier : null;
}

async function activatePurchase(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return json(
      {
        error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        code: "SUPABASE_NOT_CONFIGURED",
      },
      503,
    );
  }

  let body: {
    plan?: unknown;
    sessionId?: unknown;
    email?: unknown;
    paymentRef?: unknown;
    paymentMethod?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const plan = normalizePlanTier(typeof body.plan === "string" ? body.plan : "");
  if (plan !== "premium" && plan !== "elite") {
    return json({ error: "Invalid plan tier", code: "INVALID_PLAN" }, 400);
  }

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim().length >= 8
      ? body.sessionId.trim().slice(0, 128)
      : readSessionId(request);
  if (!sessionId) {
    return json({ error: "CV session ID is required", code: "MISSING_SESSION" }, 400);
  }

  const email =
    typeof body.email === "string" && body.email.includes("@")
      ? body.email.trim().slice(0, 320)
      : null;
  const paymentRef =
    typeof body.paymentRef === "string" ? body.paymentRef.trim().slice(0, 128) : `mock-${Date.now()}`;
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim().slice(0, 32) : "mock";

  const purchaseToken = randomUUID();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("purchases").insert({
    purchase_token: purchaseToken,
    plan_tier: plan,
    cv_session_id: sessionId,
    email,
    payment_ref: paymentRef,
    payment_method: paymentMethod,
  });

  if (error) {
    console.error("[api/purchase] insert failed", error);
    return json({ error: "Could not record purchase", code: "PURCHASE_INSERT_FAILED" }, 500);
  }

  return json({ token: purchaseToken, plan, sessionId });
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

export async function handlePurchaseRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (request.method === "POST" && action === "consume") {
    return consumePurchase(request);
  }

  if (request.method === "POST") {
    return activatePurchase(request);
  }

  return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
}
