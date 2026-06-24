/**
 * Arabic text preparation for pdfmake-rtl ATS export.
 * Single-font rendering (Cairo) — boundary spacing + LTR protection for Latin runs.
 */

import type { Content } from "pdfmake-rtl/interfaces";

export const ARABIC_RE = /[\u0600-\u06FF]/;

/**
 * Only true invisible bidi controls — never strip digits or visible symbols (% / + . - :).
 */
const BIDI_CONTROL_RE =
  /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF\u2060]/g;

/** Chars allowed inside a contiguous Latin/number run (never reordered internally). */
const LATIN_RUN_CHAR = /[A-Za-z0-9 .\/%+:\-]/;

/** Strip invisible bidi controls and normalize whitespace only — never alter digits or symbols. */
export function sanitizeArabicPdfText(text: string): string {
  return text
    .replace(BIDI_CONTROL_RE, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** Insert a normal space at every Arabic↔Latin/digit boundary (no zero-width chars). */
export function insertScriptBoundarySpaces(text: string): string {
  return text
    .replace(/([\u0600-\u06FF])([A-Za-z0-9])/g, "$1 $2")
    .replace(/([A-Za-z0-9])([\u0600-\u06FF])/g, "$1 $2");
}

type BidiSegment = { dir: "ltr" | "rtl"; text: string };

/** Split into RTL (Arabic + punctuation) vs LTR (Latin/number runs). */
function splitIntoBidiSegments(text: string): BidiSegment[] {
  const out: BidiSegment[] = [];
  let i = 0;
  while (i < text.length) {
    if (/[A-Za-z0-9]/.test(text[i]!)) {
      let j = i + 1;
      while (j < text.length && LATIN_RUN_CHAR.test(text[j]!)) j++;
      out.push({ dir: "ltr", text: text.slice(i, j) });
      i = j;
    } else {
      let j = i + 1;
      while (j < text.length && !/[A-Za-z0-9]/.test(text[j]!)) j++;
      out.push({ dir: "rtl", text: text.slice(i, j) });
      i = j;
    }
  }
  return out.filter((s) => s.text.length > 0);
}

/**
 * pdfmake content with Latin runs forced LTR — preserves "Windows Server", "95%", "10/11".
 */
export function prepareArabicPdfContent(text: string): Content {
  const clean = sanitizeArabicPdfText(insertScriptBoundarySpaces(text));
  if (!clean) return { text: "" };

  const segments = splitIntoBidiSegments(clean);
  if (segments.length === 1 && segments[0]!.dir === "ltr") {
    return { text: segments[0]!.text, direction: "ltr" };
  }
  if (segments.length === 1) {
    return { text: segments[0]!.text };
  }

  return {
    text: segments.map((seg) =>
      seg.dir === "ltr" ? { text: seg.text, direction: "ltr" as const } : seg.text,
    ),
  };
}

/** Plain string prep (boundary + sanitize) — for joins before content wrapping. */
export function prepareArabicLine(text: string): string {
  return sanitizeArabicPdfText(insertScriptBoundarySpaces(text));
}

/** Alias for date / side-column strings. */
export function prepareSideText(text: string): string {
  return prepareArabicLine(text);
}

export function joinPreparedParts(parts: string[], separator: string): string {
  return parts.map((p) => prepareArabicLine(p)).join(separator);
}
