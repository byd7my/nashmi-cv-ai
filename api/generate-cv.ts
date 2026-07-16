/**
 * POST /api/generate-cv — standalone Vercel serverless function.
 * Renders a CV PDF (Arabic pdfmake / English jsPDF) for the external
 * Telegram bot to call directly. Never used by the website itself.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";

import { buildArabicResumeDocument } from "@/nashmi/lib/pdf-export/arabic-resume-document";
import { buildEnglishPdf, type CvData } from "@/nashmi/lib/cv-pdf-export";

import { renderArabicPdfBuffer } from "./_lib/arabic-pdf-node";

type GenerateCvBody = CvData & { language?: string };

const ARRAY_FIELDS = ["experience", "education", "certifications", "skills", "languages"] as const;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(payload);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("Empty body");
  return JSON.parse(raw);
}

/** Returns an error message describing the first missing/invalid field, or null if valid. */
function validateBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return "Request body must be a JSON object";
  }
  const cv = body as GenerateCvBody;

  if (cv.language !== "ar" && cv.language !== "en") {
    return 'Invalid or missing "language" (expected "ar" or "en")';
  }
  if (typeof cv.fullName !== "string" || !cv.fullName.trim()) {
    return "Missing required field: fullName";
  }
  for (const field of ARRAY_FIELDS) {
    const value = cv[field];
    if (value !== undefined && !Array.isArray(value)) {
      return `Field '${field}' must be an array`;
    }
  }
  return null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const expectedKey = process.env.INTERNAL_API_KEY;
  const providedKey = req.headers["x-internal-key"];
  const providedKeyStr = Array.isArray(providedKey) ? providedKey[0] : providedKey;

  if (!expectedKey) {
    console.error("[api/generate-cv] INTERNAL_API_KEY is not set");
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }
  if (!providedKeyStr || !safeEqual(providedKeyStr, expectedKey)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const validationError = validateBody(body);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const cv = body as GenerateCvBody;
  const language = cv.language as "ar" | "en";

  try {
    let pdfBuffer: Buffer;
    if (language === "ar") {
      const docDefinition = buildArabicResumeDocument(cv);
      pdfBuffer = await renderArabicPdfBuffer(docDefinition);
    } else {
      const blob = await buildEnglishPdf(cv);
      pdfBuffer = Buffer.from(await blob.arrayBuffer());
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="cv.pdf"');
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[api/generate-cv] PDF generation failed", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    sendJson(res, 500, { error: message });
  }
}
