import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function generateGeminiText(options: {
  apiKey: string;
  system: string;
  prompt: string;
  temperature?: number;
}) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(options.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: options.prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string; status?: string };
  } | null;

  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText || "Unknown Gemini API error";
    throw new Error(`Gemini API request failed (${response.status}): ${detail}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini API returned an empty response.");
  }

  return text;
}

type Body = {
  task?: string;
  text?: string;
  language?: string;
  cv?: unknown;
  history?: Array<{ role: string; content: string }>;
};

export const Route = createFileRoute("/api/improve")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const key = process.env.GEMINI_API_KEY;
          if (!key) {
            return json(
              { error: "Gemini API key is not configured. Add GEMINI_API_KEY in Lovable Cloud Secrets, then retry." },
              500,
            );
          }

          const body = (await request.json()) as Body;
          const task = (body.task || "").toString();
          const text = (body.text || "").toString();
          const language = (body.language || "en").toString();
          const isAr = /^ar/i.test(language);
          const langLabel = isAr ? "Arabic (Modern Standard Arabic)" : "English";

          if (!task) return json({ error: "Missing task" }, 400);

          // ── Copilot chat ────────────────────────────────────────────────
          if (task === "copilot") {
            const history = Array.isArray(body.history) ? body.history : [];
            const cvStr = body.cv ? JSON.stringify(body.cv).slice(0, 6000) : "";
            const out = await generateGeminiText({
              apiKey: key,
              temperature: 0.5,
              system:
                `You are a friendly, concise resume copilot. Reply in ${langLabel}. ` +
                `Give actionable, short suggestions based on the user's resume JSON below.\n\nRESUME:\n${cvStr}`,
              prompt:
                history
                  .slice(-8)
                  .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
                  .join("\n") + `\nUSER: ${text}`,
            });
            return json({ text: out });
          }

          // ── Parse CV (free-form text → CVData JSON) ─────────────────────
          if (task === "parse_cv") {
            const out = await generateGeminiText({
              apiKey: key,
              temperature: 0.1,
              system:
                `Extract a resume from the user's raw text into JSON with this exact shape:\n` +
                `{"personal":{"name":"","title":"","email":"","phone":"","city":"","linkedin":""},` +
                `"summary":"","experience":[{"company":"","role":"","from":"","to":"","desc":""}],` +
                `"education":[{"school":"","degree":"","field":"","from":"","to":"","gpa":"","gpaScale":"","showGpa":false,"honors":""}],` +
                `"certifications":[{"title":"","issuer":"","date":""}],` +
                `"skills":[],"languages":[{"lang":"","level":""}]}\n` +
                `Reply with ONLY valid JSON, no commentary, no code fences. Output values in ${langLabel}.`,
              prompt: text,
            });
            try {
              return json({ json: JSON.parse(stripJsonFence(out)) });
            } catch {
              return json({ error: "AI returned invalid JSON", raw: out }, 502);
            }
          }

          // ── Improve a section ───────────────────────────────────────────
          // task = "improve_summary", "improve_exp-0", "improve_skills", etc.
          const section = task.replace(/^improve_/, "");
          const out = await generateGeminiText({
            apiKey: key,
            temperature: 0.4,
            system:
              `You are an expert resume writer. Rewrite the user's "${section}" section ` +
              `to be concise, ATS-friendly, and impact-driven. Reply in ${langLabel}. ` +
              `Return ONLY the improved text — no preamble, no quotes, no markdown.`,
            prompt: text || (isAr ? "(فارغ — اقترح محتوى مناسب)" : "(empty — suggest suitable content)"),
          });
          return json({ text: out.trim() });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const geminiStatus = msg.match(/Gemini API request failed \((\d{3})\)/)?.[1];
          const status = geminiStatus ? Number(geminiStatus) : /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return json({ error: msg }, status);
        }
      },
    },
  },
});
