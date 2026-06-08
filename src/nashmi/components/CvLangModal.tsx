import { P, FF } from "@/nashmi/lib/tokens";
import type { CvLang } from "@/nashmi/hooks/useLang";
import type { TrLang } from "@/nashmi/lib/translations";

interface CvLangModalProps {
  lang: TrLang;
  onPick: (lang: CvLang) => void;
  onClose: () => void;
}

export function CvLangModal({ lang, onPick, onClose }: CvLangModalProps) {
  const ff = FF;
  const isAr = lang === "ar";
  const options = [
    { key: "ar" as CvLang, title: isAr?"العربية":"Arabic",   sub: isAr?"سأكتب سيرتي بالعربية فقط":"Write my CV in Arabic only",    flag:"🇸🇦" },
    { key: "en" as CvLang, title: isAr?"الإنجليزية":"English", sub: isAr?"I will write my CV in English only":"Write my CV in English only", flag:"🇬🇧" },
    { key: "bi" as CvLang, title: isAr?"ثنائي اللغة":"Bilingual", sub: isAr?"سيرة عربية وأخرى بالإنجليزية":"Arabic and English versions", flag:"🌐" },
  ];
  return (
    <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(10,10,11,0.92)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, direction:isAr?"rtl":"ltr", animation:"fadeUp 0.25s ease both" }}>
      <div style={{ width:"100%", maxWidth:540, background:P.card, border:`1px solid ${P.border}`, borderRadius:20, padding:"30px 26px 26px", boxShadow:`0 32px 80px rgba(0,0,0,0.65)`, fontFamily:ff, position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:14, [isAr?"left":"right"]:14, background:"transparent", border:"none", color:P.muted, fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff" }}>✦</div>
        </div>
        <h2 style={{ color:P.text, fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>
          {isAr?"اختر لغة سيرتك الذاتية":"Choose your CV Language"}
        </h2>
        <p style={{ color:P.muted, fontSize:13, textAlign:"center", marginBottom:22, lineHeight:1.6 }}>
          {isAr?"سيقوم الذكاء الاصطناعي بكتابة وتحسين سيرتك بهذه اللغة فقط — بدون ترجمة.":"AI will write and polish your CV strictly in this language — no translation."}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {options.map(opt => (
            <button key={opt.key} onClick={() => onPick(opt.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 16px", borderRadius:14, cursor:"pointer", background:P.surface, border:`1px solid ${P.border}`, color:P.text, fontFamily:ff, textAlign:isAr?"right":"left", transition:"border-color 0.2s, background 0.2s, transform 0.1s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor=P.violet; el.style.background=`${P.violet}14`; el.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor=P.border; el.style.background=P.surface; el.style.transform=""; }}
            >
              <span style={{ fontSize:26 }}>{opt.flag}</span>
              <span style={{ flex:1 }}>
                <span style={{ display:"block", fontWeight:700, fontSize:15 }}>{opt.title}</span>
                <span style={{ display:"block", color:P.muted, fontSize:12, marginTop:3 }}>{opt.sub}</span>
              </span>
              <span style={{ color:P.violetLight, fontSize:20 }}>{isAr?"‹":"›"}</span>
            </button>
          ))}
        </div>
        <p style={{ color:P.muted, fontSize:11, textAlign:"center", marginTop:18, opacity:0.75 }}>
          {isAr?"يمكنك تغيير هذا الاختيار في أي وقت من داخل المنشئ":"You can change this choice anytime from inside the builder"}
        </p>
      </div>
    </div>
  );
}
