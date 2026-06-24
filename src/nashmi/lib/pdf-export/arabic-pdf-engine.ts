/**
 * Isolated pdfmake engine for Arabic ATS PDFs only.
 * Uses full Noto Sans Arabic (Arabic + Latin glyphs) — one font, no mixed-font tofu.
 */

import pdfMake from "pdfmake/build/pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

/** Full TTF — includes Arabic script + basic Latin (digits, punctuation, English). */
const NOTO_ARABIC_REGULAR =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-fonts@main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf";
const NOTO_ARABIC_BOLD =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-fonts@main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf";

const VFS = {
  regular: "nashmi-noto-arabic-regular.ttf",
  bold: "nashmi-noto-arabic-bold.ttf",
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
        loadBinaryFont(NOTO_ARABIC_REGULAR),
        loadBinaryFont(NOTO_ARABIC_BOLD),
      ]);

      pdfMake.addVirtualFileSystem({
        [VFS.regular]: regular,
        [VFS.bold]: bold,
      });

      pdfMake.addFonts({
        NotoSansArabic: {
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
