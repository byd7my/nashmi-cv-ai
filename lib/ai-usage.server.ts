import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type AiUsageIdentifier = {
  identifier: string;
  identifierType: "session" | "ip";
  sessionId: string | null;
  ip: string | null;
};

export type AiUsageCheckResult =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; remaining: 0; limit: number; retryAfterMs: number };

export function resolveAiUsageIdentifier(req: {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | null };
}): AiUsageIdentifier {
  const sessionHeader = req.headers?.["x-nashmi-session-id"];
  const sessionId =
    typeof sessionHeader === "string" && sessionHeader.trim().length >= 8
      ? sessionHeader.trim().slice(0, 128)
      : null;

  if (sessionId) {
    return {
      identifier: `session:${sessionId}`,
      identifierType: "session",
      sessionId,
      ip: extractClientIp(req),
    };
  }

  const ip = extractClientIp(req) || "unknown";
  return {
    identifier: `ip:${ip}`,
    identifierType: "ip",
    sessionId: null,
    ip,
  };
}

function extractClientIp(req: {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | null };
}): string | null {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  const realIp = req.headers?.["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || null;
}

function getLimit(): number {
  const raw = Number(process.env.AI_RATE_LIMIT_MAX ?? 3);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3;
}

export async function checkAndConsumeAiImproveUsage(
  req: Parameters<typeof resolveAiUsageIdentifier>[0],
): Promise<AiUsageCheckResult> {
  const limit = getLimit();

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for AI rate limiting");
  }

  const who = resolveAiUsageIdentifier(req);
  const supabase = getSupabaseAdmin();
  const now = Date.now();

  const { data: row, error: readError } = await supabase
    .from("ai_usage")
    .select("attempt_count, last_used_at")
    .eq("identifier", who.identifier)
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
      identifier: who.identifier,
      identifier_type: who.identifierType,
      session_id: who.sessionId,
      ip: who.ip,
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
