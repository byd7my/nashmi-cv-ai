import jsPDF from "jspdf";
import type { CVData } from "@/nashmi/lib/ats";
import { AR_HEADERS, EN_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CvTemplateId } from "@/nashmi/lib/cv-templates";

const MARGIN = 14;
const PAGE_H = 297;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BLACK: [number, number, number] = [0, 0, 0];
const RULE_WIDTH = 0.35;
const MIN_FONT = 7;

const AMIRI_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-400-normal.ttf";
const AMIRI_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-700-normal.ttf";

let arabicFontsLoaded = false;

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

/** Strip encoding artifacts; Latin exports keep ASCII only. */
function sanitizeExportText(text: string, latinOnly: boolean): string {
  let s = text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2022\u2023\u2043\u2219\u00B7\u2027\u25CF\u25E6]/g, ", ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (latinOnly) {
    s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
  }
  return s.replace(/\s+/g, " ").trim();
}

type Typography = {
  name: number;
  headline: number;
  contact: number;
  section: number;
  body: number;
  bullet: number;
  small: number;
  lineMul: number;
  gapMul: number;
};

const EN_TYPO: Typography = {
  name: 18,
  headline: 11,
  contact: 9,
  section: 10,
  body: 10,
  bullet: 9.5,
  small: 9,
  lineMul: 0.38,
  gapMul: 1,
};

function tightenTypography(t: Typography): Typography {
  const dec = (n: number) => Math.max(MIN_FONT, Math.round((n - 0.5) * 2) / 2);
  return {
    name: dec(t.name),
    headline: dec(t.headline),
    contact: dec(t.contact),
    section: dec(t.section),
    body: dec(t.body),
    bullet: dec(t.bullet),
    small: dec(t.small),
    lineMul: Math.max(0.3, Math.round((t.lineMul - 0.015) * 1000) / 1000),
    gapMul: Math.max(0.72, Math.round((t.gapMul - 0.04) * 100) / 100),
  };
}

type WriteOpts = {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  gap?: number;
};

class AtsPdfWriter {
  private y = MARGIN;
  private readonly x: number;
  private readonly align: "left" | "right";
  private readonly font: string;

  constructor(
    private readonly doc: jsPDF,
    private readonly isAr: boolean,
    private readonly singlePage: boolean,
    private readonly typo: Typography,
  ) {
    this.x = isAr ? PAGE_W - MARGIN : MARGIN;
    this.align = isAr ? "right" : "left";
    this.font = isAr ? "Amiri" : "helvetica";
  }

  get bottomY(): number {
    return this.y;
  }

  private prepare(text: string): string {
    return sanitizeExportText(text, !this.isAr);
  }

  private setFont(bold: boolean, size: number, italic = false) {
    const style = italic ? "italic" : bold ? "bold" : "normal";
    this.doc.setFont(this.font, style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...BLACK);
  }

  private lineHeight(size: number): number {
    return size * this.typo.lineMul;
  }

  private scaledGap(gap: number): number {
    return gap * this.typo.gapMul;
  }

  private ensureSpace(height: number) {
    if (this.singlePage) return;
    if (this.y + height <= PAGE_H - MARGIN) return;
    this.doc.addPage();
    this.y = MARGIN;
  }

  private renderLines(lines: string[], size: number, gap: number) {
    const blockH = lines.length * this.lineHeight(size) + this.scaledGap(gap);
    this.ensureSpace(blockH);
    this.doc.text(lines, this.x, this.y, { align: this.align });
    this.y += blockH;
    this.doc.setTextColor(...BLACK);
  }

  write(text: string, opts: WriteOpts = {}) {
    const trimmed = this.prepare(text);
    if (!trimmed) return;
    const size = opts.size ?? this.typo.body;
    const gap = opts.gap ?? 2.5;
    this.setFont(Boolean(opts.bold), size, Boolean(opts.italic));
    const lines = this.doc.splitTextToSize(trimmed, CONTENT_W) as string[];
    this.renderLines(lines, size, gap);
  }

  /** Horizontal rule, then header text — no rule below the title. */
  writeSection(title: string) {
    const label = this.prepare(this.isAr ? title : title.toUpperCase());
    const size = this.typo.section;
    const beforeGap = this.scaledGap(this.isAr ? 4 : 3);
    const afterRuleGap = this.scaledGap(2.5);
    const titleLines = this.doc.splitTextToSize(label, CONTENT_W) as string[];
    const titleH = titleLines.length * this.lineHeight(size);
    const blockH = beforeGap + 1 + afterRuleGap + titleH + this.scaledGap(2);
    this.ensureSpace(blockH);

    this.y += beforeGap;
    this.doc.setDrawColor(...BLACK);
    this.doc.setLineWidth(RULE_WIDTH);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += afterRuleGap;

    this.setFont(true, size);
    this.doc.text(titleLines, this.x, this.y, { align: this.align });
    this.y += titleH + this.scaledGap(2);
    this.doc.setTextColor(...BLACK);
  }

  writeRoleDateLine(role: string, dates: string) {
    const roleText = this.prepare(role);
    const dateText = this.prepare(dates);
    if (!roleText && !dateText) return;
    const size = this.typo.body;
    const gap = this.scaledGap(1.5);
    this.ensureSpace(this.lineHeight(size) + gap);

    if (this.isAr) {
      const merged = dateText ? `${roleText}    ${dateText}` : roleText;
      this.setFont(true, size);
      const lines = this.doc.splitTextToSize(merged, CONTENT_W) as string[];
      this.doc.text(lines, this.x, this.y, { align: this.align });
      this.y += lines.length * this.lineHeight(size) + gap;
      return;
    }

    this.setFont(true, size);
    this.doc.text(roleText, MARGIN, this.y);
    if (dateText) {
      this.setFont(false, size);
      this.doc.text(dateText, PAGE_W - MARGIN, this.y, { align: "right" });
    }
    this.y += this.lineHeight(size) + gap;
    this.doc.setTextColor(...BLACK);
  }

  writeBullets(raw: string, size = this.typo.bullet) {
    raw
      .split(/\n+/)
      .map((line) => this.prepare(line.replace(/^[\s•\-–—]+/, "")))
      .filter(Boolean)
      .forEach((line) => this.write(`- ${line}`, { size, gap: 1.5 }));
  }
}

function formatDateRange(from: string, to: string, isAr: boolean): string {
  const sep = isAr ? " – " : " – ";
  return [from, to].filter(Boolean).join(sep);
}

function buildEnglishContact(cv: CVData): string {
  return [cv.personal.phone, cv.personal.email, cv.personal.city, cv.personal.linkedin]
    .map((part) => sanitizeExportText(part || "", true))
    .filter(Boolean)
    .join(" | ");
}

function buildArabicContact(cv: CVData): string {
  return [cv.personal.email, cv.personal.phone, cv.personal.city, cv.personal.linkedin, cv.personal.website]
    .filter(Boolean)
    .join(" | ");
}

function renderCvContent(
  doc: jsPDF,
  cv: CVData,
  isAr: boolean,
  typo: Typography,
  singlePage: boolean,
): number {
  const H = isAr ? AR_HEADERS : EN_HEADERS;
  const w = new AtsPdfWriter(doc, isAr, singlePage, typo);

  const name = cv.personal.name || (isAr ? "الاسم الكامل" : "Full Name");
  w.write(name, { size: typo.name, bold: true, gap: 3 });

  if (cv.personal.title) {
    w.write(cv.personal.title, { size: typo.headline, gap: 3 });
  }

  const contact = isAr ? buildArabicContact(cv) : buildEnglishContact(cv);
  if (contact) w.write(contact, { size: typo.contact, gap: 6 });

  if (cv.summary.trim()) {
    w.writeSection(H.summary);
    w.write(cv.summary, { size: typo.body, gap: 4 });
  }

  const experience = cv.experience.filter((e) => e.company || e.role);
  if (experience.length) {
    w.writeSection(H.experience);
    experience.forEach((e) => {
      if (isAr) {
        const roleLine = [e.role, e.company].filter(Boolean).join(" — ");
        const dates = formatDateRange(e.from, e.to, true);
        const header = dates ? `${roleLine}    ${dates}` : roleLine;
        w.write(header, { size: typo.body, bold: true, gap: 2 });
      } else {
        w.writeRoleDateLine(e.role, formatDateRange(e.from, e.to, false));
        if (e.company.trim()) {
          w.write(e.company, { size: typo.body, gap: 1.5 });
        }
      }
      if (e.desc.trim()) w.writeBullets(e.desc);
      w.write("", { gap: 1.5 });
    });
  }

  const education = cv.education.filter((e) => e.school || e.degree);
  if (education.length) {
    w.writeSection(H.education);
    education.forEach((e) => {
      const degreeText = [e.degree, e.field].filter(Boolean).join(isAr ? " - " : " in ");
      const line = [degreeText, e.school].filter(Boolean).join(isAr ? " | " : " | ");
      const dates = formatDateRange(e.from, e.to, isAr);
      w.write(dates ? `${line}    ${dates}` : line, { size: typo.body, bold: true, gap: 2 });
      const extras: string[] = [];
      if (e.showGpa && e.gpa) {
        extras.push(`${isAr ? "المعدل" : "GPA"}: ${e.gpa}${e.gpaScale ? `/${e.gpaScale}` : ""}`);
      }
      if (e.honors) extras.push(`${isAr ? "مرتبة الشرف" : "Honors"}: ${e.honors}`);
      if (extras.length) w.write(extras.join(" | "), { size: typo.small, gap: 1.5 });
      w.write("", { gap: 1.5 });
    });
  }

  const certs = (cv.certifications || []).filter((c) => c.title || c.issuer || c.date);
  if (certs.length) {
    w.writeSection(H.certifications);
    certs.forEach((c) => {
      const line = [c.title, c.issuer].filter(Boolean).join(isAr ? " — " : " — ");
      w.write(c.date ? `${line}    ${c.date}` : line, { size: typo.body, gap: 1.5 });
    });
  }

  if (cv.skills.length) {
    w.writeSection(H.skills);
    const skillsText = cv.skills
      .map((skill) => sanitizeExportText(skill, !isAr))
      .filter(Boolean)
      .join(", ");
    w.write(skillsText, { size: typo.body, gap: 4 });
  }

  const languages = cv.languages.filter((l) => l.lang);
  if (languages.length) {
    w.writeSection(H.languages);
    w.write(
      languages.map((l) => (l.level ? `${l.lang} (${l.level})` : l.lang)).join(", "),
      { size: typo.body, gap: 3 },
    );
  }

  return w.bottomY;
}

function fitsSinglePage(finalY: number): boolean {
  return finalY <= PAGE_H - MARGIN;
}

/** ATS-friendly PDF: real text layer, single column, standard section headings. */
export async function renderCvToAtsPdfBlob(
  cv: CVData,
  cvLanguage: "ar" | "en",
  _templateId?: CvTemplateId,
): Promise<Blob> {
  const isAr = cvLanguage === "ar";

  if (isAr) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    await ensureArabicFonts(doc);
    doc.setProperties({
      title: cv.personal.name ? `${cv.personal.name} - CV` : "Resume",
      subject: "Curriculum Vitae",
      creator: "Nashmi CV Builder",
      keywords: cv.skills.join(", "),
    });
    renderCvContent(doc, cv, true, EN_TYPO, false);
    return doc.output("blob");
  }

  let typo = { ...EN_TYPO };
  let doc: jsPDF | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    doc.setProperties({
      title: cv.personal.name ? `${cv.personal.name} - CV` : "Resume",
      subject: "Curriculum Vitae",
      creator: "Nashmi CV Builder",
      keywords: cv.skills.join(", "),
    });
    const finalY = renderCvContent(doc, cv, false, typo, true);
    if (fitsSinglePage(finalY) || typo.body <= MIN_FONT) break;
    typo = tightenTypography(typo);
  }

  return doc!.output("blob");
}
