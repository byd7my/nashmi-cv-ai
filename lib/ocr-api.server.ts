import OpenAI from "openai";

import { checkAndConsumeSessionUsage } from "./ai-usage.server";
import { getOpenAIApiKey, getOpenAIModel } from "./env.server";

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function toUsageRequest(request: Request) {
  const headers: Record<string, string | string[] | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return { headers };
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function handleOcrResumeRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return json({ error: "OPENAI_API_KEY is not configured", code: "MISSING_OPENAI_KEY" }, 500);
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "image/jpeg";

  if (!imageBase64 || imageBase64.length < 32) {
    return json({ error: "Image data is required", code: "MISSING_IMAGE" }, 400);
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return json({ error: "Unsupported image type", code: "INVALID_MIME" }, 400);
  }
  if (imageBase64.length > 6_000_000) {
    return json({ error: "Image is too large", code: "IMAGE_TOO_LARGE" }, 413);
  }

  try {
    const usage = await checkAndConsumeSessionUsage(toUsageRequest(request), "parse");
    if (!usage.allowed) {
      return json(
        {
          error: "CV import limit reached for this session.",
          code: "AI_RATE_LIMIT",
          usageType: "parse",
          limit: usage.limit,
        },
        429,
      );
    }
  } catch (err) {
    console.error("[api/ocr-resume] usage check failed", err);
    return json({ error: "Could not verify usage limits", code: "AI_USAGE_CHECK_FAILED" }, 503);
  }

  const openai = new OpenAI({ apiKey });
  const model = getOpenAIModel();

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.1,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract all readable text from this resume image. Preserve section headings, bullet points, dates, and contact details. Return plain text only — no markdown or commentary.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    });

    const text = (completion.choices[0]?.message?.content || "").trim();
    if (!text) {
      return json({ error: "Could not read text from image", code: "EMPTY_OCR" }, 422);
    }

    return json({ text });
  } catch (err) {
    console.error("[api/ocr-resume] OpenAI vision failed", err);
    return json({ error: "OCR processing failed", code: "OCR_FAILED" }, 502);
  }
}
