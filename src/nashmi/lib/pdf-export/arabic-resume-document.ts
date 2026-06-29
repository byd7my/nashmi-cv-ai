import type { Content, TDocumentDefinitions } from "pdfmake-rtl/interfaces";

import { AR_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CvData } from "@/nashmi/lib/cv-pdf-export";
import { buildContactLinkParts, PDF_LINK_COLOR } from "@/nashmi/lib/cv-pdf-export";

import {
  joinPreparedParts,
  prepareArabicLine,
  prepareArabicPdfContent,
  sanitizeArabicPdfText,
} from "@/nashmi/lib/pdf-export/arabic-bidi";

const LIST_SEP = " | ";
const BODY_FONT = 8.5;
const SECTION_FONT = 10;
const LINE_HEIGHT = 0.95;
const PAGE_MARGINS: [number, number, number, number] = [40, 24, 40, 16];

function hr(): Content {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 492.5, y2: 0, lineWidth: 0.5 }],
    margin: [0, 0.5, 0, 0.5] as [number, number, number, number],
  };
}

function bodyText(text: string, bold = false): Content {
  return { ...prepareArabicPdfContent(text), bold };
}

function sectionHeader(title: string): Content[] {
  return [
    {
      ...bodyText(title, true),
      style: "section",
      margin: [0, 1.5, 0, 0.25] as [number, number, number, number],
    },
    hr(),
  ];
}

function splitRow(main: string, side: string, boldMain = true): Content {
  return {
    columns: [
      {
        ...prepareArabicPdfContent(side),
        width: 112,
        alignment: "left",
        fontSize: BODY_FONT,
        color: "#000000",
      },
      {
        ...prepareArabicPdfContent(main),
        width: "*",
        alignment: "right",
        bold: boldMain,
        fontSize: BODY_FONT,
        color: "#000000",
      },
    ],
    columnGap: 6,
    margin: [0, 0, 0, 0.25] as [number, number, number, number],
  };
}

function bulletList(bullets: string[]): Content {
  return {
    ul: bullets.map((bullet) => prepareArabicPdfContent(bullet)),
    style: "body",
    margin: [0, 0, 0, 0.25] as [number, number, number, number],
  };
}

const CONTACT_SEP = "  |  ";

/** Contact fields are pure LTR — phone/email/URLs are clickable links. */
function buildContactContent(cv: CvData): Content | null {
  const parts = buildContactLinkParts(cv);
  if (!parts.length) return null;

  const textParts: Content[] = [];
  parts.forEach((part, index) => {
    if (index > 0) textParts.push(CONTACT_SEP);
    if (part.link) {
      textParts.push({
        text: part.text,
        link: part.link,
        color: PDF_LINK_COLOR,
        decoration: "underline",
      });
    } else {
      textParts.push(part.text);
    }
  });

  return {
    text: textParts,
    style: "contact",
    direction: "ltr",
    margin: [0, 0, 0, 0.5] as [number, number, number, number],
  };
}

export function buildArabicResumeDocument(cv: CvData): TDocumentDefinitions {
  const H = AR_HEADERS;
  const content: Content[] = [];

  content.push(
    { ...bodyText(cv.fullName || ""), style: "name" },
    ...(cv.jobTitle ? [{ ...bodyText(cv.jobTitle), style: "jobTitle" } as Content] : []),
  );

  const contactContent = buildContactContent(cv);
  if (contactContent) content.push(contactContent);

  content.push(hr());

  if (cv.summary?.trim()) {
    content.push(...sectionHeader(H.summary));
    content.push({
      ...bodyText(cv.summary),
      style: "body",
      margin: [0, 0, 0, 0.5] as [number, number, number, number],
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
        content.push(bulletList(exp.bullets));
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
          ...prepareArabicPdfContent(extras.join("  |  ")),
          style: "body",
          margin: [0, 0, 0, 0.5] as [number, number, number, number],
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
      ...prepareArabicPdfContent(joinPreparedParts(cv.skills, LIST_SEP)),
      style: "body",
      margin: [0, 0, 0, 0.5] as [number, number, number, number],
    });
  }

  if (cv.languages?.length) {
    content.push(...sectionHeader(H.languages));
    content.push({
      ...prepareArabicPdfContent(joinPreparedParts(cv.languages, LIST_SEP)),
      style: "body",
      margin: [0, 0, 0, 0] as [number, number, number, number],
    });
  }

  return {
    rtl: true,
    pageSize: "A4",
    pageMargins: PAGE_MARGINS,
    defaultStyle: {
      font: "Cairo",
      fontSize: BODY_FONT,
      color: "#000000",
      lineHeight: LINE_HEIGHT,
      alignment: "right",
    },
    styles: {
      name: {
        fontSize: 14,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 0.5] as [number, number, number, number],
      },
      jobTitle: {
        fontSize: 9.5,
        alignment: "center",
        margin: [0, 0, 0, 0.5] as [number, number, number, number],
      },
      contact: {
        fontSize: BODY_FONT,
        alignment: "center",
        lineHeight: LINE_HEIGHT,
      },
      section: {
        fontSize: SECTION_FONT,
        bold: true,
        alignment: "right",
      },
      body: {
        fontSize: BODY_FONT,
        alignment: "right",
        lineHeight: LINE_HEIGHT,
      },
    },
    content,
  };
}
