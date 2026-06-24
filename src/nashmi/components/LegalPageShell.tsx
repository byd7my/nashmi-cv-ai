import { Link } from "@tanstack/react-router";
import { P, FF } from "@/nashmi/lib/tokens";

export type LegalPageId = "about" | "terms" | "privacy";

const LEGAL_PATHS: Record<LegalPageId, { ar: string; en: string }> = {
  about: { ar: "/about", en: "/en/about" },
  terms: { ar: "/terms", en: "/en/terms" },
  privacy: { ar: "/privacy", en: "/en/privacy" },
};

interface Props {
  lang: "ar" | "en";
  page: LegalPageId;
  title: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalPageShell({ lang, page, title, updated, children }: Props) {
  const isAr = lang === "ar";
  const ff = FF;
  const labels = isAr
    ? { home: "← العودة للرئيسية", about: "من نحن", terms: "الشروط والأحكام", privacy: "سياسة الخصوصية", refund: "سياسة الاسترجاع", lang: "English" }
    : { home: "← Back to home", about: "About Us", terms: "Terms & Conditions", privacy: "Privacy Policy", refund: "Refund Policy", lang: "العربية" };
  const otherLangPath = lang === "ar" ? LEGAL_PATHS[page].en : LEGAL_PATHS[page].ar;

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ background: P.bg, color: P.text, minHeight: "100vh", fontFamily: ff }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Link to="/" style={{ color: P.violetLight, fontSize: 13, textDecoration: "none" }}>{labels.home}</Link>
          <a href={otherLangPath} style={{ color: P.muted, fontSize: 13, textDecoration: "none", border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 12px" }}>
            {labels.lang}
          </a>
        </div>

        <nav style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${P.border}` }}>
          {(["about", "terms", "privacy"] as const).map(id => (
            <a
              key={id}
              href={LEGAL_PATHS[id][lang]}
              style={{
                color: page === id ? P.violetLight : P.muted,
                fontSize: 13,
                fontWeight: page === id ? 700 : 500,
                textDecoration: "none",
              }}
            >
              {labels[id]}
            </a>
          ))}
          <a href={`${LEGAL_PATHS.terms[lang]}#refund`} style={{ color: P.muted, fontSize: 13, textDecoration: "none" }}>
            {labels.refund}
          </a>
        </nav>

        <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 12px" }}>{title}</h1>
        <p style={{ color: P.muted, fontSize: 13, marginBottom: 32 }}>{updated}</p>
        {children}
      </div>
    </div>
  );
}

export const legalUlStyle: React.CSSProperties = { paddingInlineStart: 20, color: P.textSub, lineHeight: 2, fontSize: 15 };

export function LegalSection({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: P.text }}>{title}</h2>
      <div style={{ color: P.textSub, lineHeight: 2, fontSize: 15 }}>{children}</div>
    </section>
  );
}
