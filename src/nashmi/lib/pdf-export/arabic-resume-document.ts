import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import { AR_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CvData } from "@/nashmi/lib/cv-pdf-export";

import {
  joinPreparedParts,
  prepareArabicLine,
  prepareSideText,
  sanitizeArabicPdfText,
} from "@/nashmi/lib/pdf-export/arabic-bidi";

const LIST_SEP = " | ";
const PAGE_MARGINS: [number, number, number, number] = [51.4, 30, 51.4, 20];

function hr(): Content {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 492.5, y2: 0, lineWidth: 0.5 }],
    margin: [0, 1, 0, 1] as [number, number, number, number],
  };
}

function bodyText(text: string, bold = false): Content {
  return { text: prepareArabicLine(text), bold };
}

function sectionHeader(title: string): Content[] {
  return [
    {
      ...bodyText(title, true),
      style: "section",
      margin: [0, 4, 0, 1] as [number, number, number, number],
    },
    hr(),
  ];
}

function splitRow(main: string, side: string, boldMain = true): Content {
  return {
    columns: [
      {
        text: prepareSideText(side),
        width: 112,
        alignment: "left",
        fontSize: 7.5,
        color: "#000000",
      },
      {
        text: prepareArabicLine(main),
        width: "*",
        alignment: "right",
        bold: boldMain,
        fontSize: 7.5,
        color: "#000000",
      },
    ],
    columnGap: 6,
    margin: [0, 0, 0, 1] as [number, number, number, number],
  };
}

function dashBullets(bullets: string[]): Content[] {
  return bullets.map((bullet) => ({
    text: sanitizeArabicPdfText(`- ${prepareArabicLine(bullet)}`),
    style: "body",
    alignment: "right" as const,
    margin: [0, 0, 0, 0] as [number, number, number, number],
  }));
}

/** Build pdfmake doc — compact single-page RTL, one font for all glyphs. */
export function buildArabicResumeDocument(cv: CvData): TDocumentDefinitions {
  const H = AR_HEADERS;
  const content: Content[] = [];

  content.push(
    { ...bodyText(cv.fullName || ""), style: "name" },
    ...(cv.jobTitle ? [{ ...bodyText(cv.jobTitle), style: "jobTitle" } as Content] : []),
  );

  const contactParts: string[] = [];
  if (cv.phone) contactParts.push(sanitizeArabicPdfText(cv.phone));
  if (cv.email) contactParts.push(sanitizeArabicPdfText(cv.email));
  if (cv.location) contactParts.push(prepareArabicLine(cv.location));
  if (cv.linkedin) contactParts.push(sanitizeArabicPdfText(cv.linkedin));

  if (contactParts.length > 0) {
    content.push({
      text: sanitizeArabicPdfText(contactParts.join("  |  ")),
      style: "contact",
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }

  content.push(hr());

  if (cv.summary?.trim()) {
    content.push(...sectionHeader(H.summary));
    content.push({
      ...bodyText(cv.summary),
      style: "body",
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }

  if (cv.experience?.length) {
    content.push(...sectionHeader(H.experience));
    for (const exp of cv.experience) {
      const titlePart = exp.jobTitle || "";
      const placePart = [exp.company, exp.location].filter(Boolean).join(" | ");
      const headerMain =
        titlePart && placePart ? `${titlePart} - ${placePart}` : titlePart || placePart;
      const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      content.push(splitRow(headerMain, dateStr, true));
      if (exp.bullets?.length) {
        content.push(...dashBullets(exp.bullets));
      }
    }
  }

  if (cv.education?.length) {
    content.push(...sectionHeader(H.education));
    for (const edu of cv.education) {
      const eduMain = [edu.degree, edu.institution].filter(Boolean).join(" | ");
      content.push(splitRow(eduMain, edu.year || "", true));
      const extras: string[] = [];
      if (edu.gpa) extras.push(`GPA: ${sanitizeArabicPdfText(edu.gpa)}`);
      if (edu.honors) extras.push(prepareArabicLine(edu.honors));
      if (extras.length) {
        content.push({
          text: extras.join("  |  "),
          style: "body",
          margin: [0, 0, 0, 2] as [number, number, number, number],
        });
      }
    }
  }

  if (cv.certifications?.length) {
    content.push(...sectionHeader(H.certifications));
    for (const cert of cv.certifications) {
      const main = [cert.name, cert.issuer].filter(Boolean).join(" - ");
      content.push(splitRow(main, cert.year || "", true));
    }
  }

  if (cv.skills?.length) {
    content.push(...sectionHeader(H.skills));
    content.push({
      text: joinPreparedParts(cv.skills, LIST_SEP),
      style: "body",
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }

  if (cv.languages?.length) {
    content.push(...sectionHeader(H.languages));
    content.push({ text: joinPreparedParts(cv.languages, LIST_SEP), style: "body" });
  }

  return {
    pageSize: "A4",
    pageMargins: PAGE_MARGINS,
    defaultStyle: {
      font: "NotoSansArabic",
      fontSize: 7.5,
      color: "#000000",
      lineHeight: 1.02,
      alignment: "right",
    },
    styles: {
      name: {
        fontSize: 16,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 1] as [number, number, number, number],
      },
      jobTitle: {
        fontSize: 8.5,
        alignment: "center",
        margin: [0, 0, 0, 2] as [number, number, number, number],
      },
      contact: {
        fontSize: 7.5,
        alignment: "center",
      },
      section: {
        fontSize: 8.5,
        bold: true,
        alignment: "right",
      },
      body: {
        fontSize: 7.5,
        alignment: "right",
        lineHeight: 1.02,
      },
    },
    content,
  };
}
