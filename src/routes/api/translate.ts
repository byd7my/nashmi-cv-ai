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

// Recursively walk the CV and collect every translatable string with a JSON pointer.
type Entry = { path: (string | number)[]; value: string };
const SKIP_KEYS = new Set([
  "id", "email", "phone", "website", "linkedin", "github",
  "from", "to", "year", "gpa", "level",
]);
const URL_RE = /^https?:\/\//i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collect(node: unknown, path: (string | number)[], out: Entry[]) {
  if (node == null) return;
  if (typeof node === "string") {
    const v = node.trim();
    if (!v || URL_RE.test(v) || EMAIL_RE.test(v)) return;
    out.push({ path: [...path], value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collect(item, [...path, i], out));
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (SKIP_KEYS.has(k)) continue;
      collect(v, [...path, k], out);
    }
  }
}

function setAt(target: any, path: (string | number)[], value: string) {
  let cur = target;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export const Route = createFileRoute("/api/translate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

          const body = (await request.json()) as {
            resumeData?: unknown;
            targetLanguage?: string;
          };
          const resumeData = body.resumeData;
          const target = (body.targetLanguage || "Arabic").toString();
          if (!resumeData || typeof resumeData !== "object") {
            return json({ error: "Missing resumeData" }, 400);
          }

          const entries: Entry[] = [];
          collect(resumeData, [], entries);
          if (entries.length === 0) {
            return json({ translatedData: resumeData });
          }

          // Build an index→text map for the model
          const indexed: Record<string, string> = {};
          entries.forEach((e, i) => (indexed[String(i)] = e.value));

          const gateway = createLovableAiGatewayProvider(key);
          const targetIsAr = /^ar/i.test(target) || /arabic|عرب/i.test(target);
          const langLabel = targetIsAr ? "Arabic (Modern Standard Arabic)" : target;

          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            temperature: 0.2,
            system:
              `You are a professional resume translator. Translate every value of the given JSON object into ${langLabel}. ` +
              `Preserve the exact same keys and string count. Keep proper nouns, brand names, technologies (React, Node.js…), ` +
              `acronyms, numbers, dates, and bullet markers (•, -) unchanged. Keep line breaks. ` +
              `Output ONLY a valid JSON object mapping the same keys to translated strings — no commentary, no code fences.`,
            prompt: JSON.stringify(indexed),
          });

          let map: Record<string, string>;
          try {
            map = JSON.parse(stripJsonFence(text));
          } catch {
            return json({ error: "Translation parse failed", raw: text }, 502);
          }

          // Deep clone & apply translations
          const translated = JSON.parse(JSON.stringify(resumeData));
          entries.forEach((e, i) => {
            const v = map[String(i)];
            if (typeof v === "string" && v.trim()) setAt(translated, e.path, v);
          });

          if (targetIsAr && translated && typeof translated === "object") {
            (translated as Record<string, unknown>).isArabicTemplate = true;
          }

          return json({ translatedData: translated });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return json({ error: msg }, status);
        }
      },
    },
  },
});
