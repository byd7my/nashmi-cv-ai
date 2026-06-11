import OpenAI from "openai";

import { checkAndConsumeAiImproveUsage } from "../lib/ai-usage.server";
import { describeOpenAIEnv, getOpenAIApiKey, getOpenAIModel } from "../lib/env.server";
import { createChatCompletion } from "../lib/openai.server";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    const envInfo = describeOpenAIEnv();
    logApiError("Missing OPENAI_API_KEY", new Error("OPENAI_API_KEY is not configured"), envInfo);
    return res.status(500).json({
      error:
        "OPENAI_API_KEY is not configured. Add OPENAI_API_KEY to your .env (local) or Vercel Environment Variables (production).",
      code: "MISSING_OPENAI_KEY",
      hint: envInfo.matchingEnvKeys.length
        ? `Found related env keys: ${envInfo.matchingEnvKeys.join(", ")}`
        : "No OPENAI_* environment variables were detected.",
    });
  }

  const prompt = req.body?.prompt;
  const usageType = req.body?.usageType;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt", code: "MISSING_PROMPT" });
  }

  if (usageType === "improve") {
    try {
      const usage = await checkAndConsumeAiImproveUsage(req);

      if (!usage.allowed) {
        const retryIn = formatRetryHours(usage.retryAfterMs);
        return res.status(429).json({
          error: `You have reached the limit of ${usage.limit} AI Improve uses. Please try again in about ${retryIn}.`,
          code: "AI_RATE_LIMIT",
          limit: usage.limit,
          remaining: 0,
          retryAfterMs: usage.retryAfterMs,
        });
      }
    } catch (err: unknown) {
      logApiError("AI usage check failed", err, describeOpenAIEnv());
      return res.status(500).json({
        error: err instanceof Error ? err.message : "AI usage check failed",
        code: "AI_USAGE_CHECK_FAILED",
      });
    }
  }

  const model = getOpenAIModel();

  try {
    const text = await createChatCompletion(prompt, model);

    if (!text) {
      logApiError("Empty OpenAI response", new Error("OpenAI returned an empty response"), { model });
      return res.status(502).json({
        error: "OpenAI returned an empty response",
        code: "OPENAI_EMPTY_RESPONSE",
      });
    }

    return res.status(200).json({ text });
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

      return res.status(err.status ?? 500).json({
        error: err.message || `OpenAI error ${err.status ?? 500}`,
        code: "OPENAI_API_ERROR",
        openaiCode: err.code ?? null,
        retryAfter,
      });
    }

    logApiError("Unexpected handler error", err, { model, ...describeOpenAIEnv() });
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return res.status(500).json({
      error: message,
      code: "OPENAI_REQUEST_FAILED",
    });
  }
}
