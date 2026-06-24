import { P, FF } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_AR, NASHMI_WHATSAPP_DISPLAY_EN } from "@/nashmi/lib/site-contact";
import { NAV_ROUTES } from "@/nashmi/lib/translations";
import type { TrLang, Translation } from "@/nashmi/lib/translations";
import { Mail, MessageCircle } from "lucide-react";

interface FooterProps {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
}

export function Footer({ lang, t, onNav }: FooterProps) {
  const isAr = lang === "ar";
  const ff = FF;
  const routes = NAV_ROUTES[lang] as readonly { label: string; anchor?: string; page?: string }[];

  return (
    <footer style={{ borderTop:`1px solid ${P.border}`, padding:"32px 24px", direction: isAr ? "rtl" : "ltr" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#fff" }}>N</div>
          <span style={{ color:P.text, fontWeight:700, fontFamily:ff }}>{t.brand}</span>
        </div>
        <div style={{ display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
          {routes.map(r => (
            <button key={r.label} onClick={() => {
              if (r.page === "blog") { window.location.href = "/blog"; return; }
              if (r.page) onNav(r.page);
              else { onNav("landing"); setTimeout(() => document.getElementById(r.anchor!)?.scrollIntoView({ behavior:"smooth" }), 120); }
            }} style={{ background:"none", border:"none", color:P.muted, cursor:"pointer", fontSize:13, fontFamily:ff, transition:"color 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = P.text}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = P.muted}
            >{r.label}</button>
          ))}
          <a href="/privacy" style={{ color:P.muted, fontSize:13, fontFamily:ff, textDecoration:"none" }}>{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</a>
          <a href="/terms" style={{ color:P.muted, fontSize:13, fontFamily:ff, textDecoration:"none" }}>{isAr ? "الشروط والأحكام" : "Terms & Conditions"}</a>
          <a href={NASHMI_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.open(NASHMI_WHATSAPP_URL, "_blank", "noopener,noreferrer"); }} style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#25D366", fontSize:13, fontFamily:ff, textDecoration:"none", border:`1px solid #25D36644`, padding:"6px 12px", borderRadius:8, cursor:"pointer" }}>
            <MessageCircle size={16} />
            {isAr ? `واتساب: ${NASHMI_WHATSAPP_DISPLAY_AR}` : `WhatsApp: ${NASHMI_WHATSAPP_DISPLAY_EN}`}
          </a>
          <a href={`mailto:${NASHMI_CONTACT_EMAIL}`} style={{ display:"inline-flex", alignItems:"center", gap:6, color:P.violetLight, fontSize:13, fontFamily:ff, textDecoration:"none", border:`1px solid ${P.violet}44`, padding:"6px 12px", borderRadius:8 }}>
            <Mail size={16} />
            {NASHMI_CONTACT_EMAIL}
          </a>
        </div>
        <div style={{ color:P.muted, fontSize:13 }}>© 2026 {t.brand}. {isAr ? "جميع الحقوق محفوظة" : "All rights reserved."}</div>
      </div>
    </footer>
  );
}
