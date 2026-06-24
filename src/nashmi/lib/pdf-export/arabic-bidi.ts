/**
 * Arabic text preparation for pdfmake ATS export.
 * Single-font rendering (Noto Sans Arabic) — no inline font switching (avoids bidi tofu boxes).
 */

export const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;

/**
 * Invisible bidi / format chars — these are the "empty square" tofu boxes in the PDF.
 * They are inserted by bidi engines or AI output at Arabic↔English boundaries:
 * LRM/RLM (U+200E/U+200F), Arabic letter mark (U+061C), isolates (U+2066–2069),
 * embeddings (U+202A–202E), zero-width space/joiners (U+200B–200D), BOM (U+FEFF).
 */
const BIDI_CONTROL_RE =
  /[\u200E\u200F\u061C\u2066-\u2069\u202A-\u202E\uFEFF\u200B-\u200D\u2060\u180E\u00AD\u2028\u2029\uFFF9-\uFFFB]/g;

/** Replace punctuation that some fonts render as empty boxes. */
export function sanitizeArabicPdfText(text: string): string {
  return text
    .replace(BIDI_CONTROL_RE, "")
    .replace(/[\u2013\u2014\u2212\u2010\u2011]/g, "-")
    .replace(/[\u00B7\u2022\u2023\u25CF\u25E6\u2027]/g, "|")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isArabicWord(token: string): boolean {
  return ARABIC_RE.test(token) && !LATIN_WORD_RE.test(token);
}

/** pdfmake reverses contiguous Arabic word groups — pre-reverse to match editor order. */
function compensatePdfMakeWordOrder(words: string[]): string[] {
  if (words.length <= 1) return words;
  return [...words].reverse();
}

function applyWordOrderFix(tokens: string[]): string[] {
  const out = [...tokens];
  let i = 0;
  while (i < out.length) {
    if (!isArabicWord(out[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < out.length && isArabicWord(out[j])) j += 1;
    const group = out.slice(i, j);
    if (group.length > 1) {
      const fixed = compensatePdfMakeWordOrder(group);
      for (let k = 0; k < fixed.length; k += 1) out[i + k] = fixed[k];
    }
    i = j;
  }
  return out;
}

/**
 * Prepare one line for pdfmake with a single Arabic-capable font.
 * Strips bidi controls; fixes Arabic word order; leaves English/numbers unchanged.
 */
export function prepareArabicLine(text: string): string {
  const clean = sanitizeArabicPdfText(text);
  if (!clean) return "";
  if (!ARABIC_RE.test(clean)) return clean;

  const tokens = clean.split(/\s+/).filter(Boolean);
  return applyWordOrderFix(tokens).join(" ");
}

/** Alias for date / side-column strings. */
export function prepareSideText(text: string): string {
  return prepareArabicLine(text);
}

export function joinPreparedParts(parts: string[], separator: string): string {
  return parts.map((p) => prepareArabicLine(p)).join(separator);
}
