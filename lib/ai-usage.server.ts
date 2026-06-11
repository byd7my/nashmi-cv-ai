import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type AiUsageCheckResult =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; remaining: 0; limit: number; retryAfterMs: number };

function getLimit(): number {
  const raw = Number(process.env.AI_RATE_LIMIT_MAX ?? 3);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3;
}

function normalizeFeature(raw: string): string {
  const trimmed = raw.trim().slice(0, 64);
  if (!trimmed || !/^[\w-]+$/.test(trimmed)) {
    throw new Error("Invalid usage feature");
  }
  return trimmed;
}

function resolveSessionId(req: {
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const sessionHeader = req.headers?.["x-nashmi-session-id"];
  const sessionId =
    typeof sessionHeader === "string" && sessionHeader.trim().length >= 8
      ? sessionHeader.trim().slice(0, 128)
      : null;

  if (!sessionId) {
    throw new Error("CV session ID is required for AI Improve rate limiting");
  }

  return sessionId;
}

export async function checkAndConsumeAiImproveUsage(
  req: Parameters<typeof resolveSessionId>[0],
  featureRaw: string,
): Promise<AiUsageCheckResult> {
  const limit = getLimit();

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for AI rate limiting");
  }

  const sessionId = resolveSessionId(req);
  const feature = normalizeFeature(featureRaw);
  const identifier = `session:${sessionId}:feature:${feature}`;
  const supabase = getSupabaseAdmin();
  const now = Date.now();

  const { data: row, error: readError } = await supabase
    .from("ai_usage")
    .select("attempt_count, last_used_at")
    .eq("identifier", identifier)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read AI usage: ${readError.message}`);
  }

  let attemptCount = row?.attempt_count ?? 0;
  const lastUsedAt = row?.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  const windowExpired = !lastUsedAt || now - lastUsedAt >= WINDOW_MS;

  if (windowExpired) {
    attemptCount = 0;
  }

  if (attemptCount >= limit) {
    const retryAfterMs = lastUsedAt ? Math.max(WINDOW_MS - (now - lastUsedAt), 0) : WINDOW_MS;
    return { allowed: false, remaining: 0, limit, retryAfterMs };
  }

  const nextCount = attemptCount + 1;
  const { error: writeError } = await supabase.from("ai_usage").upsert(
    {
      identifier,
      identifier_type: "session",
      session_id: sessionId,
      feature,
      ip: null,
      attempt_count: nextCount,
      last_used_at: new Date(now).toISOString(),
    },
    { onConflict: "identifier" },
  );

  if (writeError) {
    throw new Error(`Failed to update AI usage: ${writeError.message}`);
  }

  return { allowed: true, remaining: Math.max(limit - nextCount, 0), limit };
}
