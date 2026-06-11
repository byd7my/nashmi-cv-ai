import OpenAI from "openai";

import { checkAndConsumeAiImproveUsage } from "../lib/ai-usage.server";

const DEFAULT_MODEL = "gpt-4o-mini";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

function formatRetryHours(ms: number): string {
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not set on Vercel",
    });
  }

  const prompt = req.body?.prompt;
  const usageType = req.body?.usageType;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Missing prompt",
    });
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
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message || "AI usage check failed",
        code: "AI_USAGE_CHECK_FAILED",
      });
    }
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 700,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!text) {
      return res.status(502).json({
        error: "OpenAI returned an empty response",
      });
    }

    return res.status(200).json({ text });
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      const retryAfterHeader = err.headers?.["retry-after"];
      const retryAfter =
        typeof retryAfterHeader === "string" && retryAfterHeader.trim()
          ? `Try again in ${retryAfterHeader.trim()}.`
          : "";

      return res.status(err.status ?? 500).json({
        error: err.message || `OpenAI error ${err.status ?? 500}`,
        retryAfter,
      });
    }

    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return res.status(500).json({ error: message });
  }
}
