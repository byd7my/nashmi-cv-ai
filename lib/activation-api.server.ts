import { randomUUID } from "node:crypto";

import { normalizePlanTier, type PlanTier } from "./plan-limits.server";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

const INVALID_MSG_AR = "الكود غير صحيح أو تم استخدامه مسبقاً";
const INVALID_MSG_EN = "Invalid code or already used";

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function readSessionId(request: Request): string | null {
  const raw = request.headers.get("x-nashmi-session-id")?.trim();
  return raw && raw.length >= 8 ? raw.slice(0, 128) : null;
}

/** Normalize user input: trim, uppercase, remove spaces — keep hyphens as stored in DB. */
export function normalizeActivationCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Build lookup variants (with/without hyphens) for codes like CV-ELIT-XXXX-XXXX. */
export function activationCodeCandidates(raw: string): string[] {
  const canonical = normalizeActivationCode(raw);
  const out = new Set<string>();
  if (!canonical) return [];

  out.add(canonical);

  const stripped = canonical.replace(/-/g, "");
  if (stripped) out.add(stripped);

  const prem = stripped.match(/^CVPREM([A-Z0-9]{4})([A-Z0-9]{4})$/);
  if (prem) out.add(`CV-PREM-${prem[1]}-${prem[2]}`);

  const elit = stripped.match(/^CVELIT([A-Z0-9]{4})([A-Z0-9]{4})$/);
  if (elit) out.add(`CV-ELIT-${elit[1]}-${elit[2]}`);

  return [...out];
}

export function activationPlanType(raw: string | null | undefined): "premium" | "elite" | null {
  const p = (raw ?? "").trim().toLowerCase();
  if (p === "premium" || p === "prem" || p === "مميز") return "premium";
  if (p === "elite" || p === "elit" || p === "نخبة") return "elite";
  return null;
}

type ActivationRow = { code: string; plan_type: string; is_used: boolean };

async function findUnusedActivationCode(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  candidates: string[],
): Promise<ActivationRow | null> {
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("activation_codes")
      .select("code, plan_type, is_used")
      .eq("code", candidate)
      .maybeSingle();

    if (error) throw error;
    if (data && !data.is_used) return data;
  }
  return null;
}

export async function handleActivateRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  if (!isSupabaseConfigured()) {
    return json(
      {
        error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        code: "SUPABASE_NOT_CONFIGURED",
      },
      503,
    );
  }

  let body: { code?: unknown; plan?: unknown; sessionId?: unknown; email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const plan = activationPlanType(typeof body.plan === "string" ? body.plan : "");
  if (plan !== "premium" && plan !== "elite") {
    return json({ error: "Invalid plan tier", code: "INVALID_PLAN" }, 400);
  }

  const codeInput = typeof body.code === "string" ? body.code : "";
  const candidates = activationCodeCandidates(codeInput);
  if (candidates.length === 0 || candidates[0]!.length < 4 || candidates[0]!.length > 64) {
    return json(
      { error: INVALID_MSG_EN, errorAr: INVALID_MSG_AR, code: "INVALID_CODE" },
      400,
    );
  }

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim().length >= 8
      ? body.sessionId.trim().slice(0, 128)
      : readSessionId(request);
  if (!sessionId) {
    return json({ error: "CV session ID is required", code: "MISSING_SESSION" }, 400);
  }

  const email =
    typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
      ? body.email.trim().slice(0, 320)
      : null;
  const usedBy = (email || sessionId).slice(0, 320);

  const supabase = getSupabaseAdmin();

  let row: ActivationRow | null;
  try {
    row = await findUnusedActivationCode(supabase, candidates);
  } catch (fetchError) {
    console.error("[api/activate] lookup failed", fetchError);
    return json({ error: "Activation service error", code: "LOOKUP_FAILED" }, 500);
  }

  if (!row) {
    return json(
      { error: INVALID_MSG_EN, errorAr: INVALID_MSG_AR, code: "INVALID_CODE" },
      400,
    );
  }

  const dbCode = row.code;

  const codePlan = activationPlanType(row.plan_type);
  if (!codePlan || codePlan !== plan) {
    return json(
      { error: INVALID_MSG_EN, errorAr: INVALID_MSG_AR, code: "PLAN_MISMATCH" },
      400,
    );
  }

  const now = new Date().toISOString();
  const { data: redeemed, error: redeemError } = await supabase
    .from("activation_codes")
    .update({ is_used: true, used_by: usedBy, used_at: now })
    .eq("code", dbCode)
    .eq("is_used", false)
    .select("code")
    .maybeSingle();

  if (redeemError) {
    console.error("[api/activate] redeem failed", redeemError);
    return json({ error: "Could not redeem code", code: "REDEEM_FAILED" }, 500);
  }

  if (!redeemed) {
    return json(
      { error: INVALID_MSG_EN, errorAr: INVALID_MSG_AR, code: "CODE_RACE" },
      409,
    );
  }

  const purchaseToken = randomUUID();
  const { error: purchaseError } = await supabase.from("purchases").insert({
    purchase_token: purchaseToken,
    plan_tier: plan,
    cv_session_id: sessionId,
    email,
    payment_ref: `salla:${dbCode.slice(0, 8)}***`,
    payment_method: "activation_code",
  });

  if (purchaseError) {
    console.error("[api/activate] purchase insert failed", purchaseError);
    await supabase
      .from("activation_codes")
      .update({ is_used: false, used_by: null, used_at: null })
      .eq("code", dbCode)
      .eq("used_by", usedBy);
    return json({ error: "Could not activate plan", code: "PURCHASE_INSERT_FAILED" }, 500);
  }

  return json({ token: purchaseToken, plan, sessionId });
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
