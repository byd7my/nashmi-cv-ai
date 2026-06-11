import type { CVData } from "@/nashmi/lib/ats";
import { getCvSessionId } from "@/nashmi/lib/session";

export type CvTranslateLang = "ar" | "en";

export type TranslateCvResult =
  | { ok: true; cv: CVData }
  | { ok: false; error: string; rateLimited?: boolean };

function scriptCount(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).join("").length;
}

function narrativeText(cv: CVData): string {
  return [
    cv.summary,
    ...(cv.experience?.map((e) => `${e.role} ${e.desc}`) || []),
    ...(cv.education?.map((e) => `${e.degree} ${e.field}`) || []),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Heuristic: does resume narrative look like the requested language? */
export function cvMatchesLanguage(cv: CVData, lang: CvTranslateLang): boolean {
  const sample = narrativeText(cv).trim();
  if (!sample) return true;

  const arabic = scriptCount(sample, /[\u0600-\u06FF]/g);
  const latin = scriptCount(sample, /[A-Za-z]/g);
  if (lang === "ar") return arabic >= 20;
  return latin >= 20;
}

function mergeTranslatedCv(source: CVData, parsed: Partial<CVData>): CVData {
  return {
    personal: {
      ...source.personal,
      ...(parsed.personal || {}),
      name: source.personal?.name || parsed.personal?.name || "",
      email: source.personal?.email || parsed.personal?.email || "",
      phone: source.personal?.phone || parsed.personal?.phone || "",
      linkedin: source.personal?.linkedin || parsed.personal?.linkedin || "",
      website: source.personal?.website || parsed.personal?.website || "",
    },
    summary: typeof parsed.summary === "string" ? parsed.summary : source.summary,
    experience: Array.isArray(parsed.experience) ? parsed.experience : source.experience,
    education: Array.isArray(parsed.education) ? parsed.education : source.education,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : source.skills,
    languages: Array.isArray(parsed.languages) ? parsed.languages : source.languages,
    certifications: Array.isArray(parsed.certifications)
      ? parsed.certifications
      : source.certifications,
  };
}

function extractJsonObject(text: string): Partial<CVData> {
  const clean = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(clean) as Partial<CVData>;
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1)) as Partial<CVData>;
    }
    throw new Error("Invalid translation JSON");
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sessionId = getCvSessionId();
  if (sessionId) headers["x-nashmi-session-id"] = sessionId;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch("/api/openai", {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({ prompt, usageType: "translate" }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && data?.code === "AI_RATE_LIMIT") {
      const err = new Error("AI_RATE_LIMIT");
      (err as Error & { rateLimited: boolean }).rateLimited = true;
      throw err;
    }
    if (!res.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : `OpenAI error ${res.status}`);
    }
    if (typeof data?.text !== "string" || !data.text.trim()) {
      throw new Error("Empty translation response");
    }
    return data.text.trim();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function translateField(
  text: string,
  target: CvTranslateLang,
  context: string,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const targetLabel = target === "ar" ? "Modern Standard Arabic" : "professional English";
  const prompt = `
Translate the following resume ${context} into ${targetLabel}.
Keep formatting (bullets, line breaks). Do not add explanations.
Return ONLY the translated text.

Text:
${trimmed}
`.trim();

  return (await callOpenAI(prompt)).trim();
}

async function translateCvBySections(
  cv: CVData,
  target: CvTranslateLang,
): Promise<CVData> {
  const out: CVData = JSON.parse(JSON.stringify(cv)) as CVData;

  if (out.personal?.title) {
    out.personal.title = await translateField(out.personal.title, target, "job title");
  }
  if (out.personal?.city) {
    out.personal.city = await translateField(out.personal.city, target, "city/location");
  }
  if (out.summary) {
    out.summary = await translateField(out.summary, target, "professional summary");
  }

  for (const exp of out.experience) {
    if (exp.role) exp.role = await translateField(exp.role, target, "job title");
    if (exp.company) exp.company = await translateField(exp.company, target, "company name");
    if (exp.desc) exp.desc = await translateField(exp.desc, target, "responsibilities and achievements");
    if (exp.to && /present|current|الآن|حتى/i.test(exp.to)) {
      exp.to = target === "ar" ? "حتى الآن" : "Present";
    }
  }

  for (const edu of out.education) {
    if (edu.degree) edu.degree = await translateField(edu.degree, target, "degree");
    if (edu.field) edu.field = await translateField(edu.field, target, "field of study");
    if (edu.school) edu.school = await translateField(edu.school, target, "school name");
    if (edu.honors) edu.honors = await translateField(edu.honors, target, "honors");
  }

  if (out.skills.length) {
    const joined = out.skills.join(", ");
    const translated = await translateField(joined, target, "skills list (comma-separated)");
    out.skills = translated.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  }

  for (const cert of out.certifications) {
    if (cert.title) cert.title = await translateField(cert.title, target, "certification title");
    if (cert.issuer) cert.issuer = await translateField(cert.issuer, target, "certification issuer");
  }

  for (const lang of out.languages) {
    if (lang.lang) lang.lang = await translateField(lang.lang, target, "language name");
    if (lang.level) lang.level = await translateField(lang.level, target, "proficiency level");
  }

  return out;
}

async function translateCvFullJson(
  cv: CVData,
  target: CvTranslateLang,
): Promise<CVData> {
  const targetLabel =
    target === "ar" ? "Modern Standard Arabic (professional)" : "professional English";

  const prompt = `
You are an expert bilingual resume translator for Saudi/GCC job markets.

Task:
Translate the entire resume JSON below into ${targetLabel}.
Return ONLY valid JSON with the exact same structure and keys.

Rules:
- Translate summary, job titles, companies, responsibilities, degrees, fields, honors, skills, certification titles, and language labels.
- Keep personal.name, email, phone, linkedin, and website unchanged.
- Preserve bullet formatting in experience descriptions.
- Do not invent information.
- Do not add markdown or explanations.

Source resume JSON:
${JSON.stringify(cv)}
`.trim();

  const text = await callOpenAI(prompt);
  return mergeTranslatedCv(cv, extractJsonObject(text));
}

export function translateRateLimitMessage(isAr: boolean, limit = 40): string {
  return isAr
    ? `تجاوزت حد الترجمة (${limit} طلب) لهذه السيرة. عدّل يدوياً أو صدّر وابدأ سيرة جديدة.`
    : `Translation limit reached (${limit} requests) for this resume. Edit manually, export, or start a new session.`;
}

export async function translateCvDetailed(
  cv: CVData,
  target: CvTranslateLang,
): Promise<TranslateCvResult> {
  try {
    let translated: CVData;
    try {
      translated = await translateCvFullJson(cv, target);
    } catch (err) {
      if (err instanceof Error && (err as Error & { rateLimited?: boolean }).rateLimited) {
        throw err;
      }
      translated = await translateCvBySections(cv, target);
    }

    if (!cvMatchesLanguage(translated, target)) {
      return {
        ok: false,
        error:
          target === "ar"
            ? "لم تكتمل الترجمة العربية. حاول مرة أخرى."
            : "English translation incomplete. Please try again.",
      };
    }

    return { ok: true, cv: translated };
  } catch (err) {
    if (err instanceof Error && (err as Error & { rateLimited?: boolean }).rateLimited) {
      return { ok: false, error: translateRateLimitMessage(target === "ar"), rateLimited: true };
    }
    const message =
      err instanceof Error && err.name === "AbortError"
        ? target === "ar"
          ? "انتهت مهلة الترجمة. حاول مرة أخرى."
          : "Translation timed out. Please try again."
        : err instanceof Error
          ? err.message
          : "Translation failed";
    return { ok: false, error: message };
  }
}

export async function translateCv(
  cv: CVData,
  target: CvTranslateLang,
): Promise<CVData | null> {
  const result = await translateCvDetailed(cv, target);
  return result.ok ? result.cv : null;
}
