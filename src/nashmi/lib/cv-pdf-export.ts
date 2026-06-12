import jsPDF from "jspdf";
import type { CVData } from "@/nashmi/lib/ats";
import { AR_HEADERS, EN_HEADERS } from "@/nashmi/lib/cv-parser";
import { getCvTemplateStyles, type CvTemplateId } from "@/nashmi/lib/cv-templates";

const MARGIN = 14;
const PAGE_H = 297;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

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

type WriteOpts = {
  size?: number;
  bold?: boolean;
  gap?: number;
  color?: [number, number, number];
};

class AtsPdfWriter {
  private y = MARGIN;
  private readonly x: number;
  private readonly align: "left" | "right";
  private readonly font: string;
  private readonly tpl;

  constructor(
    private readonly doc: jsPDF,
    private readonly isAr: boolean,
    templateId: CvTemplateId = "modern",
  ) {
    this.tpl = getCvTemplateStyles(templateId);
    this.x = isAr ? PAGE_W - MARGIN : MARGIN;
    this.align = isAr ? "right" : "left";
    this.font = isAr ? "Amiri" : "helvetica";
  }

  private setFont(bold: boolean, size: number) {
    this.doc.setFont(this.font, bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(17, 17, 17);
  }

  private ensureSpace(height: number) {
    if (this.y + height <= PAGE_H - MARGIN) return;
    this.doc.addPage();
    this.y = MARGIN;
  }

  write(text: string, opts: WriteOpts = {}) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const size = opts.size ?? 10;
    const gap = opts.gap ?? 2.5;
    this.setFont(Boolean(opts.bold), size);
    if (opts.color) this.doc.setTextColor(...opts.color);

    const lines = this.doc.splitTextToSize(trimmed, CONTENT_W) as string[];
    const blockH = lines.length * (size * 0.42) + gap;
    this.ensureSpace(blockH);
    this.doc.text(lines, this.x, this.y, { align: this.align, maxWidth: CONTENT_W });
    this.y += blockH;
    this.doc.setTextColor(17, 17, 17);
  }

  writeSection(title: string) {
    this.ensureSpace(10);
    this.setFont(true, 10);
    this.doc.setTextColor(17, 17, 17);
    const label =
      this.tpl.sectionTitle.textTransform === "none" ? title : this.isAr ? title : title.toUpperCase();
    this.doc.text(label, this.x, this.y, { align: this.align, maxWidth: CONTENT_W });
    this.y += 4;
    const lineY = this.y;
    const accent = this.tpl.accent;
    this.doc.setDrawColor(
      parseInt(accent.slice(1, 3), 16),
      parseInt(accent.slice(3, 5), 16),
      parseInt(accent.slice(5, 7), 16),
    );
    this.doc.setLineWidth(this.tpl.sectionTitle.borderBottom ? 0.35 : 0.2);
    this.doc.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);
    this.y += 5;
  }

  writeBullets(raw: string) {
    raw
      .split(/\n+/)
      .map((line) => line.replace(/^[\s•\-–—]+/, "").trim())
      .filter(Boolean)
      .forEach((line) => this.write(`- ${line}`, { size: 9.5, gap: 1.5 }));
  }
}

/** ATS-friendly PDF: real text layer, single column, standard section headings. */
export async function renderCvToAtsPdfBlob(
  cv: CVData,
  cvLanguage: "ar" | "en",
  templateId: CvTemplateId = "modern",
): Promise<Blob> {
  const isAr = cvLanguage === "ar";
  const H = isAr ? AR_HEADERS : EN_HEADERS;
  const tpl = getCvTemplateStyles(templateId);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  if (isAr) await ensureArabicFonts(doc);

  doc.setProperties({
    title: cv.personal.name ? `${cv.personal.name} - CV` : "Resume",
    subject: "Curriculum Vitae",
    creator: "Nashmi CV Builder",
    keywords: cv.skills.join(", "),
  });

  const w = new AtsPdfWriter(doc, isAr, templateId);

  const name = cv.personal.name || (isAr ? "الاسم الكامل" : "Full Name");
  w.write(name, { size: tpl.nameSize * 0.78, bold: true, gap: 3 });

  if (cv.personal.title) {
    w.write(cv.personal.title, { size: 11, gap: 3, color: [68, 68, 68] });
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
  if (contact) w.write(contact, { size: 9, gap: 6, color: [85, 85, 85] });

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
      if (extras.length) w.write(extras.join(" | "), { size: 9, gap: 1.5, color: [85, 85, 85] });
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
    w.write(cv.skills.join(tpl.skillsSeparator), { size: 10, gap: 5 });
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
