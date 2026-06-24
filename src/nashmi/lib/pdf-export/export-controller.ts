/**
 * Tier-aware PDF export controller.
 * English → jsPDF (cv-pdf-export.ts). Arabic → isolated pdfmake-rtl stack.
 * Elite concurrent exports use Promise.all with no shared mutable render state.
 */

import { renderCvToAtsPdfBlob, type CvData } from "@/nashmi/lib/cv-pdf-export";

import { generateArabicResumePDF } from "@/nashmi/lib/pdf-export/generateArabicResumePDF";

export type ExportLang = "ar" | "en";

export type ExportedResumeFile = {
  lang: ExportLang;
  filename: string;
  blob: Blob;
};

async function generateEnglishResumePDF(cv: CvData): Promise<Blob> {
  return renderCvToAtsPdfBlob(cv, "en");
}

/** Route a single language export to the correct isolated generator. */
export async function generateResumePDF(cv: CvData, lang: ExportLang): Promise<Blob> {
  if (lang === "ar") return generateArabicResumePDF(cv);
  return generateEnglishResumePDF(cv);
}

export type ExportResumeOptions = {
  baseName: string;
  primaryCv: CvData;
  primaryLang: ExportLang;
  /** Elite: also export the alternate language concurrently. */
  secondaryCv?: CvData;
  secondaryLang?: ExportLang;
  exportBoth?: boolean;
};

function filenameFor(baseName: string, lang: ExportLang): string {
  return `nashmi-${baseName}-${lang}.pdf`;
}

/**
 * Premium: one PDF for the active language.
 * Elite: both PDFs via Promise.all (Arabic pdfmake ∥ English jsPDF).
 */
export async function exportResumePdfs(options: ExportResumeOptions): Promise<ExportedResumeFile[]> {
  const {
    baseName,
    primaryCv,
    primaryLang,
    secondaryCv,
    secondaryLang,
    exportBoth = false,
  } = options;

  if (!exportBoth || !secondaryCv || !secondaryLang) {
    const blob = await generateResumePDF(primaryCv, primaryLang);
    return [{ lang: primaryLang, filename: filenameFor(baseName, primaryLang), blob }];
  }

  const [primaryBlob, secondaryBlob] = await Promise.all([
    generateResumePDF(primaryCv, primaryLang),
    generateResumePDF(secondaryCv, secondaryLang),
  ]);

  return [
    { lang: primaryLang, filename: filenameFor(baseName, primaryLang), blob: primaryBlob },
    { lang: secondaryLang, filename: filenameFor(baseName, secondaryLang), blob: secondaryBlob },
  ];
}
