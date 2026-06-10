const DEFAULT_MODEL = "gemini-2.0-flash-lite";

function getRetryMessage(headers: Headers) {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return "";

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return `Try again in ${Math.ceil(seconds)} seconds.`;
  }

  return `Try again after ${retryAfter}.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set on Vercel",
    });
  }

  const prompt = req.body?.prompt;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Missing prompt",
    });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700,
        },
      }),
    });

    const data = await geminiRes.json().catch(() => ({}));

    if (!geminiRes.ok) {
      const retryAfter = getRetryMessage(geminiRes.headers);

      return res.status(geminiRes.status).json({
        error: data?.error?.message || `Gemini error ${geminiRes.status}`,
        retryAfter,
      });
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned an empty response",
      });
    }

    return res.status(200).json({
      text,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Gemini request failed",
    });
  }
}
