import jsPDF from "jspdf";
import { ArabicShaper } from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";
import type { CVData } from "@/nashmi/lib/ats";
import { AR_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CvTemplateId } from "@/nashmi/lib/cv-templates";

/** A4 in points (reference PDF). */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const X_LEFT = 51.4;
const X_RIGHT = 543.9;
const CONTENT_W = 492.5;
const X_INDENT = 57.4;
const X_BULLET = 53.4;
const X_BULLET_WRAP = 61.4;
const BULLET_MAX_W = 490;
const X_DATE = 496.2;
const X_YEAR = 420.6;
const X_SKILL_LABEL = 57.4;
const X_SKILL_VALUE = 153.2;
const SKILL_VALUE_W = X_RIGHT - X_SKILL_VALUE;
const X_CERT_L = 57.4;
const X_CERT_R = 309.6;
const CERT_L_W = 295 - X_CERT_L;
const CERT_R_W = X_RIGHT - X_CERT_R;
const Y_TOP = 38;
const PAGE_BOTTOM = PAGE_H - 38;
const BLACK: [number, number, number] = [0, 0, 0];
const RULE_W = 0.6;
const MIN_FONT = 7;
const MIN_LINE_H = 9;

const EN_SECTION = {
  summary: "PROFESSIONAL SUMMARY",
  experience: "WORK EXPERIENCE",
  skills: "TECHNICAL SKILLS",
  education: "EDUCATION",
  certifications: "CERTIFICATIONS",
  graduation: "GRADUATION PROJECT",
} as const;

const AMIRI_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-400-normal.ttf";
const AMIRI_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-700-normal.ttf";

let arabicFontsLoaded = false;
const bidi = bidiFactory();

type Scale = { fontDelta: number; lineH: number; gapMul: number };

const BASE_LINE_H = 11;

type Sizes = {
  name: number;
  title: number;
  contact: number;
  section: number;
  label: number;
  body: number;
};

function buildSizes(delta: number): Sizes {
  const s = (n: number) => Math.max(MIN_FONT, Math.round((n - delta) * 2) / 2);
  return {
    name: s(19),
    title: s(9.5),
    contact: s(8),
    section: s(9),
    label: s(8),
    body: s(8),
  };
}

async function loadBinaryFont(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ensureArabicFonts(doc: jsPDF): Promise<void> {
  if (arabicFontsLoaded) return;
  const [regular, bold] = await Promise.all([
    loadBinaryFont(AMIRI_REGULAR),
    loadBinaryFont(AMIRI_BOLD),
  ]);
  doc.addFileToVFS("Amiri-Regular.ttf", regular);
  doc.addFileToVFS("Amiri-Bold.ttf", bold);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.addFont("Amiri-Bold.ttf", "Amiri", "bold");
  arabicFontsLoaded = true;
}

function sanitizeLatin(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2022\u2023\u2043\u2219\u00B7\u2027\u25CF\u25E6]/g, ", ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u2013]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAr(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Arabic: reshape → bidi visual order for jsPDF + Amiri. */
function prepareArabicPdfText(text: string): string {
  const clean = sanitizeAr(text);
  if (!clean) return "";
  if (!/[\u0600-\u06FF]/.test(clean)) return clean;
  const shaped = ArabicShaper.convertArabic(clean);
  const levels = bidi.getEmbeddingLevels(shaped);
  return bidi.getReorderedString(shaped, levels);
}

function prepareExportText(text: string, isAr: boolean, preserveNewlines = false): string {
  if (!isAr) return sanitizeLatin(text);
  if (!preserveNewlines) return prepareArabicPdfText(text);
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^[\s•\-–—]+/, "").trim())
    .filter(Boolean)
    .map((line) => (/[\u0600-\u06FF]/.test(line) ? prepareArabicPdfText(line) : line))
    .join("\n");
}

function formatDateRange(from: string, to: string, latin: boolean): string {
  const f = latin ? sanitizeLatin(from) : sanitizeAr(from);
  const t = latin ? sanitizeLatin(to) : sanitizeAr(to);
  if (f && t) return `${f} – ${t}`;
  return f || t || "";
}

function isGraduationProject(e: CVData["experience"][number]): boolean {
  const hay = `${e.role} ${e.company} ${e.desc}`.toLowerCase();
  return /graduation\s*project|senior\s*project|final\s*project|capstone|مشروع\s*التخرج|مشروع\s*تخرج/.test(
    hay,
  );
}

function splitExperience(cv: CVData) {
  const all = (cv.experience || []).filter((e) => e.role?.trim() || e.company?.trim() || e.desc?.trim());
  const graduation = all.filter(isGraduationProject);
  const work = all.filter((e) => !isGraduationProject(e));
  return { work, graduation };
}

type SkillRow = { label: string; text: string };

const SKILL_CATEGORY_RULES: { label: string; re: RegExp }[] = [
  {
    label: "Help Desk / Systems",
    re: /help\s*desk|service\s*desk|itsm|ticket|troubleshoot|support|remote\s*assist|incident|onboarding|offboarding/i,
  },
  {
    label: "Networking",
    re: /network|lan|wan|dns|dhcp|vpn|firewall|routing|switch|cisco|tcp|ip\b|wi[\s-]?fi|wireless/i,
  },
  {
    label: "Soft Skills",
    re: /communication|team|leadership|problem|customer|collabor|interpersonal|time\s*management/i,
  },
  {
    label: "Hardware",
    re: /hardware|repair|maintenance|assembly|peripheral|printer|device\s*repair/i,
  },
  {
    label: "Systems",
    re: /windows|linux|server|active\s*directory|microsoft\s*365|office\s*365|vmware|virtual|backup|cloud|azure|powershell|script/i,
  },
];

function buildSkillRows(cv: CVData, latin: boolean): SkillRow[] {
  const clean = (s: string) => (latin ? sanitizeLatin(s) : sanitizeAr(s));
  const buckets = new Map<string, string[]>();
  const add = (label: string, item: string) => {
    const v = clean(item);
    if (!v) return;
    const list = buckets.get(label) ?? [];
    if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
    buckets.set(label, list);
  };

  for (const raw of cv.skills || []) {
    const skill = clean(raw);
    if (!skill) continue;
    const colon = skill.match(/^([^:]{3,40}):\s*(.+)$/);
    if (colon) {
      add(colon[1].trim(), colon[2].trim());
      continue;
    }
    let matched = false;
    for (const rule of SKILL_CATEGORY_RULES) {
      if (rule.re.test(skill)) {
        add(rule.label, skill);
        matched = true;
        break;
      }
    }
    if (!matched) add("Systems", skill);
  }

  const langs = (cv.languages || [])
    .filter((l) => clean(l.lang))
    .map((l) => {
      const lang = clean(l.lang);
      const level = clean(l.level);
      return level ? `${lang} (${level})` : lang;
    });
  if (langs.length) add("Languages", langs.join(", "));

  const order = [
    "Help Desk / Systems",
    "Networking",
    "Soft Skills",
    "Hardware",
    "Systems",
    "Languages",
  ];
  return order
    .filter((label) => buckets.has(label))
    .map((label) => ({ label, text: (buckets.get(label) ?? []).join(", ") }));
}

function buildContact(cv: CVData, latin: boolean): string {
  const c = (s: string) => (latin ? sanitizeLatin(s) : sanitizeAr(s));
  return [c(cv.personal.phone), c(cv.personal.email), c(cv.personal.city), c(cv.personal.linkedin)]
    .filter(Boolean)
    .join(" | ");
}

function formatCertLine(c: CVData["certifications"][number], latin: boolean): string {
  const title = latin ? sanitizeLatin(c.title) : sanitizeAr(c.title);
  const issuer = latin ? sanitizeLatin(c.issuer) : sanitizeAr(c.issuer);
  const date = latin ? sanitizeLatin(c.date) : sanitizeAr(c.date);
  const name = title && issuer && !title.toLowerCase().includes(issuer.toLowerCase())
    ? `${title} | ${issuer}`
    : title || issuer;
  return date ? `- ${name} ${date}` : `- ${name}`;
}

class ClassicAtsPdfWriter {
  private y = Y_TOP;

  constructor(
    private readonly doc: jsPDF,
    private readonly isAr: boolean,
    private readonly sizes: Sizes,
    private readonly scale: Scale,
  ) {}

  get bottomY(): number {
    return this.y;
  }

  private gap(n: number): number {
    return n * this.scale.gapMul;
  }

  private lh(): number {
    return Math.max(MIN_LINE_H, this.scale.lineH);
  }

  private prep(text: string, preserveNewlines = false): string {
    return prepareExportText(text, this.isAr, preserveNewlines);
  }

  private setFont(bold: boolean, size: number) {
    this.doc.setTextColor(...BLACK);
    if (this.isAr) {
      this.doc.setFont("Amiri", bold ? "bold" : "normal");
    } else {
      this.doc.setFont("helvetica", bold ? "bold" : "normal");
    }
    this.doc.setFontSize(size);
  }

  private split(text: string, maxW: number): string[] {
    if (!text) return [];
    const lines = this.doc.splitTextToSize(text, maxW) as string[];
    return lines.length ? lines : [text];
  }

  private drawRule() {
    this.doc.setDrawColor(...BLACK);
    this.doc.setLineWidth(RULE_W);
    this.doc.line(X_LEFT, this.y, X_RIGHT, this.y);
  }

  private writeAt(
    text: string,
    x: number,
    size: number,
    align: "left" | "center" | "right",
    bold = false,
  ) {
    const t = this.prep(text);
    if (!t) return;
    this.setFont(bold, size);
    const lines = this.split(t, CONTENT_W);
    for (const line of lines) {
      this.doc.text(line, x, this.y, { align });
      this.y += this.lh();
    }
  }

  private writeCenter(text: string, size: number, bold = false) {
    this.writeAt(text, PAGE_W / 2, size, "center", bold);
  }

  private writeSection(title: string) {
    this.y += this.gap(6);
    const label = this.isAr ? title : title.toUpperCase();
    this.writeAt(label, this.isAr ? X_RIGHT : X_LEFT, this.sizes.section, this.isAr ? "right" : "left", true);
    this.drawRule();
    this.y += this.gap(5);
  }

  private writeBody(text: string, x = X_LEFT, maxW = CONTENT_W) {
    const t = this.prep(text);
    if (!t) return;
    this.setFont(false, this.sizes.body);
    const lines = this.split(t, maxW);
    const align = this.isAr ? "right" : "left";
    const ax = this.isAr ? X_RIGHT : x;
    for (const line of lines) {
      this.doc.text(line, ax, this.y, { align });
      this.y += this.lh();
    }
    this.y += this.gap(2);
  }

  private writeSplitRow(primary: string, secondary: string, primaryX: number, secondaryX: number, boldPrimary = true) {
    const p = this.prep(primary);
    const s = this.prep(secondary);
    if (!p && !s) return;

    if (this.isAr) {
      if (p) {
        this.setFont(boldPrimary, this.sizes.body);
        this.doc.text(p, X_RIGHT, this.y, { align: "right" });
      }
      if (s) {
        this.setFont(false, this.sizes.body);
        this.doc.text(s, X_LEFT, this.y, { align: "left" });
      }
    } else {
      if (p) {
        this.setFont(boldPrimary, this.sizes.body);
        this.doc.text(p, primaryX, this.y, { align: "left" });
      }
      if (s) {
        this.setFont(false, this.sizes.body);
        this.doc.text(s, secondaryX, this.y, { align: "right" });
      }
    }
    this.y += this.lh() + this.gap(1);
  }

  private writeBullets(raw: string) {
    const linesIn = raw
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.replace(/^[\s•\-–—]+/, "").trim())
      .filter(Boolean);

    for (const body of linesIn) {
      const line = this.prep(body);
      if (!line) continue;
      const wrapped = this.split(`- ${line}`, BULLET_MAX_W);
      this.setFont(false, this.sizes.body);
      wrapped.forEach((line, idx) => {
        const x = this.isAr ? X_RIGHT : idx === 0 ? X_BULLET : X_BULLET_WRAP;
        const align = this.isAr ? "right" : "left";
        this.doc.text(line, x, this.y, { align });
        this.y += this.lh();
      });
      this.y += this.gap(0.5);
    }
    this.y += this.gap(1);
  }

  private writeSkillRow(label: string, value: string) {
    const l = this.isAr ? sanitizeAr(label) : sanitizeLatin(label);
    const v = this.prep(value);
    if (!l || !v) return;

    const labelLines = this.split(l, X_SKILL_VALUE - X_SKILL_LABEL - 4);
    const valueLines = this.split(v, SKILL_VALUE_W);
    const rows = Math.max(labelLines.length, valueLines.length);

    for (let i = 0; i < rows; i += 1) {
      if (labelLines[i]) {
        this.setFont(true, this.sizes.label);
        this.doc.text(
          labelLines[i],
          this.isAr ? X_RIGHT : X_SKILL_LABEL,
          this.y,
          { align: this.isAr ? "right" : "left" },
        );
      }
      if (valueLines[i]) {
        this.setFont(false, this.sizes.body);
        this.doc.text(
          valueLines[i],
          this.isAr ? X_LEFT : X_SKILL_VALUE,
          this.y,
          { align: this.isAr ? "left" : "left" },
        );
      }
      this.y += this.lh();
    }
    this.y += this.gap(0.5);
  }

  private writeCertColumns(certs: CVData["certifications"]) {
    const lines = certs.map((c) => formatCertLine(c, !this.isAr));
    const mid = Math.ceil(lines.length / 2);
    const left = lines.slice(0, mid);
    const right = lines.slice(mid);
    const rows = Math.max(left.length, right.length);

    for (let i = 0; i < rows; i += 1) {
      this.setFont(false, this.sizes.body);
      if (left[i]) {
        const lLines = this.split(left[i], CERT_L_W);
        this.doc.text(
          lLines[0],
          this.isAr ? X_RIGHT : X_CERT_L,
          this.y,
          { align: this.isAr ? "right" : "left" },
        );
      }
      if (right[i]) {
        const rLines = this.split(right[i], CERT_R_W);
        this.doc.text(
          rLines[0],
          this.isAr ? X_LEFT : X_CERT_R,
          this.y,
          { align: this.isAr ? "left" : "left" },
        );
      }
      this.y += this.lh();
    }
    this.y += this.gap(2);
  }

  writeHeader(cv: CVData) {
    const name = cv.personal.name || (this.isAr ? "الاسم الكامل" : "Full Name");
    this.y = Y_TOP;
    this.writeCenter(name, this.sizes.name, true);

    if (cv.personal.title) {
      this.y = 60;
      this.writeCenter(cv.personal.title, this.sizes.title);
    } else {
      this.y = 60;
    }

    const contact = buildContact(cv, !this.isAr);
    if (contact) {
      this.y = 74;
      this.writeCenter(contact, this.sizes.contact);
    } else {
      this.y = 74;
    }

    this.y += this.gap(12);
    this.drawRule();
    this.y += this.gap(8);
  }

  render(cv: CVData) {
    const H = AR_HEADERS;
    this.writeHeader(cv);

    if (this.prep(cv.summary)) {
      this.writeSection(this.isAr ? H.summary : EN_SECTION.summary);
      this.writeBody(cv.summary);
    }

    const { work, graduation } = splitExperience(cv);

    if (work.length) {
      this.writeSection(this.isAr ? H.experience : EN_SECTION.experience);
      for (const e of work) {
        this.writeSplitRow(e.role, formatDateRange(e.from, e.to, !this.isAr), X_INDENT, X_DATE, true);
        if (e.company.trim()) this.writeBody(e.company, X_LEFT);
        if (e.desc.trim()) this.writeBullets(e.desc);
        this.y += this.gap(2);
      }
    }

    const skillRows = buildSkillRows(cv, !this.isAr);
    if (skillRows.length) {
      this.writeSection(this.isAr ? H.skills : EN_SECTION.skills);
      for (const row of skillRows) this.writeSkillRow(row.label, row.text);
      this.y += this.gap(2);
    }

    const education = (cv.education || []).filter((e) => e.school?.trim() || e.degree?.trim());
    if (education.length) {
      this.writeSection(this.isAr ? H.education : EN_SECTION.education);
      for (const e of education) {
        const degree = [e.degree, e.field].filter(Boolean).join(this.isAr ? " - " : " in ");
        const year = e.to || e.from;
        this.writeSplitRow(degree, year, X_INDENT, X_YEAR, true);
        const instParts = [e.school].filter(Boolean);
        if (e.showGpa && e.gpa) {
          instParts.push(
            `${this.isAr ? "المعدل" : "GPA"}: ${this.prep(e.gpa)}${e.gpaScale ? `/${this.prep(e.gpaScale)}` : ""}`,
          );
        }
        if (e.honors) {
          instParts.push(`${this.isAr ? "مرتبة الشرف" : "Honors"}: ${this.prep(e.honors)}`);
        }
        this.writeBody(instParts.join(" | "));
      }
    }

    const certs = (cv.certifications || []).filter((c) => c.title?.trim() || c.issuer?.trim() || c.date?.trim());
    if (certs.length) {
      this.writeSection(this.isAr ? H.certifications : EN_SECTION.certifications);
      this.writeCertColumns(certs);
    }

    if (graduation.length) {
      this.writeSection(this.isAr ? "مشروع التخرج" : EN_SECTION.graduation);
      for (const e of graduation) {
        const instYear = [e.company, formatDateRange(e.from, e.to, !this.isAr)].filter(Boolean).join(" – ");
        this.writeSplitRow(e.role, instYear, X_INDENT, X_YEAR, true);
        if (e.desc.trim()) this.writeBullets(e.desc);
        this.y += this.gap(2);
      }
    }
  }
}

function renderClassicPdf(doc: jsPDF, cv: CVData, isAr: boolean, scale: Scale): number {
  const w = new ClassicAtsPdfWriter(doc, isAr, buildSizes(scale.fontDelta), scale);
  w.render(cv);
  return w.bottomY;
}

// ── Professional template (distinct PDF layout) ─────────────────────────────

const PRO_HEADER_RULE = 0.8;
const PRO_SECTION_RULE = 0.6;
const PRO_SUMMARY_W = 492;
const PRO_BULLET_X = 65;
const PRO_BULLET_WRAP = 75;
const PRO_BULLET_W = X_RIGHT - PRO_BULLET_WRAP;
const PRO_SKILL_LABEL_X = 57;
const PRO_SKILL_LABEL_W = 90;
const PRO_SKILL_VALUE_X = 153;
const PRO_SKILL_VALUE_W = 340;

const PRO_EN = {
  summary: "SUMMARY",
  experience: "EXPERIENCE",
  education: "EDUCATION",
  other: "OTHER",
  certs: "Certifications & Courses:",
  projects: "Projects:",
  tech: "Technical Skills:",
  soft: "Soft Skills",
  languages: "Languages:",
} as const;

const TECHNICAL_KEYWORDS = [
  "windows", "linux", "cisco", "network", "server", "active directory",
  "microsoft", "tcp", "ip", "dns", "dhcp", "vpn", "routing", "switching",
  "python", "javascript", "sql", "html", "css", "react", "node",
  "aws", "azure", "docker", "git", "solidworks", "autocad", "cad", "cam",
  "matlab", "arduino", "iot", "troubleshoot", "hardware", "software",
  "database", "programming", "coding", "design", "analysis",
];

type ProSizes = {
  name: number;
  title: number;
  contact: number;
  section: number;
  summary: number;
  head: number;
  body: number;
};

function buildProfessionalSizes(delta: number): ProSizes {
  const s = (n: number) => Math.max(MIN_FONT, Math.round((n - delta) * 2) / 2);
  return {
    name: s(20),
    title: s(11),
    contact: s(9),
    section: s(10),
    summary: s(9),
    head: s(10),
    body: s(9),
  };
}

function splitProfessionalSkills(skills: string[], latin: boolean) {
  const clean = (s: string) => (latin ? sanitizeLatin(s) : sanitizeAr(s));
  const technical: string[] = [];
  const soft: string[] = [];
  for (const raw of skills) {
    const skill = clean(raw);
    if (!skill) continue;
    const lower = skill.toLowerCase();
    if (TECHNICAL_KEYWORDS.some((k) => lower.includes(k))) technical.push(skill);
    else soft.push(skill);
  }
  return { technical, soft };
}

class ProfessionalAtsPdfWriter {
  private y = Y_TOP;

  constructor(
    private readonly doc: jsPDF,
    private readonly isAr: boolean,
    private readonly sizes: ProSizes,
    private readonly scale: Scale,
  ) {}

  get bottomY(): number {
    return this.y;
  }

  private gap(n: number): number {
    return n * this.scale.gapMul;
  }

  private lh(): number {
    return Math.max(MIN_LINE_H, this.scale.lineH);
  }

  private prep(text: string): string {
    return prepareExportText(text, this.isAr);
  }

  private setFont(bold: boolean, size: number) {
    this.doc.setTextColor(...BLACK);
    if (this.isAr) {
      this.doc.setFont("Amiri", bold ? "bold" : "normal");
    } else {
      this.doc.setFont("helvetica", bold ? "bold" : "normal");
    }
    this.doc.setFontSize(size);
  }

  private split(text: string, maxW: number): string[] {
    if (!text) return [];
    const lines = this.doc.splitTextToSize(text, maxW) as string[];
    return lines.length ? lines : [text];
  }

  private ax(): number {
    return this.isAr ? X_RIGHT : X_LEFT;
  }

  private alignMain(): "left" | "right" {
    return this.isAr ? "right" : "left";
  }

  private drawFullRule(width = RULE_W) {
    this.doc.setDrawColor(...BLACK);
    this.doc.setLineWidth(width);
    this.doc.line(X_LEFT, this.y, X_RIGHT, this.y);
  }

  private writeCenter(text: string, size: number, bold = false) {
    const t = this.prep(text);
    if (!t) return;
    this.setFont(bold, size);
    const lines = this.split(t, CONTENT_W);
    for (const line of lines) {
      this.doc.text(line, PAGE_W / 2, this.y, { align: "center" });
      this.y += this.lh();
    }
  }

  private writeLine(text: string, size: number, bold = false, x = this.ax(), maxW = CONTENT_W, justify = false) {
    const t = this.prep(text);
    if (!t) return;
    this.setFont(bold, size);
    const lines = this.split(t, maxW);
    for (const line of lines) {
      if (justify && !this.isAr) {
        this.doc.text(line, X_LEFT, this.y, { align: "justify", maxWidth: maxW });
      } else {
        this.doc.text(line, x, this.y, { align: this.alignMain() });
      }
      this.y += this.lh();
    }
  }

  private writeSection(title: string) {
    this.y += this.gap(6);
    const label = this.isAr ? title : title.toUpperCase();
    this.setFont(true, this.sizes.section);
    this.doc.text(label, this.ax(), this.y, { align: this.alignMain() });
    const textW = this.doc.getTextWidth(label);
    const ulY = this.y + 1.2;
    if (this.isAr) {
      this.doc.line(X_RIGHT - textW, ulY, X_RIGHT, ulY);
    } else {
      this.doc.line(X_LEFT, ulY, X_LEFT + textW, ulY);
    }
    this.y += this.lh() * 0.35;
    this.drawFullRule(RULE_W);
    this.y += this.gap(5);
  }

  private writeProSkillRow(label: string, value: string) {
    const l = this.isAr ? sanitizeAr(label) : sanitizeLatin(label);
    const v = this.prep(value);
    if (!l || !v) return;

    const labelLines = this.split(l, PRO_SKILL_LABEL_W);
    const valueLines = this.split(v, PRO_SKILL_VALUE_W);
    const rows = Math.max(labelLines.length, valueLines.length);

    for (let i = 0; i < rows; i += 1) {
      if (labelLines[i]) {
        this.setFont(true, this.sizes.body);
        this.doc.text(
          labelLines[i],
          this.isAr ? X_RIGHT : PRO_SKILL_LABEL_X,
          this.y,
          { align: this.isAr ? "right" : "left" },
        );
      }
      if (valueLines[i]) {
        this.setFont(false, this.sizes.body);
        this.doc.text(
          valueLines[i],
          this.isAr ? X_LEFT : PRO_SKILL_VALUE_X,
          this.y,
          { align: this.isAr ? "left" : "left" },
        );
      }
      this.y += this.lh();
    }
    this.y += this.gap(0.5);
  }

  private writeOBullets(raw: string) {
    raw
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => this.prep(l.replace(/^[\s•\-–—oO]+/, "")))
      .filter(Boolean)
      .forEach((body) => {
        const wrapped = this.split(`o ${body}`, PRO_BULLET_W);
        this.setFont(false, this.sizes.body);
        wrapped.forEach((line, idx) => {
          const x = this.isAr ? X_RIGHT : idx === 0 ? PRO_BULLET_X : PRO_BULLET_WRAP;
          this.doc.text(line, x, this.y, { align: this.alignMain() });
          this.y += this.lh();
        });
        this.y += this.gap(0.4);
      });
  }

  private writeSubBulletItems(items: string[]) {
    for (const item of items) {
      const t = this.prep(item);
      if (!t) continue;
      const wrapped = this.split(`  o ${t}`, PRO_BULLET_W);
      this.setFont(false, this.sizes.body);
      wrapped.forEach((line, idx) => {
        const x = this.isAr ? X_RIGHT : idx === 0 ? PRO_BULLET_X : PRO_BULLET_WRAP;
        this.doc.text(line, x, this.y, { align: this.alignMain() });
        this.y += this.lh();
      });
    }
    this.y += this.gap(1);
  }

  private writeSubhead(label: string) {
    const prefix = this.isAr ? `\u2022 ${label}` : `\u2022 ${label}`;
    this.writeLine(prefix, this.sizes.body, true);
  }

  writeHeader(cv: CVData) {
    const name = cv.personal.name || (this.isAr ? "الاسم الكامل" : "Full Name");
    this.y = Y_TOP;
    this.writeCenter(name, this.sizes.name, true);
    if (cv.personal.title) this.writeCenter(cv.personal.title, this.sizes.title);

    const phone = this.prep(cv.personal.phone);
    const email = this.prep(cv.personal.email);
    const city = this.prep(cv.personal.city);
    const parts = [
      phone ? `\u25CF ${phone}` : "",
      email ? `\u2709 ${email}` : "",
      city ? `\u2299 ${city}` : "",
    ].filter(Boolean);

    if (parts.length) {
      this.y += this.gap(2);
      const colW = CONTENT_W / parts.length;
      this.setFont(false, this.sizes.contact);
      parts.forEach((part, i) => {
        const cx = this.isAr
          ? X_RIGHT - colW * i - colW / 2
          : X_LEFT + colW * i + colW / 2;
        this.doc.text(part, cx, this.y, { align: "center" });
      });
      this.y += this.lh();
    }

    this.y += this.gap(4);
    this.drawFullRule(PRO_HEADER_RULE);
    this.y += this.gap(8);
  }

  private formatProCertLine(c: CVData["certifications"][number], latin: boolean): string {
    const title = latin ? sanitizeLatin(c.title) : sanitizeAr(c.title);
    const issuer = latin ? sanitizeLatin(c.issuer) : sanitizeAr(c.issuer);
    const date = latin ? sanitizeLatin(c.date) : sanitizeAr(c.date);
    const name =
      title && issuer && !title.toLowerCase().includes(issuer.toLowerCase())
        ? `${title} | ${issuer}`
        : title || issuer;
    return date ? `${name} | ${date}` : name;
  }

  private formatGraduationBullet(e: CVData["experience"][number], latin: boolean): string {
    const role = latin ? sanitizeLatin(e.role) : sanitizeAr(e.role);
    const desc = (e.desc || "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.replace(/^[\s•\-–—oO]+/, "").trim())
      .filter(Boolean)[0];
    const cleanDesc = desc ? (latin ? sanitizeLatin(desc) : sanitizeAr(desc)) : "";
    const roleLabel = /graduation\s*project|مشروع\s*التخرج/i.test(role)
      ? role
      : role
        ? `Graduation Project: ${role}`
        : "Graduation Project";
    return cleanDesc ? `${roleLabel}: ${cleanDesc}` : roleLabel;
  }

  render(cv: CVData) {
    const H = AR_HEADERS;
    const latin = !this.isAr;
    this.writeHeader(cv);

    if (this.prep(cv.summary)) {
      this.writeSection(this.isAr ? H.summary : PRO_EN.summary);
      this.writeLine(cv.summary, this.sizes.summary, false, this.ax(), PRO_SUMMARY_W, !this.isAr);
      this.y += this.gap(2);
    }

    const { work, graduation } = splitExperience(cv);
    if (work.length) {
      this.writeSection(this.isAr ? H.experience : PRO_EN.experience);
      for (const e of work) {
        const companyLine = this.prep(e.company) || this.prep(e.role);
        this.writeLine(companyLine, this.sizes.head, true);
        const detail = [
          this.prep(e.role),
          this.prep(cv.personal.city),
          formatDateRange(e.from, e.to, latin),
        ]
          .filter(Boolean)
          .join(" | ");
        this.writeLine(detail, this.sizes.body);
        if (e.desc.trim()) this.writeOBullets(e.desc);
        this.y += this.gap(2);
      }
    }

    const education = (cv.education || []).filter((e) => e.school?.trim() || e.degree?.trim());
    if (education.length) {
      this.writeSection(this.isAr ? H.education : PRO_EN.education);
      for (const e of education) {
        this.writeLine(this.prep(e.school), this.sizes.head, true);
        const degreeLine = [[e.degree, e.field].filter(Boolean).join(latin ? " in " : " - "), e.to || e.from]
          .filter(Boolean)
          .join(" | ");
        this.writeLine(degreeLine, this.sizes.body);
        const extras: string[] = [];
        if (e.showGpa && e.gpa) {
          extras.push(`${this.isAr ? "المعدل" : "GPA"}: ${this.prep(e.gpa)}${e.gpaScale ? `/${this.prep(e.gpaScale)}` : ""}`);
        }
        if (e.honors) extras.push(`${this.isAr ? "مرتبة الشرف" : "Honors"}: ${this.prep(e.honors)}`);
        if (extras.length) this.writeOBullets(extras.join("\n"));
        this.y += this.gap(2);
      }
    }

    const certs = (cv.certifications || []).filter((c) => c.title?.trim() || c.issuer?.trim() || c.date?.trim());
    const skillRows = buildSkillRows(cv, latin).filter(
      (row) => row.label !== "Soft Skills" && row.label !== "Languages",
    );
    const { soft } = splitProfessionalSkills(cv.skills || [], latin);
    const langs = (cv.languages || []).filter((l) => this.prep(l.lang));
    const hasOther = certs.length || graduation.length || skillRows.length || soft.length || langs.length;

    if (hasOther) {
      this.writeSection(this.isAr ? "أخرى" : PRO_EN.other);

      if (certs.length) {
        this.writeSubhead(this.isAr ? "الشهادات والدورات:" : PRO_EN.certs);
        this.writeSubBulletItems(certs.map((c) => this.formatProCertLine(c, latin)));
      }

      if (graduation.length) {
        this.writeSubhead(this.isAr ? "المشاريع:" : PRO_EN.projects);
        this.writeSubBulletItems(graduation.map((e) => this.formatGraduationBullet(e, latin)));
      }

      if (skillRows.length) {
        this.writeSubhead(this.isAr ? "المهارات التقنية:" : PRO_EN.tech);
        for (const row of skillRows) this.writeProSkillRow(row.label, row.text);
        this.y += this.gap(1);
      }

      if (soft.length) {
        this.writeSubhead(this.isAr ? "المهارات الشخصية" : PRO_EN.soft);
        this.writeSubBulletItems(soft);
      }

      if (langs.length) {
        const langList = langs
          .map((l) => {
            const lang = this.prep(l.lang);
            const level = this.prep(l.level);
            return level ? `${lang} (${level})` : lang;
          })
          .join(", ");
        const head = this.isAr ? `\u2022 ${H.languages}: ` : `\u2022 ${PRO_EN.languages} `;
        this.setFont(true, this.sizes.body);
        const headW = this.doc.getTextWidth(head);
        this.doc.text(head, this.ax(), this.y, { align: this.alignMain() });
        this.setFont(false, this.sizes.body);
        const restW = CONTENT_W - headW - 4;
        const restLines = this.split(langList, restW);
        if (this.isAr) {
          this.doc.text(restLines[0] ?? "", X_LEFT, this.y, { align: "left" });
        } else {
          this.doc.text(restLines[0] ?? "", X_LEFT + headW + 4, this.y, { align: "left" });
        }
        for (let i = 1; i < restLines.length; i += 1) {
          this.y += this.lh();
          this.doc.text(restLines[i], this.isAr ? X_LEFT : X_LEFT + headW + 4, this.y, {
            align: this.isAr ? "left" : "left",
          });
        }
        this.y += this.lh() + this.gap(1);
      }
    }
  }
}

function renderProfessionalPdf(doc: jsPDF, cv: CVData, isAr: boolean, scale: Scale): number {
  const w = new ProfessionalAtsPdfWriter(doc, isAr, buildProfessionalSizes(scale.fontDelta), scale);
  w.render(cv);
  return w.bottomY;
}

type PdfRenderer = (doc: jsPDF, cv: CVData, isAr: boolean, scale: Scale) => number;

function fitsOnePage(finalY: number): boolean {
  return finalY <= PAGE_BOTTOM;
}

async function buildScaledPdf(cv: CVData, isAr: boolean, render: PdfRenderer): Promise<jsPDF> {
  let scale: Scale = { fontDelta: 0, lineH: BASE_LINE_H, gapMul: 1 };
  let best: { doc: jsPDF; finalY: number } | null = null;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    if (isAr) await ensureArabicFonts(doc);
    doc.setProperties({
      title: cv.personal.name ? `${cv.personal.name} - CV` : "Resume",
      subject: "Curriculum Vitae",
      creator: "Nashmi CV Builder",
      keywords: cv.skills.join(", "),
    });

    const finalY = render(doc, cv, isAr, scale);
    if (fitsOnePage(finalY)) return doc;
    if (!best || finalY < best.finalY) best = { doc, finalY };

    const nextLine = Math.max(MIN_LINE_H, Math.round((scale.lineH - 0.5) * 2) / 2);
    const nextDelta = scale.fontDelta + 0.5;
    if (
      buildSizes(nextDelta).body <= MIN_FONT &&
      buildProfessionalSizes(nextDelta).body <= MIN_FONT &&
      nextLine <= MIN_LINE_H
    ) {
      break;
    }
    scale = {
      fontDelta: nextDelta,
      lineH: nextLine,
      gapMul: Math.max(0.7, scale.gapMul - 0.03),
    };
  }

  return best!.doc;
}

/** ATS PDF — pure jsPDF text. Classic or Professional layout by template; others use Classic. */
export async function renderCvToAtsPdfBlob(
  cv: CVData,
  cvLanguage: "ar" | "en",
  templateId?: CvTemplateId,
): Promise<Blob> {
  const isAr = cvLanguage === "ar";
  const render: PdfRenderer =
    templateId === "professional" ? renderProfessionalPdf : renderClassicPdf;
  const doc = await buildScaledPdf(cv, isAr, render);
  return doc.output("blob");
}
