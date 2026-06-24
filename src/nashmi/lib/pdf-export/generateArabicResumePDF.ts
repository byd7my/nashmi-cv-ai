/**
 * Standalone Arabic ATS PDF generator — fully isolated from English jsPDF export.
 */

import type { CvData } from "@/nashmi/lib/cv-pdf-export";

import { buildArabicResumeDocument } from "@/nashmi/lib/pdf-export/arabic-resume-document";
import { renderArabicPdfDocument } from "@/nashmi/lib/pdf-export/arabic-pdf-engine";

/**
 * Generate a real-text, ATS-friendly Arabic resume PDF.
 * Does not read or mutate any English PDF settings.
 */
export async function generateArabicResumePDF(cv: CvData): Promise<Blob> {
  const doc = buildArabicResumeDocument(cv);
  return renderArabicPdfDocument(doc);
}
