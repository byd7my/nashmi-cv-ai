/**
 * Isolated pdfmake-rtl engine for Arabic ATS PDFs only.
 * Uses Cairo (full Arabic + Latin in one TTF) — single font, no tofu, no font-switching.
 */

import pdfMake from "pdfmake-rtl/build/pdfmake";
import type { TDocumentDefinitions } from "pdfmake-rtl/interfaces";

/** Static Cairo TTFs — verified cmap: Latin (W), %, /, and Arabic glyphs in one file. */
const CAIRO_REGULAR =
  "https://cdn.jsdelivr.net/npm/pdfmake-rtl@2.1.2/fonts/Cairo/Cairo-Regular.ttf";
const CAIRO_BOLD =
  "https://cdn.jsdelivr.net/npm/pdfmake-rtl@2.1.2/fonts/Cairo/Cairo-Bold.ttf";

const VFS = {
  regular: "nashmi-cairo-regular.ttf",
  bold: "nashmi-cairo-bold.ttf",
} as const;

let engineReady: Promise<void> | null = null;

async function loadBinaryFont(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Arabic PDF font fetch failed: ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** One-time Arabic engine init — safe for concurrent Promise.all (single flight). */
async function ensureArabicPdfEngine(): Promise<typeof pdfMake> {
  if (!engineReady) {
    engineReady = (async () => {
      const [regular, bold] = await Promise.all([
        loadBinaryFont(CAIRO_REGULAR),
        loadBinaryFont(CAIRO_BOLD),
      ]);

      pdfMake.addVirtualFileSystem({
        [VFS.regular]: regular,
        [VFS.bold]: bold,
      });

      pdfMake.addFonts({
        Cairo: {
          normal: VFS.regular,
          bold: VFS.bold,
          italics: VFS.regular,
          bolditalics: VFS.bold,
        },
      });
    })();
  }

  await engineReady;
  return pdfMake;
}

/** Render a document definition to a real-text PDF blob (ATS). */
export async function renderArabicPdfDocument(doc: TDocumentDefinitions): Promise<Blob> {
  const engine = await ensureArabicPdfEngine();
  return engine.createPdf(doc).getBlob();
}
