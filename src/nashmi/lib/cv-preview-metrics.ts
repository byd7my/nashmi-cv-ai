import type { CvTemplateStyles } from "@/nashmi/lib/cv-templates";

export type CvPreviewVariant = "paper" | "mobile";

export type CvPreviewMetrics = {
  pagePadding: string;
  bodySize: number;
  smallSize: number;
  nameSize: number;
  titleSize: number;
  contactSize: number;
  lineHeight: number;
  sectionGap: number;
  secPadding: string;
  secMinHeight: number;
  headPadding: string;
};

export function getCvPreviewMetrics(
  tpl: CvTemplateStyles,
  variant: CvPreviewVariant,
): CvPreviewMetrics {
  if (variant === "mobile") {
    return {
      pagePadding: "18px 16px 22px",
      bodySize: 12,
      smallSize: 11,
      nameSize: 19,
      titleSize: 13.5,
      contactSize: 11,
      lineHeight: 1.62,
      sectionGap: 14,
      secPadding: "8px 4px",
      secMinHeight: 40,
      headPadding: "8px 4px",
    };
  }
  return {
    pagePadding: tpl.pagePadding,
    bodySize: 10,
    smallSize: 9.5,
    nameSize: tpl.nameSize,
    titleSize: 13,
    contactSize: 10,
    lineHeight: 1.55,
    sectionGap: 14,
    secPadding: "12px 10px",
    secMinHeight: 48,
    headPadding: "10px 8px",
  };
}
