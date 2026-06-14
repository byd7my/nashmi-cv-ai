import type { CSSProperties } from "react";

export type CvTemplateId = "classic";

/** PDF export always uses this layout (single column, standard headings, real text). */
export const ATS_PDF_TEMPLATE_ID: CvTemplateId = "classic";

export const CV_TEMPLATE_IDS: CvTemplateId[] = ["classic"];

export const CV_TEMPLATES: {
  id: CvTemplateId;
  name: { ar: string; en: string };
  accent: string;
}[] = [
  { id: "classic", name: { ar: "كلاسيك", en: "Classic" }, accent: "#2563EB" },
];

const TEMPLATE_STORAGE_KEY = "nashmi:cv-template";

export const DEFAULT_CV_TEMPLATE: CvTemplateId = "classic";

export function isCvTemplateId(value: string | null | undefined): value is CvTemplateId {
  return CV_TEMPLATE_IDS.includes(value as CvTemplateId);
}

export function getDefaultCvTemplate(): CvTemplateId {
  return DEFAULT_CV_TEMPLATE;
}

export function getStoredCvTemplate(): CvTemplateId {
  if (typeof window === "undefined") return DEFAULT_CV_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return isCvTemplateId(raw) ? raw : DEFAULT_CV_TEMPLATE;
  } catch {
    return DEFAULT_CV_TEMPLATE;
  }
}

export function resetStoredCvTemplate(): void {
  setStoredCvTemplate(DEFAULT_CV_TEMPLATE);
}

export function setStoredCvTemplate(id: CvTemplateId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export type CvTemplateStyles = {
  accent: string;
  headerAlign: "center" | "left";
  headerBorder: string;
  headerPadding: string;
  nameSize: number;
  sectionTitle: CSSProperties;
  skillsSeparator: string;
  pagePadding: string;
  sidebarAccent?: boolean;
};

export function getCvTemplateStyles(templateId: CvTemplateId): CvTemplateStyles {
  const tpl = CV_TEMPLATES.find((t) => t.id === templateId) ?? CV_TEMPLATES[0];

  switch (templateId) {
    case "classic":
    default:
      return {
        accent: tpl.accent,
        headerAlign: "center",
        headerBorder: "2px solid #111",
        headerPadding: "0 0 12px 0",
        nameSize: 22,
        sectionTitle: {
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          borderBottom: "1px solid #333",
          paddingBottom: 3,
          marginBottom: 8,
          marginTop: 4,
        },
        skillsSeparator: ", ",
        pagePadding: "28px 32px",
      };
  }
}
