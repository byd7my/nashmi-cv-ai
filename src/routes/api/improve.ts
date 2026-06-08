import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

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
          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return json(
              { error: "AI service is not configured (missing LOVABLE_API_KEY)." },
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

          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          // ── Copilot chat ────────────────────────────────────────────────
          if (task === "copilot") {
            const history = Array.isArray(body.history) ? body.history : [];
            const cvStr = body.cv ? JSON.stringify(body.cv).slice(0, 6000) : "";
            const { text: out } = await generateText({
              model,
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
            const { text: out } = await generateText({
              model,
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
          const { text: out } = await generateText({
            model,
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
          const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return json({ error: msg }, status);
        }
      },
    },
  },
});
