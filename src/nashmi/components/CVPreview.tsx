import type { CSSProperties } from "react";
import { EN_HEADERS, AR_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CVData } from "@/nashmi/lib/ats";
import {
  getCvTemplateStyles,
  getDefaultCvTemplate,
  type CvTemplateId,
} from "@/nashmi/lib/cv-templates";
import { getCvPreviewMetrics, type CvPreviewVariant } from "@/nashmi/lib/cv-preview-metrics";
import {
  CvCertRow,
  CvEntryHeader,
  CvLanguageTags,
  CvSkillTags,
} from "@/nashmi/components/CvContentBlocks";

interface CVPreviewProps {
  cv: CVData;
  lang: string;
  cvLanguage?: string;
  userTier?: string | null;
  templateId?: CvTemplateId;
  variant?: CvPreviewVariant;
}

export function CVPreview({ cv, lang, cvLanguage, userTier, templateId, variant = "paper" }: CVPreviewProps) {
  const effectiveLang = cvLanguage === "ar" || cvLanguage === "en" ? cvLanguage : (lang === "ar" ? "ar" : "en");
  const isAr = effectiveLang === "ar";
  const H = isAr ? AR_HEADERS : EN_HEADERS;
  const ff = isAr
    ? "'Cairo', 'Tajawal', 'Noto Naskh Arabic', Tahoma, Arial, sans-serif"
    : "'Inter', 'Helvetica Neue', Arial, sans-serif";

  const tpl = getCvTemplateStyles(templateId ?? getDefaultCvTemplate());
  const m = getCvPreviewMetrics(tpl, variant);
  const stacked = variant === "mobile";
  const sectionTitleStyle: CSSProperties = {
    ...tpl.sectionTitle,
    fontSize: stacked ? 11 : tpl.sectionTitle.fontSize,
    marginBottom: stacked ? 8 : tpl.sectionTitle.marginBottom,
  };

  const hasElitePackage = userTier === "elite" || userTier === "enterprise";
  const hasPremiumPackage = userTier === "premium";
  const isPaid = hasElitePackage || hasPremiumPackage;

  const watermarkText = "NASHMI - نشمي";
  const watermarkSvg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='200' viewBox='0 0 360 200'>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' ` +
    `font-family='Cairo, Tajawal, Arial, sans-serif' font-size='28' font-weight='700' fill='%23000'>` +
    `${watermarkText}</text></svg>`;
  const watermarkUrl = `url("data:image/svg+xml;utf8,${watermarkSvg}")`;

  const headerStyle: CSSProperties = {
    textAlign: tpl.headerAlign,
    borderBottom: tpl.headerBorder,
    padding: tpl.headerPadding,
    marginBottom: m.sectionGap,
    borderLeft: tpl.sidebarAccent ? `4px solid ${tpl.accent}` : undefined,
  };

  return (
    <article style={{ position: "relative", width: "100%" }}>
      <div
        className={variant === "mobile" ? "cv-sheet cv-sheet--mobile" : "cv-sheet"}
        style={{
          background: "#fff",
          color: "#111",
          fontFamily: ff,
          fontSize: m.bodySize,
          lineHeight: m.lineHeight,
          padding: m.pagePadding,
          width: "100%",
          minHeight: variant === "mobile" ? 0 : 600,
          direction: isAr ? "rtl" : "ltr",
          boxSizing: "border-box",
        }}
      >
        <header style={headerStyle}>
          <h1 style={{ fontSize: m.nameSize, fontWeight: 700, margin: 0, color: "#111", lineHeight: 1.25 }}>
            {cv.personal.name || (isAr ? "الاسم الكامل" : "Full Name")}
          </h1>
          {cv.personal.title && (
            <p style={{ fontSize: m.titleSize, color: "#444", marginTop: 4, marginBottom: 0, lineHeight: 1.35 }}>
              {cv.personal.title}
            </p>
          )}
          <p
            style={{
              fontSize: m.contactSize,
              color: "#555",
              marginTop: 8,
              marginBottom: 0,
              display: "flex",
              gap: 10,
              justifyContent: tpl.headerAlign === "center" ? "center" : "flex-start",
              flexWrap: "wrap",
              lineHeight: 1.5,
            }}
          >
            {cv.personal.email && <span>{cv.personal.email}</span>}
            {cv.personal.phone && <span>{cv.personal.phone}</span>}
            {cv.personal.city && <span>{cv.personal.city}</span>}
            {cv.personal.linkedin && <span style={{ wordBreak: "break-all" }}>{cv.personal.linkedin}</span>}
          </p>
        </header>

        {cv.summary && (
          <section style={{ marginBottom: m.sectionGap }}>
            <h2 style={sectionTitleStyle}>{H.summary}</h2>
            <p style={{ marginBottom: 0, color: "#222", fontSize: m.bodySize, lineHeight: m.lineHeight }}>{cv.summary}</p>
          </section>
        )}

        {cv.experience.some((e) => e.company || e.role) && (
          <section style={{ marginBottom: m.sectionGap }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: stacked ? 8 : 10 }}>{H.experience}</h2>
            {cv.experience
              .filter((e) => e.company || e.role)
              .map((e, i) => (
                <div key={i} style={{ marginBottom: stacked ? 14 : 12 }}>
                  <CvEntryHeader
                    primary={e.role || e.company || ""}
                    secondary={e.role && e.company ? e.company : undefined}
                    dateRange={`${e.from || ""}${e.to ? ` – ${e.to}` : ""}`}
                    fontSize={m.bodySize}
                    smallSize={m.smallSize}
                    stacked={stacked}
                  />
                  {e.desc && (
                    <ul
                      style={{
                        marginTop: 6,
                        marginBottom: 0,
                        paddingInlineStart: stacked ? 16 : 18,
                        fontSize: m.smallSize,
                        color: "#333",
                        lineHeight: m.lineHeight,
                      }}
                    >
                      {e.desc.split(/\n+/).filter(Boolean).map((line, j) => (
                        <li key={j} style={{ marginBottom: 4 }}>
                          {line.replace(/^[\s•\-–—]+/, "")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </section>
        )}

        {cv.education.some((e) => e.school || e.degree) && (
          <section style={{ marginBottom: m.sectionGap }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: stacked ? 8 : 10 }}>{H.education}</h2>
            {cv.education
              .filter((e) => e.school || e.degree)
              .map((e, i) => {
                const degreeText = [e.degree, e.field].filter(Boolean).join(isAr ? " - " : " in ");
                const dateRange = [e.from, e.to].filter(Boolean).join(e.to ? ` – ${e.to}` : "");
                return (
                  <div key={i} style={{ marginBottom: stacked ? 12 : 10 }}>
                    <CvEntryHeader
                      primary={degreeText || e.school || ""}
                      secondary={degreeText && e.school ? e.school : undefined}
                      dateRange={dateRange || undefined}
                      fontSize={m.bodySize}
                      smallSize={m.smallSize}
                      stacked={stacked}
                    />
                    {((e.showGpa && e.gpa) || e.honors) && (
                      <p
                        style={{
                          color: "#555",
                          fontSize: m.smallSize,
                          marginTop: 4,
                          marginBottom: 0,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          lineHeight: 1.5,
                        }}
                      >
                        {e.showGpa && e.gpa && (
                          <span>
                            {isAr ? "المعدل" : "GPA"}: {e.gpa}
                            {e.gpaScale ? `/${e.gpaScale}` : ""}
                          </span>
                        )}
                        {e.honors && (
                          <span>
                            {isAr ? "مرتبة الشرف" : "Honors"}: {e.honors}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
          </section>
        )}

        {(() => {
          const certs = (cv.certifications || []).filter((c) => c.title || c.issuer || c.date);
          if (!certs.length) return null;
          return (
            <section style={{ marginBottom: m.sectionGap }}>
              <h2 style={{ ...sectionTitleStyle, marginBottom: stacked ? 8 : 10 }}>{H.certifications}</h2>
              {certs.map((c, i) => (
                <CvCertRow
                  key={i}
                  title={c.title || c.issuer || ""}
                  issuer={c.title && c.issuer ? c.issuer : undefined}
                  date={c.date}
                  fontSize={m.bodySize}
                  smallSize={m.smallSize}
                  stacked={stacked}
                />
              ))}
            </section>
          );
        })()}

        {cv.skills.length > 0 && (
          <section style={{ marginBottom: m.sectionGap }}>
            <h2 style={sectionTitleStyle}>{H.skills}</h2>
            <CvSkillTags skills={cv.skills} accent={tpl.accent} fontSize={stacked ? m.smallSize : m.bodySize} />
          </section>
        )}

        {cv.languages.some((l) => l.lang) && (
          <section>
            <h2 style={sectionTitleStyle}>{H.languages}</h2>
            <CvLanguageTags items={cv.languages} accent={tpl.accent} fontSize={stacked ? m.smallSize : m.bodySize} />
          </section>
        )}
      </div>

      {!isPaid && (
        <div
          aria-hidden="true"
          data-nashmi-watermark="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: watermarkUrl,
            backgroundRepeat: "repeat",
            backgroundSize: variant === "mobile" ? "280px 160px" : "360px 200px",
            transform: "rotate(-45deg)",
            transformOrigin: "center center",
            opacity: variant === "mobile" ? 0.06 : 0.1,
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            zIndex: 10,
          }}
        />
      )}
    </article>
  );
}
