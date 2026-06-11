import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.server";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type SessionUsageType = "improve" | "translate" | "copilot" | "parse";

export type AiUsageCheckResult =
  | { allowed: true; remaining: number; limit: number; usageType: SessionUsageType }
  | {
      allowed: false;
      remaining: 0;
      limit: number;
      retryAfterMs: number;
      usageType: SessionUsageType;
    };

function readLimitEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

/** Per AI Improve button on one CV session (summary, exp-0, skills, …). */
export function getImproveLimit(): number {
  return readLimitEnv("AI_RATE_LIMIT_MAX", 3);
}

/** Shared bucket for all translation API chunks in one CV session. */
export function getTranslateLimit(): number {
  return readLimitEnv("AI_TRANSLATE_LIMIT_MAX", 40);
}

/** Copilot chat messages per CV session. */
export function getCopilotLimit(): number {
  return readLimitEnv("AI_COPILOT_LIMIT_MAX", 35);
}

/** CV file/text imports parsed by AI per session. */
export function getParseLimit(): number {
  return readLimitEnv("AI_PARSE_LIMIT_MAX", 3);
}

function getLimitForType(type: SessionUsageType): number {
  switch (type) {
    case "improve":
      return getImproveLimit();
    case "translate":
      return getTranslateLimit();
    case "copilot":
      return getCopilotLimit();
    case "parse":
      return getParseLimit();
    default:
      return 3;
  }
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
    throw new Error("CV session ID is required for AI rate limiting");
  }

  return sessionId;
}

function buildIdentifier(sessionId: string, type: SessionUsageType, feature?: string): string {
  if (type === "improve") {
    if (!feature) throw new Error("usageFeature is required for AI Improve rate limiting");
    return `session:${sessionId}:type:improve:feature:${normalizeFeature(feature)}`;
  }
  return `session:${sessionId}:type:${type}`;
}

function featureLabel(type: SessionUsageType, feature?: string): string {
  if (type === "improve" && feature) return feature;
  return type;
}

export async function checkAndConsumeSessionUsage(
  req: Parameters<typeof resolveSessionId>[0],
  usageType: SessionUsageType,
  usageFeature?: string,
): Promise<AiUsageCheckResult> {
  const limit = getLimitForType(usageType);

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for AI rate limiting");
  }

  const sessionId = resolveSessionId(req);
  const feature = usageType === "improve" ? normalizeFeature(usageFeature ?? "") : usageType;
  const identifier = buildIdentifier(sessionId, usageType, usageFeature);
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
    return { allowed: false, remaining: 0, limit, retryAfterMs, usageType };
  }

  const nextCount = attemptCount + 1;
  const { error: writeError } = await supabase.from("ai_usage").upsert(
    {
      identifier,
      identifier_type: "session",
      session_id: sessionId,
      feature: featureLabel(usageType, usageFeature),
      ip: null,
      attempt_count: nextCount,
      last_used_at: new Date(now).toISOString(),
    },
    { onConflict: "identifier" },
  );

  if (writeError) {
    throw new Error(`Failed to update AI usage: ${writeError.message}`);
  }

  return {
    allowed: true,
    remaining: Math.max(limit - nextCount, 0),
    limit,
    usageType,
  };
}

/** @deprecated Use checkAndConsumeSessionUsage — kept for clarity at call sites. */
export async function checkAndConsumeAiImproveUsage(
  req: Parameters<typeof resolveSessionId>[0],
  featureRaw: string,
): Promise<AiUsageCheckResult> {
  return checkAndConsumeSessionUsage(req, "improve", featureRaw);
}
