import type { CVData } from "./ats";

export const INIT_CV: CVData = {
  personal: { name:"", email:"", phone:"", city:"", title:"", linkedin:"", website:"" },
  summary: "",
  experience: [{ company:"", role:"", from:"", to:"", desc:"" }],
  education:  [{ school:"", degree:"", field:"", from:"", to:"", gpa:"", gpaScale:"5", honors:"", showGpa:false }],
  skills: [],
  languages: [{ lang:"", level:"" }],
  certifications: [],
};

const SECTION_KEYS: Record<string, string[]> = {
  summary:        ["summary","profile","objective","about me","about","professional summary","الملخص","نبذة","نبذه","نبذة شخصية","الملف الشخصي","الهدف الوظيفي","عن"],
  experience:     ["experience","work experience","employment","work history","professional experience","career","الخبرة","الخبرات","الخبره","الخبرات العملية","الخبرات الوظيفية","الخبره العمليه","التاريخ الوظيفي"],
  education:      ["education","academic","qualifications","التعليم","المؤهلات","المؤهلات العلمية","الدراسة","التعليم الأكاديمي"],
  skills:         ["skills","technical skills","core skills","competencies","key skills","المهارات","المهارات التقنية","المهارات الشخصية","الكفاءات"],
  languages:      ["languages","language","اللغات","اللغة"],
  certifications: ["certifications","certificates","training","courses","licenses","certifications & training","الشهادات","الدورات","الشهادات والدورات","الدورات التدريبية","التدريب","التراخيص"],
};

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر";
const PRESENT = "present|current|now|till date|to date|ongoing|حتى الآن|حتى الان|الآن|الان|حالياً|حاليا|مستمر|إلى الآن|إلى الان";
const DATE_TOKEN = `(?:(?:${MONTHS})[\\s.\\-/]*\\d{2,4}|\\d{1,2}[\\s.\\-/]\\d{2,4}|\\d{4}|${PRESENT})`;
const DATE_RANGE = new RegExp(`(${DATE_TOKEN})\\s*(?:[-–—~to/الى إلى]+)\\s*(${DATE_TOKEN})`, "i");

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE   = /(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+)/i;
const DEGREE_RE = /\b(bachelor|master|phd|doctorate|diploma|associate|bsc|msc|ba|ma|mba|b\.?eng|m\.?eng|high school|secondary|بكالوريوس|ماجستير|دكتوراه|دبلوم|ثانوية|الثانوية|شهادة)\b/i;

function stripDiacritics(s: string) {
  return s.normalize("NFKD").replace(/[\u064B-\u0652\u0670]/g, "");
}
function normHeader(s: string) {
  return stripDiacritics(s).toLowerCase().replace(/[:：•·\-–—_*#]/g, "").replace(/\s+/g, " ").trim();
}
function detectSection(line: string): string | null {
  const cleaned = normHeader(line);
  if (!cleaned || cleaned.length > 60) return null;
  for (const [key, words] of Object.entries(SECTION_KEYS)) {
    for (const w of words) {
      if (cleaned === w || cleaned === w + " " || cleaned.startsWith(w + " ") || cleaned.endsWith(" " + w)) {
        if (cleaned.split(" ").length <= 5) return key;
      }
    }
  }
  return null;
}

function splitIntoSections(text: string): Record<string, string[]> {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const sections: Record<string, string[]> = { _header: [] };
  let current = "_header";
  for (const line of lines) {
    if (!line) { (sections[current] ||= []).push(""); continue; }
    const sec = detectSection(line);
    if (sec) { current = sec; sections[current] ||= []; continue; }
    (sections[current] ||= []).push(line);
  }
  for (const k of Object.keys(sections)) {
    const arr = sections[k];
    while (arr.length && !arr[0]) arr.shift();
    while (arr.length && !arr[arr.length - 1]) arr.pop();
  }
  return sections;
}

function parsePersonalAndSummary(headerLines: string[], summaryLines: string[]) {
  const all = headerLines.join("\n");
  const email = (all.match(EMAIL_RE) || [""])[0];
  const phone = (all.match(PHONE_RE) || [""])[0].trim();
  const url   = (all.match(URL_RE) || [""])[0];
  const linkedin = /linkedin\.com/i.test(url) ? url : "";
  const website  = linkedin ? "" : url;

  let name = "";
  let title = "";
  const candidates = headerLines.filter(l => l && !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !URL_RE.test(l));
  if (candidates.length) {
    name = candidates[0].replace(/[•|]/g, "").trim();
    for (let i = 1; i < Math.min(candidates.length, 4); i++) {
      const c = candidates[i].trim();
      const wc = c.split(/\s+/).length;
      if (wc >= 1 && wc <= 10 && !/\d/.test(c)) { title = c; break; }
    }
  }
  let city = "";
  for (const l of candidates.slice(0, 6)) {
    if (l !== name && l !== title && l.length < 60 && !/\d/.test(l) && /[,،]/.test(l)) { city = l; break; }
  }
  const summary = (summaryLines || []).join(" ").replace(/\s+/g, " ").trim();
  return { personal: { name, title, email, phone, city, linkedin, website }, summary };
}

function isDateLine(line: string) { return DATE_RANGE.test(line) || (new RegExp(DATE_TOKEN, "i").test(line) && line.length < 40); }

function dateToScore(s: string): number {
  if (!s) return 0;
  const t = String(s).toLowerCase().trim();
  if (new RegExp(PRESENT, "i").test(t)) return 999912;
  const monthMap: Record<string, number> = { jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12,
    "يناير":1,"فبراير":2,"مارس":3,"ابريل":4,"أبريل":4,"مايو":5,"يونيو":6,"يوليو":7,"اغسطس":8,"أغسطس":8,"سبتمبر":9,"اكتوبر":10,"أكتوبر":10,"نوفمبر":11,"ديسمبر":12 };
  const ym = t.match(/([a-zأ-ي]+)[\s.\-/]*(\d{4})/i);
  if (ym && monthMap[ym[1].toLowerCase()]) return parseInt(ym[2],10)*100 + monthMap[ym[1].toLowerCase()];
  const y = t.match(/\b(19|20)\d{2}\b/);
  if (y) return parseInt(y[0],10)*100 + 6;
  return 0;
}

function parseExperienceBlock(lines: string[]) {
  const entries: CVData["experience"] = [];
  let cur: CVData["experience"][0] | null = null;
  const push = () => { if (cur && (cur.role || cur.company || cur.desc)) entries.push(cur); cur = null; };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const dateMatch = line.match(DATE_RANGE);
    const looksHeader = !/^[•\-·*▪◦○]/.test(line) && line.length < 160;

    if (dateMatch && looksHeader) {
      push();
      cur = { role: "", company: "", from: dateMatch[1], to: dateMatch[2], desc: "" };
      const rest = line.replace(DATE_RANGE, "").replace(/[|•·]/g, " ").replace(/\s{2,}/g, " ").replace(/^[\s,،\-–—|]+|[\s,،\-–—|]+$/g, "").trim();
      const m = rest.match(/^(.+?)\s+(?:at|@|–|—|-|,|\||\bفي\b|\bلدى\b)\s+(.+)$/i);
      if (m) { cur.role = m[1].trim(); cur.company = m[2].trim(); }
      else if (rest) { cur.role = rest; }
      if (!cur.company && lines[i+1] && lines[i+1].length < 100 && !/^[•\-·*]/.test(lines[i+1]) && !isDateLine(lines[i+1])) {
        cur.company = lines[i+1].trim(); i++;
      }
      continue;
    }

    if (looksHeader && !cur && lines[i+1] && isDateLine(lines[i+1])) {
      const nextDate = lines[i+1].match(DATE_RANGE);
      cur = { role: line.trim(), company: "", from: nextDate ? nextDate[1] : "", to: nextDate ? nextDate[2] : "", desc: "" };
      i++;
      continue;
    }

    if (cur) {
      const clean = line.replace(/^[•\-·*▪◦○]\s*/, "").trim();
      if (clean) cur.desc = cur.desc ? cur.desc + "\n• " + clean : "• " + clean;
    }
  }
  push();
  entries.sort((a, b) => dateToScore(b.to) - dateToScore(a.to) || dateToScore(b.from) - dateToScore(a.from));
  return entries;
}

function parseEducationBlock(lines: string[]): CVData["education"] {
  const entries: CVData["education"] = [];
  let cur: CVData["education"][0] | null = null;
  const blank = (): CVData["education"][0] => ({ school:"", degree:"", field:"", from:"", to:"", gpa:"", gpaScale:"5", honors:"", showGpa:false });
  const push = () => { if (cur && (cur.school || cur.degree)) entries.push(cur!); cur = null; };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; if (!line) continue;
    const gpaM = line.match(/(?:gpa|cgpa|المعدل)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?/i);
    if (gpaM && cur) { cur.gpa = gpaM[1]; cur.gpaScale = gpaM[2] || cur.gpaScale; cur.showGpa = true; continue; }
    const dm = line.match(DATE_RANGE);
    const years = line.match(/\b(19|20)\d{2}\b/g);
    const hasDegree = DEGREE_RE.test(line);
    const startsEntry = dm || (years && years.length) || hasDegree;

    if (startsEntry) {
      if (cur && (cur.school || cur.degree)) push();
      if (!cur) cur = blank();
      if (dm) { cur.from = dm[1]; cur.to = dm[2]; }
      else if (years) { cur.from = years[0]; cur.to = years[1] || ""; }
      const rest = line.replace(DATE_RANGE, "").replace(/\b(19|20)\d{2}\b/g, "").replace(/[|•·]/g, " ").replace(/\s{2,}/g, " ").replace(/^[\s,،\-–—|]+|[\s,،\-–—|]+$/g, "").trim();
      if (rest) {
        const m = rest.match(/^(.+?)\s*[\-,،|]\s*(.+)$/);
        if (m) {
          const [, a, b] = m;
          if (DEGREE_RE.test(a)) { cur.degree = a.trim(); cur.school = b.trim(); }
          else if (DEGREE_RE.test(b)) { cur.degree = b.trim(); cur.school = a.trim(); }
          else { cur.degree = a.trim(); cur.school = b.trim(); }
        } else if (DEGREE_RE.test(rest)) cur.degree = rest;
        else if (!cur.school) cur.school = rest;
        else if (!cur.field) cur.field = rest;
      }
      continue;
    }

    if (!cur) cur = blank();
    if (DEGREE_RE.test(line) && !cur.degree) cur.degree = line.trim();
    else if (!cur.school) cur.school = line.trim();
    else if (!cur.field) cur.field = line.trim();
    else cur.field += " " + line.trim();
  }
  push();
  entries.sort((a, b) => dateToScore(b.to) - dateToScore(a.to) || dateToScore(b.from) - dateToScore(a.from));
  return entries;
}

function parseSkillsBlock(lines: string[]): string[] {
  const raw = lines.join(",").replace(/[•·▪◦○*\-|]/g, ",");
  return raw.split(/[,،;:\n]+/).map(s => s.trim()).filter(s => s && s.length < 50);
}

function parseLanguagesBlock(lines: string[]): CVData["languages"] {
  const out: CVData["languages"] = [];
  const LEVELS = /native|fluent|professional|intermediate|beginner|advanced|basic|mother tongue|لغة أم|طلاقة|احترافي|متوسط|مبتدئ|متقدم/i;
  for (const raw of lines) {
    if (!raw) continue;
    const parts = raw.split(/[,،|\/]+/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^([^(]+)\s*(?:\(([^)]+)\))?$/);
      if (!m) continue;
      const lang = m[1].replace(LEVELS, "").trim();
      const level = m[2]?.trim() || (LEVELS.test(m[1]) ? m[1].match(LEVELS)![0] : "");
      if (lang && lang.length < 30) out.push({ lang, level });
    }
  }
  return out.length ? out : [{ lang: "", level: "" }];
}

function parseCertificationsBlock(lines: string[]): CVData["certifications"] {
  const out: CVData["certifications"] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const dateMatch = line.match(DATE_RANGE) || line.match(/\b(19|20)\d{2}\b/);
    const date = dateMatch ? dateMatch[0] : "";
    const title = line.replace(date, "").replace(/[|•·\-]/g, " ").trim();
    if (title) out.push({ title, issuer: "", date });
  }
  return out;
}

export function localParseCV(text: string): Partial<CVData> {
  const sections = splitIntoSections(text);
  const { personal, summary } = parsePersonalAndSummary(sections._header || [], sections.summary || []);

  const experience = sections.experience ? parseExperienceBlock(sections.experience) : INIT_CV.experience;
  const education = sections.education ? parseEducationBlock(sections.education) : INIT_CV.education;
  const skills = sections.skills ? parseSkillsBlock(sections.skills) : [];
  const languages = sections.languages ? parseLanguagesBlock(sections.languages) : INIT_CV.languages;
  const certifications = sections.certifications ? parseCertificationsBlock(sections.certifications) : [];

  return { personal, summary, experience, education, skills, languages, certifications };
}

export function normalizeParsedCV(parsed: unknown): CVData {
  const safe = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const p = (safe.personal || {}) as Record<string, string>;
  const personal = {
    ...INIT_CV.personal,
    name:     ((p.name     || "")).trim(),
    title:    ((p.title    || p.jobTitle || "")).trim(),
    email:    ((p.email    || "")).trim(),
    phone:    ((p.phone    || "")).trim(),
    city:     ((p.city     || p.location || "")).trim(),
    linkedin: ((p.linkedin || "")).trim(),
    website:  ((p.website  || "")).trim(),
  };

  const experience = Array.isArray(safe.experience) && (safe.experience as unknown[]).length
    ? (safe.experience as Record<string, string>[]).map(e => ({
        role:    (e?.role    || e?.title || e?.position || "").trim(),
        company: (e?.company || e?.employer || "").trim(),
        from:    (e?.from    || e?.startDate || e?.start || "").trim(),
        to:      (e?.to      || e?.endDate   || e?.end   || "").trim(),
        desc:    (e?.desc    || e?.summary   || e?.description || "").trim(),
      }))
    : INIT_CV.experience;

  const education = Array.isArray(safe.education) && (safe.education as unknown[]).length
    ? (safe.education as Record<string, string>[]).map(ed => ({
        school: (ed?.school || ed?.institution || "").trim(),
        degree: (ed?.degree || "").trim(),
        field:  (ed?.field  || ed?.major || "").trim(),
        from:   (ed?.from   || ed?.startDate || "").trim(),
        to:     (ed?.to     || ed?.endDate   || "").trim(),
        gpa: "", gpaScale: "5", honors: "", showGpa: false,
      }))
    : INIT_CV.education;

  const skills = Array.isArray(safe.skills)
    ? (safe.skills as (string | Record<string, string>)[]).map(s => (typeof s === "string" ? s : s?.name || "")).filter(Boolean)
    : [];

  const languages = Array.isArray(safe.languages) && (safe.languages as unknown[]).length
    ? (safe.languages as Record<string, string>[]).map(l => ({
        lang:  (l?.lang  || l?.name || l?.language || "").trim(),
        level: (l?.level || l?.proficiency || "Intermediate").trim(),
      }))
    : INIT_CV.languages;

  const certifications = Array.isArray(safe.certifications)
    ? (safe.certifications as (string | Record<string, string>)[]).map(c => typeof c === "string"
        ? { title: c, issuer: "", date: "" }
        : {
            title:  (c?.title  || c?.name || "").trim(),
            issuer: (c?.issuer || c?.provider || c?.organization || "").trim(),
            date:   (c?.date   || c?.issueDate || "").trim(),
          })
    : [];

  return { personal, summary: (safe.summary as string || "").trim(), experience, education, skills, languages, certifications };
}

export function smartCategorize(cv: CVData): CVData {
  if (!cv || typeof cv !== "object") return cv;
  const haystack = [cv.summary || "", ...(Array.isArray(cv.experience) ? cv.experience.map(e => e?.desc || "") : [])].join("\n");
  if (!haystack.trim()) return cv;

  const gpaRx = /(?:GPA|المعدل|gpa)\s*[:：]?\s*([0-5](?:\.\d{1,2})?|[0-9]{2,3}(?:\.\d{1,2})?)\s*(?:\/|\s*(?:من|out of)\s*)?\s*(4|5|100)?/i;
  const bareRx = /\b([0-5]\.\d{1,2})\s*\/\s*(4|5)\b/;
  const honorsRx = /(magna cum laude|summa cum laude|cum laude|with honou?rs?|first[- ]class|distinction|مرتبة الشرف(?:\s*(?:الأولى|الثانية))?)/i;

  let detectedGpa: string | null = null, detectedScale: string | null = null, detectedHonors: string | null = null;
  const m1 = haystack.match(gpaRx);
  if (m1) { detectedGpa = m1[1]; detectedScale = m1[2] || null; }
  if (!detectedGpa) { const m2 = haystack.match(bareRx); if (m2) { detectedGpa = m2[1]; detectedScale = m2[2]; } }
  const mh = haystack.match(honorsRx);
  if (mh) detectedHonors = mh[1];
  if (!detectedGpa && !detectedHonors) return cv;

  const edu = Array.isArray(cv.education) && cv.education.length ? [...cv.education] : [{ school:"", degree:"", field:"", from:"", to:"", gpa:"", gpaScale:"5", honors:"", showGpa:false }];
  const e0 = { ...edu[0] };
  if (detectedGpa && !e0.gpa) { e0.gpa = detectedGpa; e0.showGpa = true; if (detectedScale) e0.gpaScale = detectedScale; else if (!e0.gpaScale) e0.gpaScale = parseFloat(detectedGpa) > 4 ? "5" : "4"; }
  if (detectedHonors && !e0.honors) e0.honors = detectedHonors;
  edu[0] = e0;
  return { ...cv, education: edu };
}

async function loadPdfJs(): Promise<typeof window> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  // Use unpkg which is more reliable than cdnjs for CORS
  const CDN = "https://unpkg.com/pdfjs-dist@3.11.174/build";
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${CDN}/pdf.min.js`;
    s.onload = () => resolve();
    s.onerror = () => {
      // fallback: cdnjs
      const s2 = document.createElement("script");
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s2.onload = () => resolve();
      s2.onerror = () => reject(new Error("Failed to load pdf.js"));
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  });
  // Point worker to same CDN to avoid CORS
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  return (window as any).pdfjsLib;
}

async function loadMammoth(): Promise<any> {
  if ((window as any).mammoth) return (window as any).mammoth;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load mammoth.js"));
    document.head.appendChild(s);
  });
  return (window as any).mammoth;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter((i: any) => i.str && i.str.trim().length);
    items.sort((a: any, b: any) => { const dy = b.transform[5] - a.transform[5]; if (Math.abs(dy) > 2) return dy; return a.transform[4] - b.transform[4]; });
    let lastY: number | null = null; let line = ""; const lines: string[] = [];
    for (const item of items as any[]) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 4) { if (line.trim()) lines.push(line.trim()); line = ""; if (Math.abs(y - lastY) > 14) lines.push(""); }
      line += item.str + " "; lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pageTexts.push(lines.join("\n"));
  }
  return pageTexts.join("\n\n");
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result?.value || "").trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf")  || type === "application/pdf")  return extractTextFromPDF(file);
  if (name.endsWith(".docx") || type.includes("officedocument.wordprocessingml")) return extractTextFromDOCX(file);
  if (name.endsWith(".txt")  || type.startsWith("text/"))    return (await file.text()).trim();
  try { return await extractTextFromPDF(file); } catch {}
  return extractTextFromDOCX(file);
}

export function isResumeJsonFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".json") || file.type === "application/json";
}

export function isPdfFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf") || file.type === "application/pdf";
}

export type NashmiJsonImport = {
  cv: CVData;
  activeLang?: "ar" | "en";
  bilingual?: Partial<Record<"ar" | "en", CVData>>;
};

export async function parseResumeJsonFile(file: File): Promise<NashmiJsonImport> {
  const raw = await file.text();
  if (!raw.trim()) throw new Error("EMPTY_FILE");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (typeof parsed !== "object" || parsed === null) throw new Error("INVALID_JSON");

  const doc = parsed as Record<string, unknown>;
  const activeLang = doc.lang === "ar" || doc.lang === "en" ? doc.lang : undefined;

  let bilingual: Partial<Record<"ar" | "en", CVData>> | undefined;
  if (doc.bilingual && typeof doc.bilingual === "object" && doc.bilingual !== null) {
    const src = doc.bilingual as Record<string, unknown>;
    bilingual = {};
    if (src.ar && typeof src.ar === "object") bilingual.ar = normalizeParsedCV(src.ar as CVData);
    if (src.en && typeof src.en === "object") bilingual.en = normalizeParsedCV(src.en as CVData);
    if (!bilingual.ar && !bilingual.en) bilingual = undefined;
  }

  let cvRaw: unknown;
  if (doc._nashmi && doc.cv) cvRaw = doc.cv;
  else if (doc.personal || doc.summary || doc.experience) cvRaw = doc;
  else if (bilingual?.ar) cvRaw = bilingual.ar;
  else if (bilingual?.en) cvRaw = bilingual.en;
  else throw new Error("NOT_RESUME");

  return {
    cv: normalizeParsedCV(cvRaw as CVData),
    activeLang,
    bilingual,
  };
}

export function describeImportError(err: unknown, isAr: boolean): string {
  const code = err instanceof Error ? err.message : String(err);
  switch (code) {
    case "PDF_IMAGE_ONLY":
      return isAr
        ? "هذا PDF صورة فقط (قديم أو ممسوح ضوئياً) ولا يمكن استيراده. استخدم Word/TXT أو JSON، أو صدّر من نشمي بالنسخة الجديدة (PDF نصي متوافق ATS)."
        : "This PDF is image-only (old or scanned) and cannot be imported. Use Word/TXT or JSON, or export again from Nashmi (new ATS text PDF).";
    case "EMPTY_FILE":
    case "Could not extract text from file":
      return isAr ? "تعذر قراءة محتوى الملف" : "Could not extract text from file";
    case "INVALID_JSON":
      return isAr ? "ملف JSON غير صالح" : "Invalid JSON file";
    case "NOT_RESUME":
      return isAr ? "الملف لا يبدو كسيرة نشمي" : "File does not look like a Nashmi resume";
    default:
      return code;
  }
}

export function persistBilingualImport(bilingual?: Partial<Record<"ar" | "en", CVData>>): void {
  if (!bilingual) return;
  for (const lang of ["ar", "en"] as const) {
    if (!bilingual[lang]) continue;
    try {
      window.localStorage.setItem(
        lang === "ar" ? "nashmi-cv-draft-ar" : "nashmi-cv-draft-en",
        JSON.stringify(bilingual[lang]),
      );
    } catch { /* ignore */ }
  }
}

export const EN_HEADERS = { summary:"SUMMARY", experience:"EXPERIENCE", education:"EDUCATION", skills:"SKILLS", languages:"LANGUAGES", certifications:"CERTIFICATIONS & TRAINING" };
export const AR_HEADERS = { summary:"الملخص", experience:"الخبرة", education:"التعليم", skills:"المهارات", languages:"اللغات", certifications:"الشهادات والدورات" };
export const FIXED_SECTIONS = ["summary", "experience", "education", "skills", "languages"];
export const LANG_LEVELS = [
  { en: "Native", ar: "لغة أم" }, { en: "Fluent", ar: "طلاقة" }, { en: "Professional", ar: "احترافي" },
  { en: "Intermediate", ar: "متوسط" }, { en: "Beginner", ar: "مبتدئ" },
];
export const DEGREE_LEVELS = [
  { en: "Primary School", ar: "المرحلة الابتدائية" }, { en: "Middle School", ar: "المرحلة المتوسطة" },
  { en: "High School", ar: "المرحلة الثانوية" }, { en: "Diploma", ar: "دبلوم" },
  { en: "Bachelor's", ar: "بكالوريوس" }, { en: "Master's", ar: "ماجستير" },
  { en: "PhD", ar: "دكتوراه" }, { en: "Professor", ar: "أستاذ" },
];

export const HONORS_OPTIONS = [
  { en: "First Class Honors", ar: "مرتبة الشرف الأولى" },
  { en: "Second Class Honors", ar: "مرتبة الشرف الثانية" },
];

export const LANGUAGE_OPTIONS = [
  { en: "Arabic", ar: "العربية" },
  { en: "English", ar: "الإنجليزية" },
  { en: "French", ar: "الفرنسية" },
  { en: "Spanish", ar: "الإسبانية" },
  { en: "German", ar: "الألمانية" },
  { en: "Italian", ar: "الإيطالية" },
  { en: "Turkish", ar: "التركية" },
  { en: "Russian", ar: "الروسية" },
  { en: "Chinese", ar: "الصينية" },
  { en: "Japanese", ar: "اليابانية" },
  { en: "Korean", ar: "الكورية" },
  { en: "Hindi", ar: "الهندية" },
  { en: "Urdu", ar: "الأردية" },
  { en: "Persian", ar: "الفارسية" },
  { en: "Portuguese", ar: "البرتغالية" },
  { en: "Dutch", ar: "الهولندية" },
];
