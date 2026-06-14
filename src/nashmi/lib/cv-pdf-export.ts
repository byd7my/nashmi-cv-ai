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

type WriteOpts = {
  size?: number;
  bold?: boolean;
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
  ) {
    this.x = isAr ? PAGE_W - MARGIN : MARGIN;
    this.align = isAr ? "right" : "left";
    this.font = isAr ? "Amiri" : "helvetica";
  }

  private prepare(text: string): string {
    return sanitizeExportText(text, !this.isAr);
  }

  private setFont(bold: boolean, size: number) {
    this.doc.setFont(this.font, bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...BLACK);
  }

  private lineHeight(size: number): number {
    return size * 0.42;
  }

  private ensureSpace(height: number) {
    if (this.y + height <= PAGE_H - MARGIN) return;
    this.doc.addPage();
    this.y = MARGIN;
  }

  private renderLines(lines: string[], size: number, gap: number) {
    const blockH = lines.length * this.lineHeight(size) + gap;
    this.ensureSpace(blockH);
    this.doc.text(lines, this.x, this.y, { align: this.align });
    this.y += blockH;
    this.doc.setTextColor(...BLACK);
  }

  write(text: string, opts: WriteOpts = {}) {
    const trimmed = this.prepare(text);
    if (!trimmed) return;
    const size = opts.size ?? 10;
    const gap = opts.gap ?? 2.5;
    this.setFont(Boolean(opts.bold), size);
    const lines = this.doc.splitTextToSize(trimmed, CONTENT_W) as string[];
    this.renderLines(lines, size, gap);
  }

  writeSection(title: string) {
    this.ensureSpace(10);
    this.setFont(true, 10);
    const label = this.prepare(this.isAr ? title : title.toUpperCase());
    const lines = this.doc.splitTextToSize(label, CONTENT_W) as string[];
    this.renderLines(lines, 10, 4);
    const lineY = this.y - 1;
    this.doc.setDrawColor(...BLACK);
    this.doc.setLineWidth(RULE_WIDTH);
    this.doc.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);
    this.y += 5;
  }

  writeBullets(raw: string) {
    raw
      .split(/\n+/)
      .map((line) => this.prepare(line.replace(/^[\s•\-–—]+/, "")))
      .filter(Boolean)
      .forEach((line) => this.write(`- ${line}`, { size: 9.5, gap: 1.5 }));
  }
}

/** ATS-friendly PDF: real text layer, single column, standard section headings. */
export async function renderCvToAtsPdfBlob(
  cv: CVData,
  cvLanguage: "ar" | "en",
  _templateId?: CvTemplateId,
): Promise<Blob> {
  const isAr = cvLanguage === "ar";
  const H = isAr ? AR_HEADERS : EN_HEADERS;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  if (isAr) await ensureArabicFonts(doc);

  doc.setProperties({
    title: cv.personal.name ? `${cv.personal.name} - CV` : "Resume",
    subject: "Curriculum Vitae",
    creator: "Nashmi CV Builder",
    keywords: cv.skills.join(", "),
  });

  const w = new AtsPdfWriter(doc, isAr);

  const name = cv.personal.name || (isAr ? "الاسم الكامل" : "Full Name");
  w.write(name, { size: 18, bold: true, gap: 3 });

  if (cv.personal.title) {
    w.write(cv.personal.title, { size: 11, gap: 3 });
  }

  const contact = [
    cv.personal.email,
    cv.personal.phone,
    cv.personal.city,
    cv.personal.linkedin,
    cv.personal.website,
  ]
    .filter(Boolean)
    .join(" | ");
  if (contact) w.write(contact, { size: 9, gap: 6 });

  if (cv.summary.trim()) {
    w.writeSection(H.summary);
    w.write(cv.summary, { size: 10, gap: 5 });
  }

  const experience = cv.experience.filter((e) => e.company || e.role);
  if (experience.length) {
    w.writeSection(H.experience);
    experience.forEach((e) => {
      const roleLine = [e.role, e.company].filter(Boolean).join(isAr ? " — " : " — ");
      const dates = [e.from, e.to].filter(Boolean).join(isAr ? " – " : " – ");
      const header = dates ? `${roleLine}    ${dates}` : roleLine;
      w.write(header, { size: 10, bold: true, gap: 2 });
      if (e.desc.trim()) w.writeBullets(e.desc);
      w.write("", { gap: 2 });
    });
  }

  const education = cv.education.filter((e) => e.school || e.degree);
  if (education.length) {
    w.writeSection(H.education);
    education.forEach((e) => {
      const degreeText = [e.degree, e.field].filter(Boolean).join(isAr ? " - " : " in ");
      const line = [degreeText, e.school].filter(Boolean).join(isAr ? " | " : " | ");
      const dates = [e.from, e.to].filter(Boolean).join(isAr ? " – " : " – ");
      w.write(dates ? `${line}    ${dates}` : line, { size: 10, bold: true, gap: 2 });
      const extras: string[] = [];
      if (e.showGpa && e.gpa) {
        extras.push(`${isAr ? "المعدل" : "GPA"}: ${e.gpa}${e.gpaScale ? `/${e.gpaScale}` : ""}`);
      }
      if (e.honors) extras.push(`${isAr ? "مرتبة الشرف" : "Honors"}: ${e.honors}`);
      if (extras.length) w.write(extras.join(" | "), { size: 9, gap: 1.5 });
      w.write("", { gap: 2 });
    });
  }

  const certs = (cv.certifications || []).filter((c) => c.title || c.issuer || c.date);
  if (certs.length) {
    w.writeSection(H.certifications);
    certs.forEach((c) => {
      const line = [c.title, c.issuer].filter(Boolean).join(isAr ? " — " : " — ");
      w.write(c.date ? `${line}    ${c.date}` : line, { size: 10, gap: 2 });
    });
  }

  if (cv.skills.length) {
    w.writeSection(H.skills);
    const skillsText = cv.skills
      .map((skill) => sanitizeExportText(skill, !isAr))
      .filter(Boolean)
      .join(", ");
    w.write(skillsText, { size: 10, gap: 5 });
  }

  const languages = cv.languages.filter((l) => l.lang);
  if (languages.length) {
    w.writeSection(H.languages);
    w.write(
      languages.map((l) => (l.level ? `${l.lang} (${l.level})` : l.lang)).join(", "),
      { size: 10, gap: 4 },
    );
  }

  return doc.output("blob");
}
