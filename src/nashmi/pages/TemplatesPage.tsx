import { useState } from "react";
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

const TEMPLATES = [
  {
    id: "modern",   name: { ar: "عصري",     en: "Modern"    }, desc: { ar: "تصميم نظيف وعصري مناسب لوظائف التقنية والإبداع", en: "Clean, contemporary design for tech and creative roles" },     accent: "#7C5CFF", badge: { ar: "الأكثر استخداماً", en: "Most Used" },
  },
  {
    id: "executive",name: { ar: "تنفيذي",   en: "Executive" }, desc: { ar: "تصميم احترافي وأنيق لكبار المسؤولين والمديرين", en: "Sophisticated, polished layout for executives and directors" }, accent: "#E8B84B", badge: { ar: "للإدارة",             en: "For Executives" },
  },
  {
    id: "minimal",  name: { ar: "بسيط",     en: "Minimal"   }, desc: { ar: "تصميم مبسّط ونظيف يركّز على المحتوى والمهارات", en: "Clean minimal layout focused on content and skills" },            accent: "#22C55E", badge: { ar: "الأقل إلهاءً",      en: "Most Clean" },
  },
  {
    id: "classic",  name: { ar: "كلاسيك",   en: "Classic"   }, desc: { ar: "تصميم تقليدي موثوق يمر عبر كل أنظمة ATS", en: "Traditional trusted format that passes every ATS system" },         accent: "#60A5FA", badge: { ar: "متوافق ATS 100%",   en: "100% ATS Safe" },
  },
];

function TemplateCard({ t: tpl, isAr, onNav, ff }: { t: typeof TEMPLATES[0]; isAr: boolean; onNav: (p: string) => void; ff: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ background: P.card, border: `1px solid ${hovered ? tpl.accent : P.border}`, borderRadius: 18, overflow: "hidden", cursor: "pointer", transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s", transform: hovered ? "translateY(-5px)" : "none", boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px ${tpl.accent}33` : "0 4px 12px rgba(0,0,0,0.2)" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      {/* Preview */}
      <div style={{ height: 240, background: `linear-gradient(160deg, ${tpl.accent}15, ${P.surface})`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ background: "#fff", width: "68%", height: "82%", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ width: "60%", height: 10, background: tpl.accent, borderRadius: 3, opacity: 0.85 }}/>
          <div style={{ width: "45%", height: 6, background: "#e0e0e0", borderRadius: 2 }}/>
          <div style={{ width: "75%", height: 5, background: "#eee", borderRadius: 2, marginTop: 3 }}/>
          <div style={{ height: 1, background: "#ddd", margin: "5px 0" }}/>
          {[55, 70, 45, 60, 80, 50].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 4, background: "#f0f0f0", borderRadius: 2 }}/>)}
          <div style={{ height: 1, background: "#eee", margin: "3px 0" }}/>
          {[65, 40, 75].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 4, background: "#ececec", borderRadius: 2 }}/>)}
        </div>
        <div style={{ position: "absolute", top: 12, [isAr ? "left" : "right"]: 12, background: tpl.accent, color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 99, fontFamily: ff }}>
          {isAr ? tpl.badge.ar : tpl.badge.en}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "18px 18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <h3 style={{ color: P.text, fontSize: 17, fontWeight: 800, fontFamily: ff }}>{isAr ? tpl.name.ar : tpl.name.en}</h3>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: tpl.accent, flexShrink: 0, marginTop: 5 }}/>
        </div>
        <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.65, marginBottom: 16 }}>{isAr ? tpl.desc.ar : tpl.desc.en}</p>
        <button onClick={() => onNav("builder")} style={{ width: "100%", background: hovered ? `linear-gradient(135deg, ${tpl.accent}, ${tpl.accent}cc)` : "transparent", border: `1px solid ${hovered ? "transparent" : P.borderLight}`, color: hovered ? "#fff" : P.text, borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: ff, transition: "all 0.2s" }}>
          {isAr ? "استخدم هذا القالب →" : "Use this template →"}
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
      <div style={{ minHeight: "100vh", paddingTop: 90 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
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
                ? "4 قوالب مصممة بمعايير ATS وتوافق كامل مع أنظمة التوظيف العالمية والإقليمية."
                : "4 templates designed to ATS standards and fully compatible with global and regional hiring systems."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {(isAr
                ? ["✓ 100% متوافق مع ATS", "✓ دعم عربي وإنجليزي", "✓ بدون علامة مائية", "✓ PDF + DOCX"]
                : ["✓ 100% ATS Compatible", "✓ Arabic & English RTL", "✓ No Watermark", "✓ PDF + DOCX"]
              ).map(x => (
                <span key={x} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: P.muted }}>{x}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 22 }}>
            {TEMPLATES.map(tpl => <TemplateCard key={tpl.id} t={tpl} isAr={isAr} onNav={onNav} ff={ff}/>)}
          </div>

          <div style={{ textAlign: "center", marginTop: 52, padding: "36px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 20 }}>
            <h3 style={{ color: P.text, fontSize: 22, fontWeight: 800, fontFamily: ff, marginBottom: 10 }}>
              {isAr ? "جميع القوالب في كل الباقات" : "All Templates in Every Plan"}
            </h3>
            <p style={{ color: P.muted, fontSize: 14, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
              {isAr ? "لا قيود على القوالب — اختر ما يناسبك في أي باقة." : "No template restrictions — pick any template on any paid plan."}
            </p>
            <button onClick={() => onNav("builder")} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "14px 32px", cursor: "pointer", fontSize: 15, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 24px ${P.violet}44` }}>
              {isAr ? "ابني سيرتي الآن →" : "Build My Resume →"}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
