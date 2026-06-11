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

export function resolvePlanTierFromRequest(req: {
  headers?: Record<string, string | string[] | undefined>;
}): PlanTier {
  const header = req.headers?.["x-nashmi-plan-tier"];
  const value = typeof header === "string" ? header : Array.isArray(header) ? header[0] : "";
  return normalizePlanTier(value);
}
