/**
 * Node-mode pdfmake-rtl renderer for the /api/generate-cv function.
 * Uses pdfmake-rtl's package "main" (js/index.js — a pdfkit-based Node
 * PdfPrinter), NOT the "build/pdfmake.js" browser bundle the site's own
 * export-controller.ts uses in the browser. Explicit deep import avoids
 * relying on a bundler's "browser" field heuristics picking the wrong build.
 *
 * Fonts must go through pdfMake.virtualfs (an in-memory store, not real
 * disk) rather than being passed as raw Buffers: pdfmake-rtl's Node
 * Printer always runs font descriptors through its URL resolver first,
 * which expects a string key (or {url,headers}) — a bare Buffer crashes
 * it. Registering "Cairo-Regular.ttf"/"Cairo-Bold.ttf" as virtualfs keys
 * mirrors exactly what the browser's addVirtualFileSystem does.
 */

import pdfMake from "pdfmake-rtl/js/index.js";
import type { TDocumentDefinitions } from "pdfmake-rtl/interfaces";

import { CAIRO_BOLD_BASE64, CAIRO_REGULAR_BASE64 } from "./cairo-font-data";

const VFS_KEYS = {
  regular: "nashmi-cairo-regular.ttf",
  bold: "nashmi-cairo-bold.ttf",
} as const;

let fontsRegistered = false;

function ensureCairoFonts(): void {
  if (fontsRegistered) return;
  const regular = Buffer.from(CAIRO_REGULAR_BASE64, "base64");
  const bold = Buffer.from(CAIRO_BOLD_BASE64, "base64");

  pdfMake.virtualfs.writeFileSync(VFS_KEYS.regular, regular);
  pdfMake.virtualfs.writeFileSync(VFS_KEYS.bold, bold);

  pdfMake.addFonts({
    Cairo: {
      normal: VFS_KEYS.regular,
      bold: VFS_KEYS.bold,
      italics: VFS_KEYS.regular,
      bolditalics: VFS_KEYS.bold,
    },
  });
  fontsRegistered = true;
}

/** Render a pdfmake docDefinition to a PDF buffer, entirely in Node. */
export async function renderArabicPdfBuffer(doc: TDocumentDefinitions): Promise<Buffer> {
  ensureCairoFonts();
  const pdfDoc = pdfMake.createPdf(doc);
  return pdfDoc.getBuffer();
}
