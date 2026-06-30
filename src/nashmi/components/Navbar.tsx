import { useState } from "react";
import { P, FF } from "@/nashmi/lib/tokens";
import { NAV_ROUTES } from "@/nashmi/lib/translations";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface NavbarProps {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  page: string;
  onLangToggle: () => void;
}

const signupBtnStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
  border: "none",
  color: "#fff",
  borderRadius: 8,
  padding: "9px 16px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: FF,
  boxShadow: `0 4px 20px ${P.violet}44`,
  transition: "transform 0.2s, opacity 0.2s",
  whiteSpace: "nowrap",
};

const mobileSignupBtnStyle: React.CSSProperties = {
  ...signupBtnStyle,
  padding: "9px 12px",
  fontSize: 12,
};

const jobsBotBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: `1.5px solid ${P.violet}`,
  color: P.violetLight,
  borderRadius: 8,
  padding: "9px 10px",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  fontFamily: FF,
  boxShadow: `0 2px 12px ${P.violet}22`,
  transition: "transform 0.2s, opacity 0.2s",
  whiteSpace: "nowrap",
};

export function Navbar({ lang, t, onNav, page, onLangToggle }: NavbarProps) {
  const isAr = lang === "ar";
  const ff = FF;
  const routes = [
    ...NAV_ROUTES[lang],
    { label: isAr ? "قدّم على وظائف" : "Jobs Bot", page: "jobs-bot" },
  ] as const;
  const [menuOpen, setMenuOpen] = useState(false);

  const pricingLabel = routes.find(r => r.anchor === "pricing")?.label ?? (isAr ? "الأسعار" : "Pricing");
  const jobsBotLabel = routes.find(r => r.page === "jobs-bot")?.label ?? (isAr ? "قدّم على وظائف" : "Jobs Bot");

  const isActive = (route: { label: string; anchor?: string; page?: string }) => {
    if (route.page) return page === route.page;
    return page === "landing";
  };

  const handleNavClick = (route: { label: string; anchor?: string; page?: string }) => {
    setMenuOpen(false);
    if (route.page === "blog") {
      window.location.href = "/blog";
      return;
    }
    if (route.page === "jobs-bot") {
      window.location.href = "/jobs-bot";
      return;
    }
    if (route.page) { onNav(route.page); return; }
    if (route.anchor) {
      if (page !== "landing") { onNav("landing"); setTimeout(() => document.getElementById(route.anchor!)?.scrollIntoView({ behavior:"smooth", block:"start" }), 120); }
      else { document.getElementById(route.anchor)?.scrollIntoView({ behavior:"smooth", block:"start" }); }
    }
  };

  const goToPricing = () => {
    setMenuOpen(false);
    handleNavClick({ label: "", anchor: "pricing" });
  };

  const goToJobsBot = () => {
    setMenuOpen(false);
    window.location.href = "/jobs-bot";
  };

  const langBtnProps = {
    onClick: onLangToggle,
    style: {
      background: `${P.border}cc`,
      border: `1px solid ${P.borderLight}`,
      color: P.muted,
      borderRadius: 8,
      padding: "6px 13px",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      transition: "border-color 0.2s, color 0.2s",
    } as React.CSSProperties,
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.borderColor = P.violet;
      e.currentTarget.style.color = P.violetLight;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.borderColor = P.borderLight;
      e.currentTarget.style.color = P.muted;
    },
    children: isAr ? "EN" : "ع",
  };

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .nav-center-links { display: none !important; }
          .nav-desktop-controls { display: none !important; }
          .nav-mobile-center { display: flex !important; }
          .nav-mobile-left { display: flex !important; }
          .nav-brand-text { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-inner {
            padding: 0 10px !important;
            gap: 0 !important;
          }
          .nav-mobile-center {
            flex: 1;
            justify-content: center;
            align-items: center;
            gap: 6px;
            min-width: 0;
            padding: 0 4px;
          }
          .nav-mobile-left {
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }
          .nav-mobile-left .nav-lang-btn {
            padding: 6px 10px !important;
          }
        }
        @media (min-width: 641px) {
          .nav-hamburger { display: none !important; }
          .nav-mobile-menu { display: none !important; }
          .nav-mobile-center { display: none !important; }
          .nav-mobile-left { display: none !important; }
        }
      `}</style>

      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        height:64,
        background:`${P.bg}e8`, backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${P.border}`,
      }}>
        <div className="nav-inner" style={{ maxWidth:1200, margin:"0 auto", height:"100%", display:"flex", alignItems:"center", padding:"0 16px", gap:12, direction: isAr ? "rtl" : "ltr" }}>

          {/* Logo — rightmost in RTL */}
          <div className="nav-logo" onClick={() => onNav("landing")} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff", boxShadow:`0 4px 16px ${P.violet}55` }}>N</div>
            <span className="nav-brand-text" style={{ color:P.text, fontWeight:800, fontSize:18, fontFamily:ff }}>{t.brand}</span>
          </div>

          {/* Center nav — desktop only */}
          <div className="nav-center-links" style={{ flex:1, display:"flex", justifyContent:"center", gap:30, overflow:"hidden" }}>
            {routes.map((route, i) => {
              const active = isActive(route);
              return (
                <button key={i} onClick={() => handleNavClick(route)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  fontSize:14, fontWeight: active ? 700 : 500,
                  color: active ? P.violetLight : P.muted,
                  fontFamily:ff, padding:"6px 0", position:"relative",
                  transition:"color 0.2s", whiteSpace:"nowrap",
                }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = P.text; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = P.muted; }}
                >
                  {route.label}
                  {active && <span style={{ position:"absolute", bottom:0, left:0, right:0, height:2, borderRadius:2, background:`linear-gradient(90deg, ${P.violet}, ${P.violetLight})` }}/>}
                </button>
              );
            })}
          </div>

          {/* Spacer on desktop */}
          <div style={{ flex:1 }} className="nav-center-links" />

          {/* Mobile center — signup + jobs bot */}
          <div className="nav-mobile-center" style={{ display: "none", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => onNav("builder")}
              style={mobileSignupBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.opacity = "0.92"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.opacity = "1"; }}
            >{t.signup}</button>
            <button
              type="button"
              onClick={goToJobsBot}
              style={jobsBotBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.opacity = "0.92"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.opacity = "1"; }}
            >{jobsBotLabel}</button>
          </div>

          {/* Desktop right controls */}
          <div className="nav-desktop-controls nav-right-controls" style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button className="nav-lang-btn" {...langBtnProps} />

            <button className="nav-login-btn" onClick={goToPricing} style={{ background:"none", border:`1px solid ${P.borderLight}`, color:P.text, borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:14, fontWeight:500, fontFamily:ff, transition:"border-color 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = P.violet}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = P.borderLight}
            >{pricingLabel}</button>

            <button
              onClick={() => onNav("builder")}
              style={signupBtnStyle}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.92"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >{t.signup}</button>
          </div>

          {/* Mobile left — language + hamburger */}
          <div className="nav-mobile-left" style={{ display: "none", alignItems: "center" }}>
            <button className="nav-lang-btn" type="button" {...langBtnProps} />
            <button className="nav-hamburger" type="button" onClick={() => setMenuOpen(o => !o)} style={{ display:"none", background:"none", border:`1px solid ${P.borderLight}`, color:P.text, borderRadius:8, padding:"8px 10px", cursor:"pointer", fontSize:16, lineHeight:1 }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{
          position:"fixed", top:64, left:0, right:0, zIndex:199,
          background:P.bg, borderBottom:`1px solid ${P.border}`,
          padding:"12px 16px", display:"flex", flexDirection:"column", gap:4,
          direction: isAr ? "rtl" : "ltr",
        }}>
          {routes.map((route, i) => (
            <button key={i} onClick={() => handleNavClick(route)} style={{
              background:"none", border:"none", cursor:"pointer",
              fontSize:15, fontWeight: isActive(route) ? 700 : 500,
              color: isActive(route) ? P.violetLight : P.text,
              fontFamily:ff, padding:"12px 8px", textAlign: isAr ? "right" : "left",
              borderBottom:`1px solid ${P.border}`,
            }}>
              {route.label}
            </button>
          ))}
          <button onClick={goToPricing} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, color:P.muted, fontFamily:ff, padding:"12px 8px", textAlign: isAr ? "right" : "left" }}>
            {pricingLabel}
          </button>
        </div>
      )}
    </>
  );
}
