import type { CVData } from "@/nashmi/lib/ats";
import { getCvSessionId } from "@/nashmi/lib/session";

export type CvTranslateLang = "ar" | "en";

function scriptCount(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).join("").length;
}

export function cvTextSample(cv: CVData): string {
  return [
    cv.personal?.title,
    cv.summary,
    ...(cv.experience?.map((e) => `${e.role} ${e.company} ${e.desc}`) || []),
    ...(cv.education?.map((e) => `${e.degree} ${e.field} ${e.school} ${e.honors}`) || []),
    ...(cv.skills || []),
    ...(cv.certifications?.map((c) => `${c.title} ${c.issuer}`) || []),
    ...(cv.languages?.map((l) => `${l.lang} ${l.level}`) || []),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Heuristic: does resume body text look like the requested language? */
export function cvMatchesLanguage(cv: CVData, lang: CvTranslateLang): boolean {
  const sample = cvTextSample(cv).trim();
  if (!sample) return true;

  const arabic = scriptCount(sample, /[\u0600-\u06FF]/g);
  const latin = scriptCount(sample, /[A-Za-z]/g);
  if (lang === "ar") return arabic >= Math.max(24, latin * 0.35);
  return latin >= Math.max(24, arabic * 0.35);
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

export async function translateCv(
  cv: CVData,
  target: CvTranslateLang,
): Promise<CVData | null> {
  const targetLabel =
    target === "ar" ? "Modern Standard Arabic (professional)" : "professional English";

  const prompt = `
You are an expert bilingual resume translator for Saudi/GCC job markets.

Task:
Translate the entire resume JSON below into ${targetLabel}.
Return ONLY valid JSON with the exact same structure and keys.

Rules:
- Translate all narrative text: summary, job titles, companies (use common local spelling when appropriate), responsibilities, degrees, fields, honors, skills, certification titles, language proficiency labels.
- Keep personal.name, email, phone, linkedin, and website exactly as in the source (do not translate URLs or emails).
- Keep date strings (from, to, date) unchanged unless they are words like "Present" → translate to "حتى الآن" for Arabic or "Present" for English.
- Preserve bullet formatting in experience descriptions.
- Do not invent employers, dates, degrees, or achievements.
- Do not add markdown or explanations.

Source resume JSON:
${JSON.stringify(cv)}
`.trim();

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const sessionId = getCvSessionId();
    if (sessionId) headers["x-nashmi-session-id"] = sessionId;

    const res = await fetch("/api/openai", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data?.text !== "string") return null;

    const clean = data.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as Partial<CVData>;
    const merged = mergeTranslatedCv(cv, parsed);
    return cvMatchesLanguage(merged, target) ? merged : null;
  } catch {
    return null;
  }
}
