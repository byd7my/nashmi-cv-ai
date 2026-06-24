export type PlanTier = "starter" | "premium" | "elite" | "enterprise";

export type PlanUsageLimits = {
  improvePerButton: number;
  translateChunks: number;
  assistantMessages: number;
  parseImports: number;
};

function readLimitEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

const DEFAULT_LIMITS: Record<PlanTier, PlanUsageLimits> = {
  starter: { improvePerButton: 0, translateChunks: 0, assistantMessages: 0, parseImports: 0 },
  premium: { improvePerButton: 3, translateChunks: 0, assistantMessages: 20, parseImports: 2 },
  elite: { improvePerButton: 5, translateChunks: 45, assistantMessages: 40, parseImports: 3 },
  enterprise: { improvePerButton: 5, translateChunks: 45, assistantMessages: 40, parseImports: 3 },
};

export function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const tier = (raw ?? "").trim().toLowerCase();
  if (tier === "premium" || tier === "elite" || tier === "enterprise" || tier === "starter") {
    return tier;
  }
  return "starter";
}

export function getPlanUsageLimits(tierRaw: string | null | undefined): PlanUsageLimits {
  const tier = normalizePlanTier(tierRaw);
  const base = DEFAULT_LIMITS[tier];

  if (tier === "premium") {
    return {
      improvePerButton: readLimitEnv("AI_PREMIUM_IMPROVE_MAX", base.improvePerButton),
      translateChunks: readLimitEnv("AI_PREMIUM_TRANSLATE_MAX", base.translateChunks),
      assistantMessages: readLimitEnv("AI_PREMIUM_ASSISTANT_MAX", base.assistantMessages),
      parseImports: readLimitEnv("AI_PREMIUM_PARSE_MAX", base.parseImports),
    };
  }

  if (tier === "elite" || tier === "enterprise") {
    return {
      improvePerButton: readLimitEnv("AI_ELITE_IMPROVE_MAX", base.improvePerButton),
      translateChunks: readLimitEnv("AI_ELITE_TRANSLATE_MAX", base.translateChunks),
      assistantMessages: readLimitEnv("AI_ELITE_ASSISTANT_MAX", base.assistantMessages),
      parseImports: readLimitEnv("AI_ELITE_PARSE_MAX", base.parseImports),
    };
  }

  return base;
}

function readHeader(
  req: { headers?: Record<string, string | string[] | undefined> },
  name: string,
): string {
  const raw = req.headers?.[name];
  return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] ?? "" : "";
}

export function resolvePlanTierFromClientHeader(req: {
  headers?: Record<string, string | string[] | undefined>;
}): PlanTier {
  return normalizePlanTier(readHeader(req, "x-nashmi-plan-tier"));
}

export async function resolvePlanTierFromRequest(req: {
  headers?: Record<string, string | string[] | undefined>;
}): Promise<PlanTier> {
  const purchaseToken = readHeader(req, "x-nashmi-purchase-token").trim();
  const sessionId = readHeader(req, "x-nashmi-session-id").trim();

  if (purchaseToken.length >= 16 && sessionId.length >= 8) {
    const { lookupActivePurchaseTier } = await import("./activation-api.server");
    const verified = await lookupActivePurchaseTier(
      purchaseToken.slice(0, 128),
      sessionId.slice(0, 128),
    );
    if (verified) return verified;
  }

  return resolvePlanTierFromClientHeader(req);
}
