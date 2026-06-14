import jsPDF from "jspdf";
import { ArabicShaper } from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";
import type { CVData } from "@/nashmi/lib/ats";
import type { CvTemplateId } from "@/nashmi/lib/cv-templates";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const X_LEFT = 51.4;
const X_RIGHT = 543.9;
const CENTER_X = PAGE_W / 2;
const Y_TOP = 38;
const PAGE_BOTTOM = PAGE_H - 30;
const CONTENT_W = X_RIGHT - X_LEFT;
const BLACK: [number, number, number] = [0, 0, 0];
const RULE_W = 0.6;
const MIN_FONT = 7;
const MIN_LINE_H = 9;
const BASE_LINE_H = 11;

const BULLET_MARK_X = 65;
const BULLET_TEXT_X = 78;
const BULLET_NEST_X = 85;
const BULLET_NEST_TEXT_X = 98;
const BULLET_MAX_W = 465;
const SUMMARY_W = 492;
const ROW_LEFT_X = 57.4;

const AMIRI_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-400-normal.ttf";
const AMIRI_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-700-normal.ttf";

const TECHNICAL_KEYWORDS = [
  "windows", "linux", "cisco", "network", "server", "active directory",
  "microsoft", "tcp", "ip", "dns", "dhcp", "vpn", "routing", "switching",
  "python", "javascript", "sql", "html", "css", "react", "node", "aws",
  "azure", "docker", "git", "solidworks", "autocad", "cad", "arduino",
  "iot", "troubleshoot", "hardware", "software", "database", "programming",
];

const EN_SECTIONS = {
  summary: "PROFESSIONAL SUMMARY",
  experience: "EXPERIENCE",
  education: "EDUCATION",
  other: "OTHER",
  certs: "Certifications & Courses:",
  projects: "Projects:",
  hard: "Hard Skills:",
  soft: "Soft Skills:",
  languages: "Languages:",
} as const;

const AR_SECTIONS = {
  summary: "الملخص المهني",
  experience: "الخبرة",
  education: "التعليم",
  other: "أخرى",
  certs: "الشهادات والدورات:",
  projects: "المشاريع:",
  hard: "المهارات التقنية:",
  soft: "المهارات الشخصية:",
  languages: "اللغات:",
} as const;

let arabicFontsLoaded = false;
const bidi = bidiFactory();

type Scale = { fontDelta: number; lineH: number };

type FontOpts = { bold?: boolean; size: number; justify?: boolean };

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

function shapeArabic(text: string): string {
  const clean = sanitizeAr(text);
  if (!clean) return "";
  if (!/[\u0600-\u06FF]/.test(clean)) return clean;
  const shaped = ArabicShaper.convertArabic(clean);
  const levels = bidi.getEmbeddingLevels(shaped);
  return bidi.getReorderedString(shaped, levels);
}

function prepText(text: string, isAr: boolean): string {
  if (!text) return "";
  return isAr ? shapeArabic(text) : sanitizeLatin(text);
}

function scaledSize(base: number, scale: Scale): number {
  return Math.max(MIN_FONT, Math.round((base - scale.fontDelta) * 2) / 2);
}

function lineHeight(scale: Scale): number {
  return Math.max(MIN_LINE_H, scale.lineH);
}

function setFont(doc: jsPDF, isAr: boolean, bold: boolean, size: number): void {
  doc.setTextColor(...BLACK);
  if (isAr) {
    doc.setFont("Amiri", bold ? "bold" : "normal");
  } else {
    doc.setFont("helvetica", bold ? "bold" : "normal");
  }
  doc.setFontSize(size);
}

function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  return lines.length ? lines : [text];
}

function drawLine(doc: jsPDF, y: number): void {
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_W);
  doc.line(X_LEFT, y, X_RIGHT, y);
}

function formatDateRange(from: string, to: string, isAr: boolean): string {
  const f = prepText(from, isAr);
  const t = prepText(to, isAr);
  if (f && t) return `${f} – ${t}`;
  return f || t || "";
}

function parseBullets(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^[\s•\-–—oO]+/, "").trim())
    .filter(Boolean);
}

function splitSkills(skills: string[], isAr: boolean): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const raw of skills) {
    const skill = prepText(raw, isAr);
    if (!skill) continue;
    const lower = skill.toLowerCase();
    if (TECHNICAL_KEYWORDS.some((k) => lower.includes(k))) hard.push(skill);
    else soft.push(skill);
  }
  return { hard, soft };
}

function buildContact(cv: CVData, isAr: boolean): string {
  const parts = [
    prepText(cv.personal.phone, isAr),
    prepText(cv.personal.email, isAr),
    prepText(cv.personal.linkedin, isAr),
  ].filter(Boolean);
  return parts.join("  |  ");
}

function buildEduLine2(e: CVData["education"][number], isAr: boolean): string {
  const degree = [prepText(e.degree, isAr), prepText(e.field, isAr)].filter(Boolean).join(isAr ? " - " : " in ");
  const parts = [degree].filter(Boolean);
  if (e.showGpa && e.gpa) {
    parts.push(`${isAr ? "المعدل" : "GPA"}: ${prepText(e.gpa, isAr)}${e.gpaScale ? `/${prepText(e.gpaScale, isAr)}` : ""}`);
  }
  if (e.honors) parts.push(`${isAr ? "مرتبة الشرف" : "Honors"}: ${prepText(e.honors, isAr)}`);
  return parts.join(" | ");
}

class CvPdfRenderer {
  y = Y_TOP;

  constructor(
    private readonly doc: jsPDF,
    private readonly cv: CVData,
    private readonly isAr: boolean,
    private readonly scale: Scale,
    private readonly S: typeof EN_SECTIONS | typeof AR_SECTIONS,
  ) {}

  private fs(base: number): number {
    return scaledSize(base, this.scale);
  }

  private lh(): number {
    return lineHeight(this.scale);
  }

  private gap(n: number): number {
    return n;
  }

  private renderText(
    text: string,
    x: number,
    maxWidth: number,
    opts: FontOpts,
    align: "left" | "right" | "center" = "left",
  ): void {
    const t = prepText(text, this.isAr);
    if (!t) return;
    setFont(this.doc, this.isAr, !!opts.bold, opts.size);
    const lines = splitLines(this.doc, t, maxWidth);
    for (const line of lines) {
      if (opts.justify && !this.isAr && align === "left") {
        this.doc.text(line, X_LEFT, this.y, { align: "justify", maxWidth: SUMMARY_W });
      } else {
        this.doc.text(line, x, this.y, { align });
      }
      this.y += this.lh();
    }
  }

  private renderSplitRow(
    left: string,
    right: string,
    leftBold = true,
  ): void {
    const l = prepText(left, this.isAr);
    const r = prepText(right, this.isAr);
    if (this.isAr) {
      if (l) {
        setFont(this.doc, this.isAr, leftBold, this.fs(9));
        this.doc.text(l, X_RIGHT, this.y, { align: "right" });
      }
      if (r) {
        setFont(this.doc, this.isAr, false, this.fs(9));
        this.doc.text(r, X_LEFT, this.y, { align: "left" });
      }
    } else {
      if (l) {
        setFont(this.doc, false, leftBold, this.fs(9));
        this.doc.text(l, ROW_LEFT_X, this.y, { align: "left" });
      }
      if (r) {
        setFont(this.doc, false, false, this.fs(9));
        this.doc.text(r, X_RIGHT, this.y, { align: "right" });
      }
    }
    this.y += this.lh();
  }

  private renderBullet(text: string, nested = false): void {
    const body = prepText(text, this.isAr);
    if (!body) return;
    const markX = nested ? BULLET_NEST_X : BULLET_MARK_X;
    const textX = nested ? BULLET_NEST_TEXT_X : BULLET_TEXT_X;
    const maxW = X_RIGHT - textX;
    setFont(this.doc, this.isAr, false, this.fs(9));
    if (this.isAr) {
      this.doc.text("o ", markX, this.y, { align: "left" });
      const lines = splitLines(this.doc, body, maxW);
      for (const line of lines) {
        this.doc.text(line, X_RIGHT, this.y, { align: "right" });
        this.y += this.lh();
      }
    } else {
      this.doc.text("o ", markX, this.y, { align: "left" });
      const lines = splitLines(this.doc, body, BULLET_MAX_W);
      for (const line of lines) {
        this.doc.text(line, textX, this.y, { align: "left" });
        this.y += this.lh();
      }
    }
  }

  private renderSectionHeader(title: string): void {
    this.y += this.gap(6);
    const label = this.isAr ? title : title.toUpperCase();
    setFont(this.doc, this.isAr, true, this.fs(10));
    const x = this.isAr ? X_RIGHT : X_LEFT;
    const align = this.isAr ? "right" : "left";
    this.doc.text(label, x, this.y, { align });
    const textW = this.doc.getTextWidth(label);
    const ulY = this.y + 1.2;
    if (this.isAr) {
      this.doc.line(X_RIGHT - textW, ulY, X_RIGHT, ulY);
    } else {
      this.doc.line(X_LEFT, ulY, X_LEFT + textW, ulY);
    }
    this.y += this.lh() * 0.35;
    drawLine(this.doc, this.y);
    this.y += this.gap(6);
  }

  private renderSubhead(label: string): void {
    const text = `\u2022 ${label}`;
    setFont(this.doc, this.isAr, true, this.fs(9));
    const x = this.isAr ? X_RIGHT : ROW_LEFT_X;
    this.doc.text(prepText(text, this.isAr), x, this.y, { align: this.isAr ? "right" : "left" });
    this.y += this.lh();
  }

  private renderLanguages(): void {
    const langs = (this.cv.languages || []).filter((l) => prepText(l.lang, this.isAr));
    if (!langs.length) return;
    const list = langs
      .map((l) => {
        const lang = prepText(l.lang, this.isAr);
        const level = prepText(l.level, this.isAr);
        return level ? `${lang} (${level})` : lang;
      })
      .join(", ");
    const head = `\u2022 ${this.S.languages} `;
    setFont(this.doc, this.isAr, true, this.fs(9));
    const headPrepared = prepText(head, this.isAr);
    const headW = this.doc.getTextWidth(headPrepared);
    if (this.isAr) {
      this.doc.text(headPrepared, X_RIGHT, this.y, { align: "right" });
      setFont(this.doc, this.isAr, false, this.fs(9));
      this.doc.text(list, X_LEFT, this.y, { align: "left" });
    } else {
      this.doc.text(headPrepared, ROW_LEFT_X, this.y, { align: "left" });
      setFont(this.doc, this.isAr, false, this.fs(9));
      this.doc.text(list, ROW_LEFT_X + headW, this.y, { align: "left" });
    }
    this.y += this.lh() + this.gap(6);
  }

  render(): number {
    this.renderHeader();
    this.renderSummary();
    this.renderExperience();
    this.renderEducation();
    this.renderOther();
    return this.y;
  }

  private renderHeader(): void {
    this.y = Y_TOP;
    const name = this.cv.personal.name || (this.isAr ? "الاسم الكامل" : "Full Name");
    this.renderText(name, CENTER_X, CONTENT_W, { bold: true, size: this.fs(this.isAr ? 20 : 19) }, "center");
    this.y += this.gap(14);

    if (this.cv.personal.title) {
      this.renderText(this.cv.personal.title, CENTER_X, CONTENT_W, { size: this.fs(9.5) }, "center");
    }
    this.y += this.gap(12);

    const contact = buildContact(this.cv, this.isAr);
    if (contact) {
      this.renderText(contact, CENTER_X, CONTENT_W, { size: this.fs(8) }, "center");
    }
    this.y += this.gap(10);
    drawLine(this.doc, this.y);
    this.y += this.gap(8);
  }

  private renderSummary(): void {
    if (!prepText(this.cv.summary, this.isAr)) return;
    this.renderSectionHeader(this.S.summary);
    this.renderText(this.cv.summary, this.isAr ? X_RIGHT : X_LEFT, SUMMARY_W, {
      size: this.fs(9),
      justify: !this.isAr,
    }, this.isAr ? "right" : "left");
    this.y += this.gap(10);
  }

  private renderExperience(): void {
    const entries = (this.cv.experience || []).filter((e) => e.role?.trim() || e.company?.trim() || e.desc?.trim());
    if (!entries.length) return;
    this.renderSectionHeader(this.S.experience);
    for (const e of entries) {
      this.renderSplitRow(e.role, formatDateRange(e.from, e.to, this.isAr));
      const companyLine = [prepText(e.company, this.isAr), prepText(this.cv.personal.city, this.isAr)]
        .filter(Boolean)
        .join(" | ");
      if (companyLine) {
        this.renderText(companyLine, this.isAr ? X_RIGHT : X_LEFT, CONTENT_W, { size: this.fs(9) }, this.isAr ? "right" : "left");
      }
      for (const bullet of parseBullets(e.desc || "")) this.renderBullet(bullet);
      this.y += this.gap(8);
    }
  }

  private renderEducation(): void {
    const entries = (this.cv.education || []).filter((e) => e.school?.trim() || e.degree?.trim());
    if (!entries.length) return;
    this.renderSectionHeader(this.S.education);
    for (const e of entries) {
      const year = prepText(e.to || e.from, this.isAr);
      this.renderSplitRow(e.school, year);
      const line2 = buildEduLine2(e, this.isAr);
      if (line2) {
        this.renderText(line2, this.isAr ? X_RIGHT : X_LEFT, CONTENT_W, { size: this.fs(9) }, this.isAr ? "right" : "left");
      }
      this.y += this.gap(8);
    }
  }

  private renderOther(): void {
    const certs = (this.cv.certifications || []).filter((c) => c.title?.trim() || c.issuer?.trim() || c.date?.trim());
    const projects =
      this.cv.projects?.enabled
        ? (this.cv.projects.items || []).filter((p) => p.name?.trim() || p.institution?.trim() || p.year?.trim())
        : [];
    const { hard, soft } = splitSkills(this.cv.skills || [], this.isAr);
    const hasLangs = (this.cv.languages || []).some((l) => prepText(l.lang, this.isAr));
    if (!certs.length && !projects.length && !hard.length && !soft.length && !hasLangs) return;

    this.renderSectionHeader(this.S.other);

    if (certs.length) {
      this.renderSubhead(this.S.certs);
      for (const c of certs) {
        const name = prepText(c.title || c.issuer, this.isAr);
        const year = prepText(c.date, this.isAr);
        const line = year ? `${name} | ${year}` : name;
        this.renderBullet(line);
      }
      this.y += this.gap(6);
    }

    if (projects.length) {
      this.renderSubhead(this.S.projects);
      for (const p of projects) {
        const head = [
          prepText(p.name, this.isAr),
          prepText(p.institution, this.isAr),
          prepText(p.year, this.isAr),
        ].filter(Boolean);
        const title = head.length >= 2
          ? `${head[0]} – ${head[1]}${head[2] ? ` ${head[2]}` : ""}`
          : head.join(" ");
        if (title) this.renderBullet(title);
        for (const bullet of p.bullets || []) {
          const b = bullet.trim();
          if (b) this.renderBullet(b, true);
        }
      }
      this.y += this.gap(6);
    }

    if (hard.length) {
      this.renderSubhead(this.S.hard);
      for (const skill of hard) this.renderBullet(skill);
      this.y += this.gap(6);
    }

    if (soft.length) {
      this.renderSubhead(this.S.soft);
      for (const skill of soft) this.renderBullet(skill);
      this.y += this.gap(6);
    }

    if (hasLangs) this.renderLanguages();
  }
}

function renderCv(doc: jsPDF, cv: CVData, isAr: boolean, scale: Scale): number {
  const S = isAr ? AR_SECTIONS : EN_SECTIONS;
  const renderer = new CvPdfRenderer(doc, cv, isAr, scale, S);
  return renderer.render();
}

async function buildScaledPdf(cv: CVData, isAr: boolean): Promise<jsPDF> {
  let scale: Scale = { fontDelta: 0, lineH: BASE_LINE_H };
  let best: { doc: jsPDF; finalY: number } | null = null;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    if (isAr) await ensureArabicFonts(doc);
    doc.setProperties({
      title: cv.personal.name ? `${cv.personal.name} - CV` : "Resume",
      subject: "Curriculum Vitae",
      creator: "Nashmi CV Builder",
      keywords: (cv.skills || []).join(", "),
    });

    const finalY = renderCv(doc, cv, isAr, scale);
    if (finalY <= PAGE_BOTTOM) return doc;
    if (!best || finalY < best.finalY) best = { doc, finalY };

    const nextLine = Math.max(MIN_LINE_H, Math.round((scale.lineH - 0.5) * 2) / 2);
    const nextDelta = scale.fontDelta + 0.5;
    if (scaledSize(9, { fontDelta: nextDelta, lineH: nextLine }) <= MIN_FONT && nextLine <= MIN_LINE_H) {
      break;
    }
    scale = { fontDelta: nextDelta, lineH: nextLine };
  }

  return best!.doc;
}

/** ATS PDF — pure jsPDF text. Single layout for all templates. */
export async function renderCvToAtsPdfBlob(
  cv: CVData,
  cvLanguage: "ar" | "en",
  _templateId?: CvTemplateId,
): Promise<Blob> {
  const isAr = cvLanguage === "ar";
  const doc = await buildScaledPdf(cv, isAr);
  return doc.output("blob");
}
