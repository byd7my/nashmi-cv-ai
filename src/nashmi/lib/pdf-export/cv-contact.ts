/**
 * Contact-link formatting shared by both the browser English (jsPDF) export
 * and the Arabic (pdfmake) docDefinition builder. Pure — no window/document/DOM.
 */

import type { CvData } from "@/nashmi/lib/cv-pdf-export";

export const PDF_LINK_COLOR = "#0000EE";

export type ContactLinkPart = { text: string; link?: string };

function toExternalUrl(raw: string): string {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

/** Phone, email, and URL fields become clickable PDF links; location stays plain text. */
export function buildContactLinkParts(cv: CvData): ContactLinkPart[] {
  const parts: ContactLinkPart[] = [];
  if (cv.phone?.trim()) {
    const phone = cv.phone.trim();
    parts.push({ text: phone, link: `tel:${phone.replace(/[^\d+]/g, "")}` });
  }
  if (cv.email?.trim()) {
    const email = cv.email.trim();
    parts.push({ text: email, link: `mailto:${email}` });
  }
  if (cv.location?.trim()) parts.push({ text: cv.location.trim() });
  if (cv.linkedin?.trim()) {
    const linkedin = cv.linkedin.trim();
    parts.push({ text: linkedin, link: toExternalUrl(linkedin) });
  }
  return parts;
}
