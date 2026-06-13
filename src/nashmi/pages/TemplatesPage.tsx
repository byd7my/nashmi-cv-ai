import { useState } from "react";
import { CV_TEMPLATES, setStoredCvTemplate, type CvTemplateId } from "@/nashmi/lib/cv-templates";
import { P, FF } from "@/nashmi/lib/tokens";
import { PageShell } from "@/nashmi/components/PageShell";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  onLangToggle: () => void;
  page: string;
}

const PAGE_CSS = `
  .templates-page-inner { max-width: 1200px; margin: 0 auto; padding: 60px 24px; }
  .templates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 22px; }
  .templates-badges { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .templates-cta { text-align: center; margin-top: 52px; padding: 36px; background: ${P.card}; border: 1px solid ${P.border}; border-radius: 20px; }
  .tpl-card-preview { height: 240px; }
  .tpl-card-body { padding: 18px 18px 20px; }
  @media (max-width: 768px) {
    .templates-page-inner { padding: 28px 16px 40px; }
    .templates-header { margin-bottom: 28px !important; }
    .templates-header h1 { font-size: clamp(22px, 6vw, 32px) !important; margin-bottom: 10px !important; }
    .templates-header p { font-size: 14px !important; margin-bottom: 18px !important; }
    .templates-badges { gap: 8px; }
    .templates-badges span { font-size: 11px !important; padding: 4px 10px !important; }
    .templates-grid { grid-template-columns: 1fr; gap: 14px; }
    .tpl-card-preview { height: 168px; }
    .tpl-card-body { padding: 14px 14px 16px; }
    .tpl-card-body h3 { font-size: 15px !important; }
    .tpl-card-body p { font-size: 12px !important; margin-bottom: 12px !important; line-height: 1.55 !important; }
    .tpl-card-btn { padding: 9px 14px !important; font-size: 13px !important; }
    .templates-cta { margin-top: 28px; padding: 22px 16px; border-radius: 16px; }
    .templates-cta h3 { font-size: 18px !important; }
    .templates-cta p { font-size: 13px !important; margin-bottom: 16px !important; }
  }
`;

const TEMPLATES = CV_TEMPLATES.map((tpl) => ({
  ...tpl,
  desc: {
    ar:
      tpl.id === "modern"
        ? "تصميم نظيف وعصري مناسب لوظائف التقنية والإبداع"
        : tpl.id === "executive"
          ? "تصميم احترافي وأنيق لكبار المسؤولين والمديرين"
          : tpl.id === "minimal"
            ? "تصميم مبسّط يركّز على المحتوى والمهارات"
            : "تصميم تقليدي موثوق يمر عبر كل أنظمة ATS",
    en:
      tpl.id === "modern"
        ? "Clean, contemporary design for tech and creative roles"
        : tpl.id === "executive"
          ? "Sophisticated, polished layout for executives and directors"
          : tpl.id === "minimal"
            ? "Clean minimal layout focused on content and skills"
            : "Traditional trusted format that passes every ATS system",
  },
  badge: {
    ar:
      tpl.id === "modern"
        ? "الأكثر استخداماً"
        : tpl.id === "executive"
          ? "للإدارة"
          : tpl.id === "minimal"
            ? "الأقل إلهاءً"
            : "متوافق ATS 100%",
    en:
      tpl.id === "modern"
        ? "Most Used"
        : tpl.id === "executive"
          ? "For Executives"
          : tpl.id === "minimal"
            ? "Most Clean"
            : "100% ATS Safe",
  },
}));

type TemplateItem = (typeof TEMPLATES)[number];

function TemplateCard({ t: tpl, isAr, onNav, ff }: { t: TemplateItem; isAr: boolean; onNav: (p: string, tplId?: CvTemplateId) => void; ff: string }) {
  const [hovered, setHovered] = useState(false);
  const badgePos = isAr ? { left: 10 } : { right: 10 };

  return (
    <div
      style={{
        background: P.card,
        border: `1px solid ${hovered ? tpl.accent : P.border}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.28), 0 0 0 1px ${tpl.accent}33` : "0 2px 8px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="tpl-card-preview"
        style={{
          background: `linear-gradient(160deg, ${tpl.accent}15, ${P.surface})`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ background: "#fff", width: "62%", height: "78%", borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,0.22)", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ width: "60%", height: 9, background: tpl.accent, borderRadius: 3, opacity: 0.85 }} />
          <div style={{ width: "45%", height: 5, background: "#e0e0e0", borderRadius: 2 }} />
          <div style={{ width: "75%", height: 4, background: "#eee", borderRadius: 2, marginTop: 2 }} />
          <div style={{ height: 1, background: "#ddd", margin: "4px 0" }} />
          {[55, 70, 45, 60].map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 4, background: "#f0f0f0", borderRadius: 2 }} />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            top: 10,
            ...badgePos,
            background: tpl.accent,
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 99,
            fontFamily: ff,
            maxWidth: "calc(100% - 20px)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {isAr ? tpl.badge.ar : tpl.badge.en}
        </div>
      </div>

      <div className="tpl-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
          <h3 style={{ color: P.text, fontSize: 17, fontWeight: 800, fontFamily: ff, margin: 0 }}>{isAr ? tpl.name.ar : tpl.name.en}</h3>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: tpl.accent, flexShrink: 0, marginTop: 5 }} />
        </div>
        <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>{isAr ? tpl.desc.ar : tpl.desc.en}</p>
        <button
          className="tpl-card-btn"
          onClick={() => { setStoredCvTemplate(tpl.id); onNav("builder", tpl.id); }}
          style={{
            width: "100%",
            background: hovered ? `linear-gradient(135deg, ${tpl.accent}, ${tpl.accent}cc)` : "transparent",
            border: `1px solid ${hovered ? "transparent" : P.borderLight}`,
            color: hovered ? "#fff" : P.text,
            borderRadius: 10,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: ff,
            transition: "all 0.2s",
          }}
        >
          {isAr ? "استخدم القالب →" : "Use template →"}
        </button>
      </div>
    </div>
  );
}

export function TemplatesPage({ lang, t, onNav, onLangToggle, page }: Props) {
  const isAr = lang === "ar";
  const ff = FF;

  return (
    <PageShell lang={lang} t={t} onNav={onNav} onLangToggle={onLangToggle} page={page}>
      <style>{PAGE_CSS}</style>
      <div style={{ minHeight: "100vh", paddingTop: 90 }}>
        <div className="templates-page-inner" style={{ direction: isAr ? "rtl" : "ltr" }}>
          <div className="templates-header" style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}55`, color: P.violetLight, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20 }}>
                {isAr ? "القوالب" : "Templates"}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(26px,4.5vw,48px)", fontWeight: 900, color: P.text, fontFamily: ff, marginBottom: 14 }}>
              {isAr ? "قوالب احترافية مُعتمدة" : "Professional Certified Templates"}
            </h1>
            <p style={{ color: P.muted, fontSize: 16, maxWidth: 540, margin: "0 auto 28px" }}>
              {isAr
                ? "4 قوالب للمعاينة — التصدير PDF دائماً بتنسيق ATS كلاسيكي."
                : "4 preview styles — PDF export always uses the classic ATS layout."}
            </p>
            <div className="templates-badges">
              {(isAr
                ? ["✓ متوافق ATS", "✓ عربي وإنجليزي", "✓ بدون علامة مائية", "✓ PDF ATS"]
                : ["✓ ATS Compatible", "✓ Arabic & English", "✓ No Watermark", "✓ ATS PDF"]
              ).map((x) => (
                <span key={x} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: P.muted }}>{x}</span>
              ))}
            </div>
          </div>

          <div className="templates-grid">
            {TEMPLATES.map((tpl) => (
              <TemplateCard key={tpl.id} t={tpl} isAr={isAr} onNav={onNav} ff={ff} />
            ))}
          </div>

          <div className="templates-cta">
            <h3 style={{ color: P.text, fontSize: 22, fontWeight: 800, fontFamily: ff, marginBottom: 10 }}>
              {isAr ? "جميع القوالب في كل الباقات" : "All Templates in Every Plan"}
            </h3>
            <p style={{ color: P.muted, fontSize: 14, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
              {isAr ? "لا قيود على القوالب — اختر ما يناسبك." : "No template restrictions — pick any template."}
            </p>
            <button onClick={() => onNav("builder")} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "14px 28px", cursor: "pointer", fontSize: 15, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 24px ${P.violet}44` }}>
              {isAr ? "ابني سيرتي الآن →" : "Build My Resume →"}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
