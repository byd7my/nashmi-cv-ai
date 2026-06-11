import OpenAI from "openai";

import {
  checkAndConsumeSessionUsage,
  type SessionUsageType,
} from "./ai-usage.server";
import { describeOpenAIEnv, getOpenAIApiKey, getOpenAIModel } from "./env.server";
import { createChatCompletion } from "./openai.server";

const RATE_LIMITED_TYPES = new Set<SessionUsageType>(["improve", "translate", "copilot", "parse"]);

function logApiError(context: string, err: unknown, extra?: Record<string, unknown>) {
  console.error(`[api/openai] ${context}`, {
    ...extra,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}

function formatRetryHours(ms: number): string {
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function rateLimitMessage(type: SessionUsageType, limit: number, feature?: string): string {
  switch (type) {
    case "improve":
      return `You have reached the limit of ${limit} uses for this button (${feature ?? "improve"}) on this resume. Please try again in about 24 hours or start a new paid session.`;
    case "translate":
      return `You have reached the translation limit (${limit} requests) for this resume session. Export your CV or purchase a new session to continue.`;
    case "copilot":
      return `You have reached the Copilot limit (${limit} messages) for this resume session. Export your CV or purchase a new session to continue.`;
    case "parse":
      return `You have reached the CV import limit (${limit} imports) for this session.`;
    default:
      return `You have reached the AI usage limit for this session.`;
  }
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status });
}

function toUsageRequest(request: Request) {
  const headers: Record<string, string | string[] | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return { headers };
}

export async function handleOpenAIRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    const envInfo = describeOpenAIEnv();
    logApiError("Missing OPENAI_API_KEY", new Error("OPENAI_API_KEY is not configured"), envInfo);
    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY is not configured. Add OPENAI_API_KEY to your .env (local) or Vercel Environment Variables (production).",
        code: "MISSING_OPENAI_KEY",
        hint: envInfo.matchingEnvKeys.length
          ? `Found related env keys: ${envInfo.matchingEnvKeys.join(", ")}`
          : "No OPENAI_* environment variables were detected.",
      },
      500,
    );
  }

  let body: { prompt?: unknown; usageType?: unknown; usageFeature?: unknown; maxTokens?: unknown };
  try {
    body = (await request.json()) as {
      prompt?: unknown;
      usageType?: unknown;
      usageFeature?: unknown;
      maxTokens?: unknown;
    };
  } catch {
    return jsonResponse({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const prompt = body.prompt;
  const usageTypeRaw = body.usageType;
  const usageFeature = body.usageFeature;
  const usageType =
    typeof usageTypeRaw === "string" && RATE_LIMITED_TYPES.has(usageTypeRaw as SessionUsageType)
      ? (usageTypeRaw as SessionUsageType)
      : null;

  const maxTokens =
    usageType === "translate"
      ? 4096
      : typeof body.maxTokens === "number" && body.maxTokens > 0
        ? Math.min(Math.floor(body.maxTokens), 4096)
        : 700;

  if (!prompt || typeof prompt !== "string") {
    return jsonResponse({ error: "Missing prompt", code: "MISSING_PROMPT" }, 400);
  }

  if (usageType) {
    if (usageType === "improve") {
      if (typeof usageFeature !== "string" || !usageFeature.trim()) {
        return jsonResponse({ error: "Missing usageFeature", code: "MISSING_USAGE_FEATURE" }, 400);
      }
    }

    try {
      const usage = await checkAndConsumeSessionUsage(
        toUsageRequest(request),
        usageType,
        typeof usageFeature === "string" ? usageFeature : undefined,
      );

      if (!usage.allowed) {
        const retryIn = formatRetryHours(usage.retryAfterMs);
        return jsonResponse(
          {
            error: `${rateLimitMessage(usageType, usage.limit, typeof usageFeature === "string" ? usageFeature : undefined)} Retry in about ${retryIn}.`,
            code: "AI_RATE_LIMIT",
            usageType,
            limit: usage.limit,
            remaining: 0,
            retryAfterMs: usage.retryAfterMs,
            feature: typeof usageFeature === "string" ? usageFeature : null,
          },
          429,
        );
      }
    } catch (err: unknown) {
      logApiError("AI usage check failed", err, describeOpenAIEnv());
      return jsonResponse(
        {
          error: err instanceof Error ? err.message : "AI usage check failed",
          code: "AI_USAGE_CHECK_FAILED",
        },
        500,
      );
    }
  }

  const model = getOpenAIModel();

  try {
    const text = await createChatCompletion(prompt, model, { maxTokens });

    if (!text) {
      logApiError("Empty OpenAI response", new Error("OpenAI returned an empty response"), { model });
      return jsonResponse(
        {
          error: "OpenAI returned an empty response",
          code: "OPENAI_EMPTY_RESPONSE",
        },
        502,
      );
    }

    return jsonResponse({ text }, 200);
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      logApiError("OpenAI API error", err, {
        status: err.status,
        type: err.type,
        code: err.code,
        model,
        keyPreview: describeOpenAIEnv().keyPreview,
      });

      const retryAfterHeader = err.headers?.["retry-after"];
      const retryAfter =
        typeof retryAfterHeader === "string" && retryAfterHeader.trim()
          ? `Try again in ${retryAfterHeader.trim()}.`
          : "";

      return jsonResponse(
        {
          error: err.message || `OpenAI error ${err.status ?? 500}`,
          code: "OPENAI_API_ERROR",
          openaiCode: err.code ?? null,
          retryAfter,
        },
        err.status ?? 500,
      );
    }

    const envInfo = describeOpenAIEnv();
    logApiError("Unexpected handler error", err, { openaiModel: model, configuredModel: envInfo.model });
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return jsonResponse(
      {
        error: message,
        code: "OPENAI_REQUEST_FAILED",
      },
      500,
    );
  }
}
