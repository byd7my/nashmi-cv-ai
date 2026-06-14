export interface CVProjectItem {
  name: string;
  institution: string;
  year: string;
  bullets: string[];
}

export interface CVData {
  personal: { name: string; email: string; phone: string; city: string; title: string; linkedin: string; website: string };
  summary: string;
  experience: Array<{ company: string; role: string; from: string; to: string; desc: string }>;
  education: Array<{ school: string; degree: string; field: string; from: string; to: string; gpa: string; gpaScale: string; honors: string; showGpa: boolean }>;
  skills: string[];
  languages: Array<{ lang: string; level: string }>;
  certifications: Array<{ title: string; issuer: string; date: string }>;
  projects: { enabled: boolean; items: CVProjectItem[] };
}

const ACTION_VERBS = /\b(led|designed|built|shipped|launched|optimized|increased|reduced|developed|managed|created|implemented|delivered|improved|automated|architected|قاد|طور|صمم|أدار|أنجز|أطلق|حسّن|نفّذ|بنى|أنشأ)\b/i;

export function calcATS(cv: CVData): number {
  const personal = cv.personal || {};
  const exp = Array.isArray(cv.experience) ? cv.experience.filter(e => e && (e.company || e.role || e.desc)) : [];
  const edu = Array.isArray(cv.education)  ? cv.education.filter(e => e && (e.school || e.degree)) : [];
  const certs = Array.isArray(cv.certifications)
    ? cv.certifications.filter(c => c && (typeof c === "string" ? (c as string).trim() : (c.title || c.issuer)))
    : [];
  const skills = Array.isArray(cv.skills) ? cv.skills.filter(Boolean) : [];

  const allText = [
    cv.summary || "",
    ...exp.map(e => `${e.role||""} ${e.company||""} ${e.desc||""}`),
    ...edu.map(e => `${e.degree||""} ${e.field||""} ${e.school||""}`),
    skills.join(" "),
  ].join(" ").trim();
  const words = allText ? allText.split(/\s+/).length : 0;
  let wordScore = 0;
  if (words >= 300 && words <= 600) wordScore = 20;
  else if (words >= 200 && words < 300) wordScore = 14;
  else if (words > 600 && words <= 800) wordScore = 15;
  else if (words >= 100) wordScore = 8;
  else if (words > 0)    wordScore = 4;

  let sectionScore = 0;
  if ((cv.summary || "").trim().length >= 40) sectionScore += 5;
  if (exp.length >= 1)      sectionScore += 5;
  if (edu.length >= 1)      sectionScore += 5;
  if (skills.length >= 1)   sectionScore += 5;
  if (certs.length >= 1)    sectionScore += 5;

  const bulletItems = exp.map(x => x.desc || "").filter(Boolean);
  let bulletScore = 0;
  if (bulletItems.length) {
    const withBullets = bulletItems.filter(d => /[•\-–*]/.test(d) || d.split(/\n|\.\s/).length >= 2).length;
    const withVerbs   = bulletItems.filter(d => ACTION_VERBS.test(d)).length;
    bulletScore = Math.min(20, Math.round((withBullets / bulletItems.length) * 12 + (withVerbs / bulletItems.length) * 8));
  }

  let contactScore = 0;
  if (personal.email) contactScore += 5;
  if (personal.phone) contactScore += 5;
  if (personal.city)  contactScore += 5;

  let skillScore = 0;
  if (skills.length >= 5 && skills.length <= 8)        skillScore = 20;
  else if (skills.length >= 9 && skills.length <= 14)  skillScore = 17;
  else if (skills.length >= 3)                         skillScore = 12;
  else if (skills.length >= 1)                         skillScore = 6;

  const total = wordScore + sectionScore + bulletScore + contactScore + skillScore;
  return Math.max(0, Math.min(99, total));
}

export interface ATSMatchResult {
  score: number;
  matched: string[];
  missing: string[];
  total: number;
}

export function calcATSMatch(cv: CVData, jobDescription: string): ATSMatchResult {
  if (!jobDescription.trim()) return { score: 0, matched: [], missing: [], total: 0 };

  const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","can","need","dare","ought","used","able"]);

  const cvText = [
    cv.summary,
    ...cv.experience.map(e => `${e.role} ${e.company} ${e.desc}`),
    ...cv.skills,
    ...cv.education.map(e => `${e.degree} ${e.field} ${e.school}`),
    cv.personal.title,
  ].join(" ").toLowerCase();

  const jdWords = jobDescription.toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));

  const freq: Record<string, number> = {};
  for (const w of jdWords) {
    freq[w] = (freq[w] || 0) + 1;
  }

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  const matched = keywords.filter(kw => cvText.includes(kw));
  const missing = keywords.filter(kw => !cvText.includes(kw)).slice(0, 15);

  const score = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;

  return { score: Math.min(score, 99), matched, missing, total: keywords.length };
}
