import { EN_HEADERS, AR_HEADERS } from "@/nashmi/lib/cv-parser";
import type { CVData } from "@/nashmi/lib/ats";

interface CVPreviewProps {
  cv: CVData;
  lang: string;
  cvLanguage?: string;
}

export function CVPreview({ cv, lang, cvLanguage }: CVPreviewProps) {
  const effectiveLang = cvLanguage === "ar" || cvLanguage === "en" ? cvLanguage : (lang === "ar" ? "ar" : "en");
  const isAr = effectiveLang === "ar";
  const H = isAr ? AR_HEADERS : EN_HEADERS;
  const ff = isAr
    ? "'Cairo', 'Tajawal', 'Noto Naskh Arabic', Tahoma, Arial, sans-serif"
    : "'Inter', 'Helvetica Neue', Arial, sans-serif";

  return (
    <div style={{ background:"#fff", color:"#111", fontFamily:ff, fontSize:10.5, lineHeight:1.55, padding:"28px 32px", width:"100%", minHeight:600, direction:isAr?"rtl":"ltr" }}>
      {/* Header */}
      <div style={{ textAlign:"center", borderBottom:"2px solid #111", paddingBottom:12, marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700 }}>{cv.personal.name||(isAr?"الاسم الكامل":"Full Name")}</div>
        {cv.personal.title && <div style={{ fontSize:13, color:"#444", marginTop:4 }}>{cv.personal.title}</div>}
        <div style={{ fontSize:10, color:"#555", marginTop:6, display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          {cv.personal.email && <span>{cv.personal.email}</span>}
          {cv.personal.phone && <span>{cv.personal.phone}</span>}
          {cv.personal.city  && <span>{cv.personal.city}</span>}
          {cv.personal.linkedin && <span>{cv.personal.linkedin}</span>}
        </div>
      </div>

      {/* Summary */}
      {cv.summary && <>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"1px solid #333", paddingBottom:3, marginBottom:8 }}>{H.summary}</div>
        <p style={{ marginBottom:14, color:"#222", fontSize:10 }}>{cv.summary}</p>
      </>}

      {/* Experience */}
      {cv.experience.some(e=>e.company||e.role) && <>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"1px solid #333", paddingBottom:3, marginBottom:10 }}>{H.experience}</div>
        {cv.experience.filter(e=>e.company||e.role).map((e,i)=>(
          <div key={i} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:10 }}>
              <span>{e.role}{e.company&&` — ${e.company}`}</span>
              <span style={{ color:"#666",fontSize:9.5 }}>{e.from}{e.to?` – ${e.to}`:""}</span>
            </div>
            {e.desc && <div style={{ marginTop:4, fontSize:9.5, color:"#333", whiteSpace:"pre-line" }}>• {e.desc}</div>}
          </div>
        ))}
      </>}

      {/* Education */}
      {cv.education.some(e=>e.school||e.degree) && <>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"1px solid #333", paddingBottom:3, marginBottom:10 }}>{H.education}</div>
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
                <div style={{ color:"#555", fontSize:8.5, marginTop:3, display:"flex", gap:10, flexWrap:"wrap" }}>
                  {e.showGpa && e.gpa && <span>{isAr?"المعدل":"GPA"}: {e.gpa}{e.gpaScale?`/${e.gpaScale}`:""}</span>}
                  {e.honors && <span>{isAr?"مرتبة الشرف":"Honors"}: {e.honors}</span>}
                </div>
              )}
            </div>
          );
        })}
      </>}

      {/* Certifications */}
      {(() => {
        const certs = (cv.certifications || []).filter(c => c.title || c.issuer || c.date);
        if (!certs.length) return null;
        return <>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"1px solid #333", paddingBottom:3, marginBottom:10 }}>{H.certifications}</div>
          {certs.map((c,i)=>(
            <div key={i} style={{ marginBottom:8, fontSize:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700 }}>
                <span>{c.title}{c.issuer?` — ${c.issuer}`:""}</span>
                {c.date && <span style={{ color:"#666",fontSize:9.5 }}>{c.date}</span>}
              </div>
            </div>
          ))}
        </>;
      })()}

      {/* Skills */}
      {cv.skills.length > 0 && <>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"1px solid #333", paddingBottom:3, marginBottom:8, marginTop:4 }}>{H.skills}</div>
        <div style={{ marginBottom:14, color:"#222", fontSize:10 }}>{cv.skills.join(" · ")}</div>
      </>}

      {/* Languages */}
      {cv.languages.some(l=>l.lang) && <>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"1px solid #333", paddingBottom:3, marginBottom:8 }}>{H.languages}</div>
        <div style={{ color:"#222", fontSize:10 }}>{cv.languages.filter(l=>l.lang).map(l=>`${l.lang}${l.level?` (${l.level})`:""}`).join(" · ")}</div>
      </>}
    </div>
  );
}
