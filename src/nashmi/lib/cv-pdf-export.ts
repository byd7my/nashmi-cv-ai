/**
 * cv-pdf-export.ts
 * Pure jsPDF ATS-compatible export — Professional template only.
 * Single column, real selectable text, black only, 1 page A4.
 *
 * REPLACE the entire file content with this code.
 * Do not change the function signature.
 */

import { jsPDF } from "jspdf";
import { ArabicShaper } from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";
import { loadPdfJs } from "@/nashmi/lib/cv-parser";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CvExperience {
  jobTitle: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface CvEducation {
  institution: string;
  location?: string;
  degree: string;
  year: string;
  gpa?: string;
  honors?: string;
  bullets?: string[];
}

export interface CvCertification {
  name: string;
  issuer?: string;
  year: string;
}

export interface CvProject {
  name: string;
  institution?: string;
  year?: string;
  bullets: string[];
}

export interface CvProjects {
  enabled: boolean;
  items: CvProject[];
}

export interface CvData {
  fullName: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  location?: string;
  summary?: string;
  experience?: CvExperience[];
  education?: CvEducation[];
  certifications?: CvCertification[];
  projects?: CvProjects;
  skills?: string[];          // raw skills list — auto-split into hard/soft
  hardSkills?: string[];      // optional explicit override
  softSkills?: string[];      // optional explicit override
  languages?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_W   = 595.28;
const PAGE_H   = 841.89;
const MARGIN_L = 51.4;
const MARGIN_R = 543.9;
const CONTENT_W = MARGIN_R - MARGIN_L;   // 492.5pt
const PAGE_BOTTOM = PAGE_H - 30;

const TECHNICAL_KEYWORDS = [
  "windows","linux","cisco","network","server","active directory",
  "microsoft","tcp","ip","dns","dhcp","vpn","routing","switching",
  "python","javascript","typescript","sql","html","css","react","node",
  "aws","azure","docker","git","solidworks","autocad","cad","cam",
  "matlab","arduino","iot","troubleshoot","hardware","software",
  "database","programming","coding","design","analysis","itil",
  "monitoring","firewall","wireless","wifi","ethernet","backup",
  "virtualization","vmware","hyper-v","powershell","bash","scripting",
];

const AMIRI_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-400-normal.ttf";
const AMIRI_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/amiri@5.2.8/arabic-700-normal.ttf";

let arabicFontsLoaded = false;
const bidi = bidiFactory();

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

// ─── Arabic reshaping ─────────────────────────────────────────────────────────

async function reshapeArabic(text: string): Promise<string> {
  if (!text || !/[\u0600-\u06FF]/.test(text)) return text;
  try {
    const shaped = ArabicShaper.convertArabic(text);
    const levels = bidi.getEmbeddingLevels(shaped);
    return bidi.getReorderedString(shaped, levels);
  } catch {
    return text;
  }
}

// ─── Skill splitter ───────────────────────────────────────────────────────────

function splitSkills(skills: string[]): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const skill of skills) {
    const lower = skill.toLowerCase();
    const isTech = TECHNICAL_KEYWORDS.some((kw) => lower.includes(kw));
    if (isTech) hard.push(skill);
    else         soft.push(skill);
  }
  return { hard, soft };
}

// ─── PDF renderer class ───────────────────────────────────────────────────────

class PdfRenderer {
  doc: jsPDF;
  y: number;
  fontSize: number;
  lineH: number;
  lang: string;
  fontFamily: "helvetica" | "Amiri" = "helvetica";

  constructor(lang: string) {
    this.doc      = new jsPDF({ unit: "pt", format: "a4" });
    this.y        = 38;
    this.fontSize = 8;
    this.lineH    = 11;
    this.lang     = lang;
    this.doc.setTextColor(0, 0, 0);
  }

  // Draw a full-width horizontal rule
  drawLine() {
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN_L, this.y, MARGIN_R, this.y);
    this.y += 5;
  }

  // Set font safely
  setFont(style: "normal" | "bold" | "italic" | "bolditalic", size: number) {
    this.doc.setTextColor(0, 0, 0);
    if (this.fontFamily === "Amiri") {
      const bold = style === "bold" || style === "bolditalic";
      this.doc.setFont("Amiri", bold ? "bold" : "normal");
    } else {
      this.doc.setFont("helvetica", style);
    }
    this.doc.setFontSize(size);
  }

  // Render wrapped text, return new y
  renderText(
    text: string,
    x: number,
    maxWidth: number,
    size: number,
    style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
    align: "left" | "center" | "right" = "left"
  ): number {
    if (!text || text.trim() === "") return this.y;
    this.setFont(style, size);
    const lines = this.doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (this.y > PAGE_BOTTOM) break;
      let xPos = x;
      if (align === "center") xPos = PAGE_W / 2;
      if (align === "right")  xPos = MARGIN_R;
      this.doc.text(line, xPos, this.y, { align });
      this.y += this.lineH;
    }
    return this.y;
  }

  // Render right-aligned text on the SAME line as current y (no y advance)
  renderRight(text: string, size: number, style: "normal" | "bold" = "normal") {
    if (!text || text.trim() === "") return;
    this.setFont(style, size);
    this.doc.text(text, MARGIN_R, this.y, { align: "right" });
  }

  // Section header: title above underline + full-width rule
  renderSectionHeader(title: string) {
    this.y += 8;
    this.setFont("bold", 9);
    const label = title.toUpperCase();
    this.doc.text(label, MARGIN_L, this.y);
    const w = this.doc.getTextWidth(label);
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN_L, this.y + 1.5, MARGIN_L + w, this.y + 1.5);
    this.y += 9;
    this.drawLine();
    this.y += 6;
  }

  renderSectionHeaderAr(title: string) {
    this.y += 8;
    this.setFont("bold", 9);
    this.doc.text(title, MARGIN_R, this.y, { align: "right" });
    const w = this.doc.getTextWidth(title);
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN_R - w, this.y + 1.5, MARGIN_R, this.y + 1.5);
    this.y += 9;
    this.drawLine();
    this.y += 6;
  }

  renderSplitRow(left: string, right: string, boldLeft = true) {
    if (!left && !right) return;
    if (left) {
      this.setFont(boldLeft ? "bold" : "normal", 8);
      this.doc.text(left, MARGIN_L, this.y);
    }
    if (right) {
      this.setFont("normal", 8);
      this.doc.text(right, MARGIN_R, this.y, { align: "right" });
    }
    this.y += this.lineH;
  }

  renderSplitRowAr(left: string, right: string, boldLeft = true) {
    if (!left && !right) return;
    if (left) {
      this.setFont(boldLeft ? "bold" : "normal", 8);
      this.doc.text(left, MARGIN_R, this.y, { align: "right" });
    }
    if (right) {
      this.setFont("normal", 8);
      this.doc.text(right, MARGIN_L, this.y);
    }
    this.y += this.lineH;
  }

  // Experience / education bullets: "- " prefix
  renderDashBullet(text: string) {
    if (!text || text.trim() === "") return;
    this.setFont("normal", 8);
    const wrapX = 61.4;
    const maxW = MARGIN_R - wrapX;
    const lines = this.doc.splitTextToSize(text, maxW) as string[];
    for (let i = 0; i < lines.length; i += 1) {
      if (this.y > PAGE_BOTTOM) break;
      const x = i === 0 ? 53.4 : wrapX;
      this.doc.text(i === 0 ? `- ${lines[i]}` : lines[i], x, this.y);
      this.y += this.lineH;
    }
  }

  renderDashBulletAr(text: string) {
    if (!text || text.trim() === "") return;
    this.setFont("normal", 8);
    const maxW = CONTENT_W - 16;
    const lines = this.doc.splitTextToSize(text, maxW) as string[];
    for (let i = 0; i < lines.length; i += 1) {
      if (this.y > PAGE_BOTTOM) break;
      if (i === 0) this.doc.text("-", MARGIN_L, this.y);
      this.doc.text(lines[i], MARGIN_R, this.y, { align: "right" });
      this.y += this.lineH;
    }
  }

  // Legacy bullet (unused in main layout)
  renderBullet(text: string, size = 8, indentX = 65, wrapX = 78) {
    if (!text || text.trim() === "") return;
    this.setFont("normal", size);
    const maxW = MARGIN_R - wrapX;
    const lines = this.doc.splitTextToSize(text, maxW);
    // First line with "o "
    if (this.y <= PAGE_BOTTOM) {
      this.doc.text("o", indentX, this.y);
      this.doc.text(lines[0], wrapX, this.y);
      this.y += this.lineH;
    }
    // Continuation lines
    for (let i = 1; i < lines.length; i++) {
      if (this.y > PAGE_BOTTOM) break;
      this.doc.text(lines[i], wrapX, this.y);
      this.y += this.lineH;
    }
  }

  // Sub-section label inside OTHER: "● Label:"
  renderSubHeader(label: string) {
    if (this.y > PAGE_BOTTOM) return;
    this.setFont("bold", 9);
    this.doc.text(`\u25CF ${label}`, MARGIN_L + 6, this.y);
    this.y += this.lineH;
  }
}

// ─── English PDF builder ───────────────────────────────────────────────────────

function buildEnglishPdf(cv: CvData): Blob {
  const r = new PdfRenderer("en");

  // ── HEADER ──────────────────────────────────────────────────────────────────
  r.setFont("bold", 19);
  r.doc.text(cv.fullName || "Full Name", PAGE_W / 2, r.y, { align: "center" });
  r.y += 14;

  if (cv.jobTitle) {
    r.setFont("normal", 9.5);
    r.doc.text(cv.jobTitle, PAGE_W / 2, r.y, { align: "center" });
    r.y += 12;
  }

  // Contact line
  const contactParts: string[] = [];
  if (cv.phone)    contactParts.push(cv.phone);
  if (cv.email)    contactParts.push(cv.email);
  if (cv.location) contactParts.push(cv.location);
  if (cv.linkedin) contactParts.push(cv.linkedin);
  if (contactParts.length > 0) {
    r.setFont("normal", 8);
    r.doc.text(contactParts.join("  |  "), PAGE_W / 2, r.y, { align: "center" });
    r.y += 8;
  }

  r.y += 2;
  r.drawLine();
  r.y += 2;

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  if (cv.summary && cv.summary.trim()) {
    r.renderSectionHeader("Summary");
    r.renderText(cv.summary, MARGIN_L, CONTENT_W, 8);
    r.y += 6;
  }

  // ── EXPERIENCE ───────────────────────────────────────────────────────────
  if (cv.experience && cv.experience.length > 0) {
    r.renderSectionHeader("Experience");
    for (const exp of cv.experience) {
      if (r.y > PAGE_BOTTOM) break;
      const titlePart = exp.jobTitle || "";
      const placePart = [exp.company, exp.location].filter(Boolean).join(" | ");
      const headerLeft = titlePart && placePart
        ? `${titlePart} \u2014 ${placePart}`
        : titlePart || placePart;
      const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(" \u2013 ");
      r.renderSplitRow(headerLeft, dateStr, true);
      for (const bullet of exp.bullets || []) {
        r.renderDashBullet(bullet);
      }
      r.y += 6;
    }
  }

  // ── EDUCATION ────────────────────────────────────────────────────────────
  if (cv.education && cv.education.length > 0) {
    r.renderSectionHeader("Education");
    for (const edu of cv.education) {
      if (r.y > PAGE_BOTTOM) break;
      const eduLeft = [edu.degree, edu.institution].filter(Boolean).join(" | ");
      r.renderSplitRow(eduLeft, edu.year || "", true);
      const extras: string[] = [];
      if (edu.gpa) extras.push(`GPA: ${edu.gpa}`);
      if (edu.honors) extras.push(edu.honors);
      if (extras.length) {
        r.renderText(extras.join("  |  "), MARGIN_L, CONTENT_W, 8);
      }
      r.y += 6;
    }
  }

  // ── CERTIFICATIONS & TRAINING ────────────────────────────────────────────
  if (cv.certifications && cv.certifications.length > 0) {
    r.renderSectionHeader("Certifications & Training");
    for (const cert of cv.certifications) {
      if (r.y > PAGE_BOTTOM) break;
      const left = [cert.name, cert.issuer].filter(Boolean).join(" \u2014 ");
      r.renderSplitRow(left, cert.year || "", true);
    }
    r.y += 4;
  }

  // ── SKILLS ─────────────────────────────────────────────────────────────────
  if (cv.skills && cv.skills.length > 0) {
    r.renderSectionHeader("Skills");
    r.renderText(cv.skills.join(" \u00B7 "), MARGIN_L, CONTENT_W, 8);
    r.y += 4;
  }

  // ── LANGUAGES ──────────────────────────────────────────────────────────────
  if (cv.languages && cv.languages.length > 0) {
    r.renderSectionHeader("Languages");
    r.renderText(cv.languages.join(" \u00B7 "), MARGIN_L, CONTENT_W, 8);
  }

  return r.doc.output("blob");
}

// ─── Arabic PDF builder ────────────────────────────────────────────────────────

async function buildArabicPdf(cv: CvData): Promise<Blob> {
  const r = new PdfRenderer("ar");
  await ensureArabicFonts(r.doc);
  r.fontFamily = "Amiri";

  const ar = async (text: string) => reshapeArabic(text);

  // ── HEADER (centered) ──────────────────────────────────────────────────────
  r.setFont("bold", 20);
  const name = await ar(cv.fullName || "");
  r.doc.text(name, PAGE_W / 2, r.y, { align: "center" });
  r.y += 14;

  if (cv.jobTitle) {
    const title = await ar(cv.jobTitle);
    r.setFont("normal", 10);
    r.doc.text(title, PAGE_W / 2, r.y, { align: "center" });
    r.y += 12;
  }

  // Contact (phone/email stay LTR)
  const contactParts: string[] = [];
  if (cv.phone)    contactParts.push(cv.phone);
  if (cv.email)    contactParts.push(cv.email);
  if (cv.location) contactParts.push(cv.location);
  if (cv.linkedin) contactParts.push(cv.linkedin);
  if (contactParts.length > 0) {
    r.setFont("normal", 8);
    r.doc.text(contactParts.join("  |  "), PAGE_W / 2, r.y, { align: "center" });
    r.y += 8;
  }
  r.y += 2;
  r.drawLine();
  r.y += 2;

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  if (cv.summary && cv.summary.trim()) {
    r.renderSectionHeaderAr(await ar("الملخص المهني"));
    const summaryText = await ar(cv.summary);
    r.setFont("normal", 8);
    const lines = r.doc.splitTextToSize(summaryText, CONTENT_W);
    for (const line of lines) {
      if (r.y > PAGE_BOTTOM) break;
      r.doc.text(line, MARGIN_R, r.y, { align: "right" });
      r.y += r.lineH;
    }
    r.y += 6;
  }

  // ── EXPERIENCE ─────────────────────────────────────────────────────────────
  if (cv.experience && cv.experience.length > 0) {
    r.renderSectionHeaderAr(await ar("الخبرة"));
    for (const exp of cv.experience) {
      if (r.y > PAGE_BOTTOM) break;
      const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(" \u2013 ");
      const titlePart = await ar(exp.jobTitle || "");
      const placePart = await ar([exp.company, exp.location].filter(Boolean).join(" | "));
      const headerLeft = titlePart && placePart
        ? `${titlePart} \u2014 ${placePart}`
        : titlePart || placePart;
      r.renderSplitRowAr(headerLeft, dateStr, true);
      for (const bullet of exp.bullets || []) {
        r.renderDashBulletAr(await ar(bullet));
      }
      r.y += 6;
    }
  }

  // ── EDUCATION ──────────────────────────────────────────────────────────────
  if (cv.education && cv.education.length > 0) {
    r.renderSectionHeaderAr(await ar("التعليم"));
    for (const edu of cv.education) {
      if (r.y > PAGE_BOTTOM) break;
      const eduLeft = await ar([edu.degree, edu.institution].filter(Boolean).join(" | "));
      r.renderSplitRowAr(eduLeft, edu.year || "", true);
      const extras: string[] = [];
      if (edu.gpa) extras.push(`GPA: ${edu.gpa}`);
      if (edu.honors) extras.push(await ar(edu.honors));
      if (extras.length) {
        r.renderText(extras.join("  |  "), MARGIN_R, CONTENT_W, 8, "normal", "right");
      }
      r.y += 6;
    }
  }

  // ── CERTIFICATIONS ─────────────────────────────────────────────────────────
  if (cv.certifications && cv.certifications.length > 0) {
    r.renderSectionHeaderAr(await ar("الشهادات والدورات"));
    for (const cert of cv.certifications) {
      if (r.y > PAGE_BOTTOM) break;
      const left = await ar([cert.name, cert.issuer].filter(Boolean).join(" \u2014 "));
      r.renderSplitRowAr(left, cert.year || "", true);
    }
    r.y += 4;
  }

  // ── SKILLS ─────────────────────────────────────────────────────────────────
  if (cv.skills && cv.skills.length > 0) {
    r.renderSectionHeaderAr(await ar("المهارات"));
    const skillsText = (await Promise.all(cv.skills.map((s) => ar(s)))).join(" \u00B7 ");
    r.renderText(skillsText, MARGIN_R, CONTENT_W, 8, "normal", "right");
    r.y += 4;
  }

  // ── LANGUAGES ──────────────────────────────────────────────────────────────
  if (cv.languages && cv.languages.length > 0) {
    r.renderSectionHeaderAr(await ar("اللغات"));
    const langsText = cv.languages.join(" \u00B7 ");
    r.renderText(langsText, MARGIN_R, CONTENT_W, 8, "normal", "right");
  }

  return r.doc.output("blob");
}

// ─── PDF IMPORT PARSER ─────────────────────────────────────────────────────────
// Place this in src/nashmi/lib/cv-pdf-import.ts (new file)
// and call it from your import button handler.

/**
 * parsePdfToCvData
 * Reads a PDF file and extracts CV fields.
 * Works for nashmi-exported PDFs AND external PDFs.
 * Returns a partial CvData object.
 */
export async function parsePdfToCvData(file: File): Promise<Partial<CvData>> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  if (fullText.trim().length < 50) {
    throw new Error(
      "هذا الـ PDF لا يحتوي على نص قابل للقراءة. " +
      "يرجى رفع PDF نصي (مثل ملفات نشمي) وليس صورة ممسوحة ضوئياً."
    );
  }

  // ── Simple section parser ────────────────────────────────────────────────
  const lines = fullText.split(/\n/).map((l) => l.trim()).filter(Boolean);

  const cv: Partial<CvData> = {
    experience: [],
    education: [],
    certifications: [],
    languages: [],
    skills: [],
    projects: { enabled: false, items: [] },
  };

  // Name: usually first non-empty line
  if (lines[0]) cv.fullName = lines[0];
  if (lines[1] && !lines[1].includes("@") && !lines[1].match(/\d{9}/)) {
    cv.jobTitle = lines[1];
  }

  // Contact line
  for (const line of lines.slice(0, 5)) {
    const emailMatch = line.match(/[\w.+-]+@[\w-]+\.\w+/);
    if (emailMatch) cv.email = emailMatch[0];
    const phoneMatch = line.match(/\+?[\d\s\-]{9,}/);
    if (phoneMatch) cv.phone = phoneMatch[0].trim();
    const linkedinMatch = line.match(/linkedin\.com\/in\/[\w-]+/i);
    if (linkedinMatch) cv.linkedin = linkedinMatch[0];
  }

  // Section detection
  type Section =
    | "summary" | "experience" | "education"
    | "certifications" | "skills" | "languages"
    | "projects" | "other" | null;

  let currentSection: Section = null;
  let currentExp: CvExperience | null = null;
  let currentEdu: CvEducation | null = null;
  let currentProj: CvProject | null = null;
  let summaryLines: string[] = [];

  const SECTION_MAP: Record<string, Section> = {
    "summary": "summary",
    "professional summary": "summary",
    "الملخص": "summary",
    "experience": "experience",
    "work experience": "experience",
    "الخبرة": "experience",
    "education": "education",
    "التعليم": "education",
    "certifications": "certifications",
    "certifications & training": "certifications",
    "الشهادات": "certifications",
    "skills": "skills",
    "technical skills": "skills",
    "المهارات": "skills",
    "languages": "languages",
    "اللغات": "languages",
    "projects": "projects",
    "المشاريع": "projects",
    "other": "other",
    "أخرى": "other",
  };

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:\-_]/g, "").trim();

    // Check if this is a section header
    const detectedSection = SECTION_MAP[lower];
    if (detectedSection) {
      // Save any in-progress entries
      if (currentExp) { cv.experience!.push(currentExp); currentExp = null; }
      if (currentEdu) { cv.education!.push(currentEdu); currentEdu = null; }
      if (currentProj && cv.projects) {
        cv.projects.items.push(currentProj);
        currentProj = null;
      }
      currentSection = detectedSection;
      if (currentSection === "summary") summaryLines = [];
      continue;
    }

    // Parse by section
    switch (currentSection) {
      case "summary":
        summaryLines.push(line);
        cv.summary = summaryLines.join(" ");
        break;

      case "experience": {
        // Date pattern: "Oct 2025 – Dec 2025" or "Jun 2025 Aug 2025"
        const dateMatch = line.match(
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[–\-]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i
        );
        if (dateMatch) {
          if (currentExp) cv.experience!.push(currentExp);
          const [start, end] = dateMatch[0].split(/[–\-]/).map((s) => s.trim());
          // Job title is usually on the same line, before the date
          const jobTitle = line.replace(dateMatch[0], "").trim();
          currentExp = { jobTitle, company: "", startDate: start, endDate: end, bullets: [] };
        } else if (currentExp && !currentExp.company && !line.startsWith("o ") && !line.startsWith("-")) {
          currentExp.company = line;
        } else if (currentExp && (line.startsWith("o ") || line.startsWith("- "))) {
          currentExp.bullets.push(line.replace(/^[o\-]\s*/, "").trim());
        }
        break;
      }

      case "education": {
        const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
        if (yearMatch && !currentEdu) {
          currentEdu = {
            institution: line.replace(yearMatch[0], "").trim(),
            degree: "",
            year: yearMatch[0],
          };
        } else if (currentEdu && !currentEdu.degree && !line.startsWith("o ")) {
          currentEdu.degree = line;
          const gpaMatch = line.match(/GPA[:\s]+([\d.]+)/i);
          if (gpaMatch) currentEdu.gpa = gpaMatch[1];
        } else if (currentEdu && (line.startsWith("o ") || line.startsWith("- "))) {
          currentEdu.bullets = currentEdu.bullets || [];
          currentEdu.bullets.push(line.replace(/^[o\-]\s*/, "").trim());
        }
        break;
      }

      case "certifications":
      case "other": {
        // Skip sub-headers like "● Courses and Certifications:"
        if (line.startsWith("\u25CF") || line.startsWith("●")) break;
        if (line.startsWith("o ") || line.startsWith("- ")) {
          const certText = line.replace(/^[o\-\s●]+/, "").trim();
          const yearMatch = certText.match(/\b(20\d{2}|19\d{2})\b/);
          cv.certifications!.push({
            name: certText.replace(yearMatch ? yearMatch[0] : "", "").replace(/\|.*$/, "").trim(),
            year: yearMatch ? yearMatch[0] : "",
          });
        }
        break;
      }

      case "skills": {
        const skillList = line.split(/[,·\|]/).map((s) => s.trim()).filter(Boolean);
        cv.skills = [...(cv.skills || []), ...skillList];
        break;
      }

      case "languages": {
        const langList = line.split(/[,·\|]/).map((s) => s.trim()).filter(Boolean);
        cv.languages = [...(cv.languages || []), ...langList];
        break;
      }

      case "projects": {
        if (line.startsWith("o ") || line.startsWith("- ")) {
          if (!currentProj) currentProj = { name: "Project", bullets: [] };
          currentProj.bullets.push(line.replace(/^[o\-]\s*/, "").trim());
        } else if (!line.startsWith("\u25CF")) {
          if (currentProj && cv.projects) cv.projects.items.push(currentProj);
          currentProj = { name: line, bullets: [] };
          if (cv.projects) cv.projects.enabled = true;
        }
        break;
      }
    }
  }

  // Push any remaining open entries
  if (currentExp) cv.experience!.push(currentExp);
  if (currentEdu) cv.education!.push(currentEdu);
  if (currentProj && cv.projects) cv.projects.items.push(currentProj);

  return cv;
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * renderCvToAtsPdfBlob
 * Main entry point — called from BuilderPage.tsx
 * @param cv       - CV data object
 * @param lang     - "en" | "ar"
 * @param template - ignored (Professional is the only template)
 */
export async function renderCvToAtsPdfBlob(
  cv: CvData,
  lang: "en" | "ar",
  template?: string
): Promise<Blob> {
  if (lang === "ar") {
    return await buildArabicPdf(cv);
  }
  return buildEnglishPdf(cv);
}
