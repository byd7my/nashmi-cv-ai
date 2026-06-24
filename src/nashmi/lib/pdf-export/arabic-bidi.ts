/**
 * Arabic text preparation for pdfmake-rtl ATS export.
 * Single-font rendering (Cairo) — no inline font switching (avoids bidi tofu boxes).
 */

export const ARABIC_RE = /[\u0600-\u06FF]/;

/**
 * Only true invisible bidi controls — never strip digits or visible symbols (% / + . - :).
 * LRM/RLM (U+200E/U+200F), Arabic letter mark (U+061C), embeddings (U+202A–U+202E),
 * isolates (U+2066–U+2069), zero-width space/joiners (U+200B–U+200D), BOM (U+FEFF), WJ (U+2060).
 */
const BIDI_CONTROL_RE =
  /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF\u2060]/g;

/** Strip invisible bidi controls and normalize whitespace only — never alter digits or symbols. */
export function sanitizeArabicPdfText(text: string): string {
  return text
    .replace(BIDI_CONTROL_RE, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
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
