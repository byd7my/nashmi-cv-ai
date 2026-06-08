import { P, FF } from "@/nashmi/lib/tokens";
import type { CvLang } from "@/nashmi/hooks/useLang";

interface LanguageModalProps {
  onChoose: (lang: CvLang) => void;
}

export function LanguageModal({ onChoose }: LanguageModalProps) {
  const ff = FF;
  const options = [
    { key: "ar" as CvLang, title: "العربية",   sub: "الواجهة والذكاء الاصطناعي بالعربية", flag: "🇸🇦" },
    { key: "en" as CvLang, title: "English",   sub: "Interface and AI in English",        flag: "🇬🇧" },
    { key: "bi" as CvLang, title: "Bilingual", sub: "عربي + English  ·  AI bilingual",    flag: "🌐" },
  ];
  return (
    <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(10,10,11,0.92)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:520, background:P.card, border:`1px solid ${P.border}`, borderRadius:18, padding:"32px 28px", boxShadow:`0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${P.violet}22`, fontFamily:ff }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:18 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff" }}>N</div>
          <div style={{ color:P.text, fontWeight:800, fontSize:20 }}>نشمي · Nashmi</div>
        </div>
        <h2 style={{ color:P.text, fontSize:20, fontWeight:800, textAlign:"center", marginBottom:6 }}>اختر لغتك  ·  Choose your language</h2>
        <p style={{ color:P.muted, fontSize:13, textAlign:"center", marginBottom:22 }}>Your choice controls the entire app and AI output.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {options.map(opt => (
            <button key={opt.key} onClick={() => onChoose(opt.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:12, cursor:"pointer", background:P.surface, border:`1px solid ${P.border}`, color:P.text, fontFamily:ff, textAlign:"left", transition:"border-color 0.2s, background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = P.violet; (e.currentTarget as HTMLButtonElement).style.background = `${P.violet}14`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = P.border; (e.currentTarget as HTMLButtonElement).style.background = P.surface; }}
            >
              <span style={{ fontSize:24 }}>{opt.flag}</span>
              <span style={{ flex:1 }}>
                <span style={{ display:"block", fontWeight:700, fontSize:15 }}>{opt.title}</span>
                <span style={{ display:"block", color:P.muted, fontSize:12, marginTop:2 }}>{opt.sub}</span>
              </span>
              <span style={{ color:P.violetLight, fontSize:18 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
