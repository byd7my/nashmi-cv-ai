import OpenAI from "openai";

import { getOpenAIApiKey } from "./env.server";

let cachedClient: OpenAI | null = null;
let cachedKey: string | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new OpenAI({ apiKey });
    cachedKey = apiKey;
  }

  return cachedClient;
}

export async function createChatCompletion(
  prompt: string,
  model: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.4,
    max_tokens: options?.maxTokens ?? 700,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
