import OpenAI from "openai";

import { checkAndConsumeAiImproveUsage } from "./ai-usage.server";
import { describeOpenAIEnv, getOpenAIApiKey, getOpenAIModel } from "./env.server";
import { createChatCompletion } from "./openai.server";

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
  const usageType = body.usageType;
  const usageFeature = body.usageFeature;
  const maxTokens =
    usageType === "translate"
      ? 4096
      : typeof body.maxTokens === "number" && body.maxTokens > 0
        ? Math.min(Math.floor(body.maxTokens), 4096)
        : 700;

  if (!prompt || typeof prompt !== "string") {
    return jsonResponse({ error: "Missing prompt", code: "MISSING_PROMPT" }, 400);
  }

  if (usageType === "improve") {
    if (typeof usageFeature !== "string" || !usageFeature.trim()) {
      return jsonResponse({ error: "Missing usageFeature", code: "MISSING_USAGE_FEATURE" }, 400);
    }

    try {
      const usage = await checkAndConsumeAiImproveUsage(toUsageRequest(request), usageFeature);

      if (!usage.allowed) {
        const retryIn = formatRetryHours(usage.retryAfterMs);
        return jsonResponse(
          {
            error: `You have reached the limit of ${usage.limit} uses for this button on this resume. Please try again in about ${retryIn}.`,
            code: "AI_RATE_LIMIT",
            limit: usage.limit,
            remaining: 0,
            retryAfterMs: usage.retryAfterMs,
            feature: usageFeature,
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
