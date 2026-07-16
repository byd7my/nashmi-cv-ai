/**
 * Node-mode pdfmake-rtl renderer for POST /api/generate-cv.
 * Instantiates the package's PdfPrinter directly (js/Printer.js — the
 * pdfkit-based Node engine, NOT the "build/pdfmake.js" browser bundle the
 * site's own export-controller.ts uses) with the Cairo TTFs passed as raw
 * Buffers. This deliberately bypasses pdfmake's singleton + virtual-fs
 * layer: virtual-fs.js references CJS __dirname, which crashes after the
 * server bundler converts it to ESM. pdfkit's .font() accepts Buffers, and
 * with no urlResolver the Printer skips URL resolution entirely — verified
 * against the built .vercel/output function.
 */

import PdfPrinter from "pdfmake-rtl/js/Printer.js";
import type { TDocumentDefinitions } from "pdfmake-rtl/interfaces";

import { CAIRO_BOLD_BASE64, CAIRO_REGULAR_BASE64 } from "./cairo-font-data.server";

type PdfKitDocument = NodeJS.ReadableStream & { end(): void };
type PrinterInstance = {
  createPdfKitDocument(
    doc: TDocumentDefinitions,
    options?: Record<string, unknown>,
  ): Promise<PdfKitDocument>;
};

let printer: PrinterInstance | null = null;

function ensurePrinter(): PrinterInstance {
  if (printer) return printer;
  const regular = Buffer.from(CAIRO_REGULAR_BASE64, "base64");
  const bold = Buffer.from(CAIRO_BOLD_BASE64, "base64");
  printer = new (PdfPrinter as unknown as new (
    fonts: Record<string, unknown>,
    virtualfs: null,
    urlResolver: null,
  ) => PrinterInstance)(
    {
      Cairo: {
        normal: regular,
        bold: bold,
        italics: regular,
        bolditalics: bold,
      },
    },
    null,
    null,
  );
  return printer;
}

/** Render a pdfmake docDefinition to a PDF buffer, entirely in Node. */
export async function renderArabicPdfBuffer(doc: TDocumentDefinitions): Promise<Buffer> {
  const pdfDoc = await ensurePrinter().createPdfKitDocument(doc, {});
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}
