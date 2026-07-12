import type { CVData } from "@/nashmi/lib/ats";

export interface ImproveFactsJson {
  personal: CVData["personal"];
  summary: string;
  experience: CVData["experience"];
  education: CVData["education"];
  certifications: CVData["certifications"];
  skills: string[];
  languages: CVData["languages"];
  facts: {
    scope_mentions: string[];
  };
  suspicious_claims: string[];
}

const BANNED_EN =
  "results-driven, detail-oriented, proven track record, demonstrated expertise, spearheaded, leveraged, streamlined, showcasing, passionate, dynamic, synergy, results-oriented";

const BANNED_AR =
  "ديناميكي، شغوف، أثبت جدارته، سجل حافل، بارع في، ذو خبرة واسعة، موجه نحو النتائج";

const SCOPE_PATTERNS = [
  /\b\d+\+?\s*(users|user|employees|employee|clients|client|workstations|workstation|devices|device|tickets|ticket|projects|project|servers|server|endpoints|endpoint)\b/gi,
  /\b(team\s+of\s+\d+|\d+\s*[-–]?\s*person\s+team)\b/gi,
  /(?:دعم|خدمة|إدارة|صيانة)\s+\d+\+?\s*(?:مستخدم|جهاز|محطة|تذكرة|عميل|موظف)/g,
  /\b\d+\+?\s*(?:مستخدم|مستخدمين|جهاز|أجهزة|محطة|تذاكر|عملاء|موظفين)\b/g,
];

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\b\d{1,3}(?:\.\d+)?%\s*(?:resolution|improvement|increase|reduction|efficiency|uptime|satisfaction|accuracy|success|match|growth|productivity)/gi,
  /\b(?:increased|reduced|improved|boosted|decreased|raised|lowered|enhanced|cut|grew)\b[^.\n]{0,80}\bby\s+\d{1,3}(?:\.\d+)?%/gi,
  /\bzero\s+(?:breach(?:es)?|downtime|incidents?|errors?|defects?)\b/gi,
  /\b100%\s+(?:satisfaction|uptime|accuracy|success|compliance|availability)\b/gi,
  /\b\d{2,3}%\s+(?:resolution|success|satisfaction|uptime)\s+rate\b/gi,
  /(?:صفر\s+(?:اختراق|حادث|توقف)|\d{1,3}%\s*(?:معدل|نسبة|تحسين|زيادة|خفض|كفاءة|رضا|دقة|نجاح|توفر))/g,
  /\b(?:spearheaded|leveraged|streamlined)\b/gi,
];

function collectCvText(cv: CVData, extraText = ""): string {
  const parts = [
    cv.summary,
    extraText,
    ...cv.experience.map(e => `${e.role} ${e.company} ${e.desc}`),
    ...cv.education.map(e => `${e.degree} ${e.field} ${e.school} ${e.honors}`),
    ...cv.certifications.map(c => `${c.title} ${c.issuer}`),
    cv.skills.join(" "),
  ];
  return parts.filter(Boolean).join("\n");
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.trim();
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function extractScopeMentions(text: string): string[] {
  const found: string[] = [];
  for (const pattern of SCOPE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      found.push(match[0].trim());
    }
  }
  return uniqueStrings(found);
}

export function detectSuspiciousClaims(text: string): string[] {
  const found: string[] = [];
  for (const pattern of SUSPICIOUS_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      found.push(match[0].trim());
    }
  }
  return uniqueStrings(found);
}

export function buildImproveFactsJson(cv: CVData, sectionText = ""): ImproveFactsJson {
  const corpus = collectCvText(cv, sectionText);
  return {
    personal: cv.personal,
    summary: cv.summary,
    experience: cv.experience,
    education: cv.education,
    certifications: cv.certifications,
    skills: cv.skills,
    languages: cv.languages,
    facts: {
      scope_mentions: extractScopeMentions(corpus),
    },
    suspicious_claims: detectSuspiciousClaims(corpus),
  };
}

function languageLabel(isAr: boolean): string {
  return isAr ? "ar" : "en";
}

function coreRules(isAr: boolean, targetRole: string, factsJson: ImproveFactsJson): string {
  const lang = languageLabel(isAr);
  const banned = isAr ? BANNED_AR : BANNED_EN;
  const headers = isAr
    ? "استخدم عناوين ATS القياسية فقط عند الحاجة: الملخص، الخبرات، التعليم، الشهادات، المهارات، اللغات."
    : "Use standard ATS headers only when relevant: Summary, Experience, Education, Certifications, Skills, Languages.";

  return `
You are a senior CV writer for the Saudi/Gulf job market with 15 years of experience writing ATS-optimized, naturally human resumes.
Output language: ${lang} (${isAr ? "Arabic" : "English"}).
Target role: ${targetRole || "Not specified"}

## HARD RULES
1. Use ONLY facts from the Facts JSON below. Never invent numbers, metrics, tools, employers, dates, degrees, or achievements.
2. Every item in "suspicious_claims" must NOT appear in your output. If scope facts exist in "facts.scope_mentions", you may use those instead — otherwise write plain factual bullets with no fake metrics.
3. If a bullet has no metric, that is fine. A plain factual bullet beats a fake number.
4. Do not use first person (I, my, me, أنا, ني).

## HUMAN TONE
- Banned words/phrases: ${banned}
- Vary bullet openings — never start 3+ consecutive bullets with the same verb.
- Max one adjective per bullet. Max 2 lines per bullet.
- Write like a competent professional, not marketing copy.

## ATS RULES
- ${headers}
- Single column plain text. No tables, icons, emojis, or decorative characters.
- Dates: MMM YYYY when dates appear (keep existing dates as given if already formatted).
- Job titles must be standard market titles for the Gulf/Saudi market.
- Certification names in full official form; year separate when shown.

Facts JSON:
${JSON.stringify(factsJson, null, 2)}
`.trim();
}

export function buildImproveSummaryPrompt(cv: CVData, currentSummary: string, isAr: boolean): string {
  const factsJson = buildImproveFactsJson(cv, currentSummary);
  const targetRole = cv.personal?.title?.trim() || "";

  return `
${coreRules(isAr, targetRole, factsJson)}

## TASK — Professional Summary
Rewrite ONLY the professional summary using facts from the JSON (summary, experience, education, certifications, personal.title).

Requirements:
- Exactly 3-4 short lines maximum.
- Factual: mention degree/honors only if present, years of experience only if inferable from dates, top 2 relevant skills/tools from the JSON, and target role.
- No filler, no buzzwords, no invented metrics.
- Return ONLY the rewritten summary text. No headings, labels, or explanation.
`.trim();
}

export function buildImproveExperiencePrompt(
  cv: CVData,
  idx: number,
  currentDesc: string,
  isAr: boolean,
): string {
  const exp = cv.experience[idx];
  const factsJson = buildImproveFactsJson(cv, currentDesc);
  const targetRole = exp?.role?.trim() || cv.personal?.title?.trim() || "";

  return `
${coreRules(isAr, targetRole, factsJson)}

## TASK — Experience bullets for one role
Improve responsibilities/achievements for this role ONLY:

Job title: ${exp?.role || "Not provided"}
Company: ${exp?.company || "Not provided"}
Period: ${exp?.from || ""} – ${exp?.to || ""}

Current tasks and achievements:
${currentDesc || "No responsibilities provided."}

Requirements:
- 3-5 bullet points for this role only.
- Each bullet starts with a past-tense action verb (${isAr ? "Arabic past tense" : "English past tense"}).
- Preserve verified meaning; sharpen clarity and ATS keywords that already appear in the JSON.
- Mirror exact tool names from the JSON when they appear (e.g. Active Directory, Windows Server, Microsoft 365, TCP/IP, DNS, DHCP) — do not add tools not in the JSON.
- Return ONLY bullet lines, one per line, using "• " prefix. No headings or explanation.
`.trim();
}

export function buildImproveSkillsPrompt(cv: CVData, existingSkillsText: string, isAr: boolean): string {
  const factsJson = buildImproveFactsJson(cv, existingSkillsText);
  const targetRole = cv.personal?.title?.trim() || "";

  return `
${coreRules(isAr, targetRole, factsJson)}

## TASK — Skills list
Suggest skills grounded ONLY in the candidate's experience, education, certifications, and existing skills in the JSON.

Requirements:
- Return ONLY valid JSON (no markdown):
{
  "technical": ["tool or skill from JSON context only"],
  "professional": ["soft/professional skill supported by JSON"],
  "warnings": ["claims the candidate should verify before sending, in ${languageLabel(isAr)}"]
}
- 8-14 technical skills max; 4-8 professional skills max.
- Technical skills MUST repeat exact tool/product names mentioned in experience bullets when available.
- Do not duplicate skills already in the JSON skills array unless refining wording.
- Do not suggest unrelated skills.
- warnings: list any removed suspicious claims or anything the candidate must confirm; empty array if none.
`.trim();
}

export function parseSkillsImproveResponse(raw: string): {
  skills: string[];
  warnings: string[];
} {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(clean) as {
      technical?: string[];
      professional?: string[];
      warnings?: string[];
    };
    const technical = (parsed.technical ?? []).map(s => String(s).trim()).filter(Boolean);
    const professional = (parsed.professional ?? []).map(s => String(s).trim()).filter(Boolean);
    const warnings = (parsed.warnings ?? []).map(s => String(s).trim()).filter(Boolean);
    return { skills: uniqueStrings([...technical, ...professional]), warnings };
  } catch {
    const skills = clean
      .split("\n")
      .map(s => s.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(s => s.length > 1);
    return { skills, warnings: [] };
  }
}

export function buildPostImproveWarnings(
  output: string,
  factsJson: ImproveFactsJson,
  isAr: boolean,
): string[] {
  const warnings: string[] = [];
  const banned = isAr
    ? BANNED_AR.split("،").map(s => s.trim())
    : BANNED_EN.split(",").map(s => s.trim());

  for (const phrase of banned) {
    if (phrase && output.toLowerCase().includes(phrase.toLowerCase())) {
      warnings.push(
        isAr
          ? `تحقق: الناتج قد يحتوي عبارة ممنوعة "${phrase}".`
          : `Verify: output may contain banned phrase "${phrase}".`,
      );
    }
  }

  for (const claim of detectSuspiciousClaims(output)) {
    warnings.push(
      isAr
        ? `تحقق: الناتج يحتوي ادعاءً رقمياً قد يحتاج تأكيد: "${claim}".`
        : `Verify: output contains a numeric claim to confirm: "${claim}".`,
    );
  }

  if (factsJson.suspicious_claims.length) {
    warnings.push(
      isAr
        ? `تمت إزالة ادعاءات مشبوهة من المصدر: ${factsJson.suspicious_claims.join("؛ ")}`
        : `Removed suspicious source claims: ${factsJson.suspicious_claims.join("; ")}`,
    );
  }

  return uniqueStrings(warnings);
}

export function mergeImproveWarnings(...groups: string[][]): string[] {
  return uniqueStrings(groups.flat());
}
