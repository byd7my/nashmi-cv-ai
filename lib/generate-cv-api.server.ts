import { timingSafeEqual } from "node:crypto";

import { buildArabicResumeDocument } from "@/nashmi/lib/pdf-export/arabic-resume-document";
import { buildEnglishPdf, type CvData } from "@/nashmi/lib/cv-pdf-export";

import { renderArabicPdfBuffer } from "./arabic-pdf-node.server";

/**
 * POST /api/generate-cv — renders a CV PDF (Arabic pdfmake / English jsPDF)
 * for the external Telegram bot. Auth: x-internal-key vs INTERNAL_API_KEY.
 * Never used by the website's own browser export paths.
 */

type GenerateCvBody = CvData & { language?: string };

const ARRAY_FIELDS = ["experience", "education", "certifications", "skills", "languages"] as const;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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

export async function handleGenerateCvRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  const expectedKey = process.env.INTERNAL_API_KEY;
  const providedKey = request.headers.get("x-internal-key") || "";

  if (!expectedKey) {
    console.error("[api/generate-cv] INTERNAL_API_KEY is not set");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!providedKey || !safeEqual(providedKey, expectedKey)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
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

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="cv.pdf"',
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("[api/generate-cv] PDF generation failed", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return Response.json({ error: message }, { status: 500 });
  }
}
