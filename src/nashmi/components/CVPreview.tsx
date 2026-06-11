import type { CSSProperties } from "react";
import { EN_HEADERS, AR_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CVData } from "@/nashmi/lib/ats";

interface CVPreviewProps {
  cv: CVData;
  lang: string;
  cvLanguage?: string;
  userTier?: string | null;
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  borderBottom: "1px solid #333",
  paddingBottom: 3,
  marginBottom: 8,
  marginTop: 4,
};

export function CVPreview({ cv, lang, cvLanguage, userTier }: CVPreviewProps) {
  const effectiveLang = cvLanguage === "ar" || cvLanguage === "en" ? cvLanguage : (lang === "ar" ? "ar" : "en");
  const isAr = effectiveLang === "ar";
  const H = isAr ? AR_HEADERS : EN_HEADERS;
  const ff = isAr
    ? "'Cairo', 'Tajawal', 'Noto Naskh Arabic', Tahoma, Arial, sans-serif"
    : "'Inter', 'Helvetica Neue', Arial, sans-serif";

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

  return (
    <article style={{ position: "relative", width: "100%" }}>
      <div style={{ background:"#fff", color:"#111", fontFamily:ff, fontSize:10.5, lineHeight:1.55, padding:"28px 32px", width:"100%", minHeight:600, direction:isAr?"rtl":"ltr" }}>
        <header style={{ textAlign:"center", borderBottom:"2px solid #111", paddingBottom:12, marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>{cv.personal.name||(isAr?"الاسم الكامل":"Full Name")}</h1>
          {cv.personal.title && <p style={{ fontSize:13, color:"#444", marginTop:4, marginBottom:0 }}>{cv.personal.title}</p>}
          <p style={{ fontSize:10, color:"#555", marginTop:6, marginBottom:0, display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {cv.personal.email && <span>{cv.personal.email}</span>}
            {cv.personal.phone && <span>{cv.personal.phone}</span>}
            {cv.personal.city  && <span>{cv.personal.city}</span>}
            {cv.personal.linkedin && <span>{cv.personal.linkedin}</span>}
          </p>
        </header>

        {cv.summary && (
          <section style={{ marginBottom:14 }}>
            <h2 style={sectionTitleStyle}>{H.summary}</h2>
            <p style={{ marginBottom:0, color:"#222", fontSize:10 }}>{cv.summary}</p>
          </section>
        )}

        {cv.experience.some(e=>e.company||e.role) && (
          <section style={{ marginBottom:14 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom:10 }}>{H.experience}</h2>
            {cv.experience.filter(e=>e.company||e.role).map((e,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:10 }}>
                  <span>{e.role}{e.company&&` — ${e.company}`}</span>
                  <span style={{ color:"#666",fontSize:9.5 }}>{e.from}{e.to?` – ${e.to}`:""}</span>
                </div>
                {e.desc && (
                  <ul style={{ marginTop:4, marginBottom:0, paddingInlineStart:18, fontSize:9.5, color:"#333" }}>
                    {e.desc.split(/\n+/).filter(Boolean).map((line, j) => (
                      <li key={j} style={{ marginBottom:2 }}>{line.replace(/^[\s•\-–—]+/, "")}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {cv.education.some(e=>e.school||e.degree) && (
          <section style={{ marginBottom:14 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom:10 }}>{H.education}</h2>
            {cv.education.filter(e=>e.school||e.degree).map((e,i)=>{
              const degreeText = [e.degree, e.field].filter(Boolean).join(isAr ? " - " : " in ");
              const parts = [degreeText, e.school].filter(Boolean);
              return (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12, fontSize:10 }}>
                    <span style={{ fontWeight:700 }}>
                      {parts.map((p, idx) => (<span key={idx}>{idx > 0 && <span style={{ color:"#999", fontWeight:400, margin:"0 8px" }}>|</span>}{p}</span>))}
                    </span>
                    <span style={{ color:"#666",fontSize:9.5, whiteSpace:"nowrap" }}>{e.from}{e.to?` – ${e.to}`:""}</span>
                  </div>
                  {((e.showGpa && e.gpa) || e.honors) && (
                    <p style={{ color:"#555", fontSize:8.5, marginTop:3, marginBottom:0, display:"flex", gap:10, flexWrap:"wrap" }}>
                      {e.showGpa && e.gpa && <span>{isAr?"المعدل":"GPA"}: {e.gpa}{e.gpaScale?`/${e.gpaScale}`:""}</span>}
                      {e.honors && <span>{isAr?"مرتبة الشرف":"Honors"}: {e.honors}</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {(() => {
          const certs = (cv.certifications || []).filter(c => c.title || c.issuer || c.date);
          if (!certs.length) return null;
          return (
            <section style={{ marginBottom:14 }}>
              <h2 style={{ ...sectionTitleStyle, marginBottom:10 }}>{H.certifications}</h2>
              {certs.map((c,i)=>(
                <div key={i} style={{ marginBottom:8, fontSize:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700 }}>
                    <span>{c.title}{c.issuer?` — ${c.issuer}`:""}</span>
                    {c.date && <span style={{ color:"#666",fontSize:9.5 }}>{c.date}</span>}
                  </div>
                </div>
              ))}
            </section>
          );
        })()}

        {cv.skills.length > 0 && (
          <section style={{ marginBottom:14 }}>
            <h2 style={sectionTitleStyle}>{H.skills}</h2>
            <p style={{ marginBottom:0, color:"#222", fontSize:10 }}>{cv.skills.join(", ")}</p>
          </section>
        )}

        {cv.languages.some(l=>l.lang) && (
          <section>
            <h2 style={sectionTitleStyle}>{H.languages}</h2>
            <p style={{ color:"#222", fontSize:10, marginBottom:0 }}>
              {cv.languages.filter(l=>l.lang).map(l=>`${l.lang}${l.level?` (${l.level})`:""}`).join(", ")}
            </p>
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
            backgroundSize: "360px 200px",
            transform: "rotate(-45deg)",
            transformOrigin: "center center",
            opacity: 0.1,
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
