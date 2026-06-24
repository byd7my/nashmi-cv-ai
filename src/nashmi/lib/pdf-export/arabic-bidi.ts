/**
 * Arabic text preparation for pdfmake-rtl ATS export.
 * Single-font rendering (Noto Sans Arabic) — no inline font switching (avoids bidi tofu boxes).
 */

export const ARABIC_RE = /[\u0600-\u06FF]/;

/**
 * Invisible bidi / format chars — these are the "empty square" tofu boxes in the PDF.
 * They are inserted by bidi engines or AI output at Arabic↔English boundaries:
 * LRM/RLM (U+200E/U+200F), Arabic letter mark (U+061C), isolates (U+2066–2069),
 * embeddings (U+202A–202E), zero-width space/joiners (U+200B–200D), BOM (U+FEFF).
 */
const BIDI_CONTROL_RE =
  /[\u200E\u200F\u061C\u2066-\u2069\u202A-\u202E\uFEFF\u200B-\u200D\u2060\u180E\u00AD\u2028\u2029\uFFF9-\uFFFB]/g;

/** Strip invisible bidi controls and normalize whitespace only — never alter digits or symbols (% / + . etc.). */
export function sanitizeArabicPdfText(text: string): string {
  return text
    .replace(BIDI_CONTROL_RE, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prepare one line for pdfmake-rtl — sanitize only; word order unchanged.
 * pdfmake-rtl handles bidi / mixed Arabic+English automatically.
 */
export function prepareArabicLine(text: string): string {
  return sanitizeArabicPdfText(text);
}

/** Alias for date / side-column strings. */
export function prepareSideText(text: string): string {
  return prepareArabicLine(text);
}

export function joinPreparedParts(parts: string[], separator: string): string {
  return parts.map((p) => prepareArabicLine(p)).join(separator);
}
