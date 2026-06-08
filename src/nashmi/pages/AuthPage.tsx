import { useState } from "react";
import { P, FF } from "@/nashmi/lib/tokens";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  onLangToggle: () => void;
  page: string;
}

export function AuthPage({ lang, t, onNav }: Props) {
  const isAr = lang === "ar";
  const ff = FF;
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await new Promise(r => setTimeout(r, 800));
      onNav("builder");
    } catch {
      setError(isAr ? "حدث خطأ، حاول مجدداً" : "Something went wrong, please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, direction: isAr ? "rtl" : "ltr", fontFamily: ff }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${P.violet}15 0%, transparent 70%)` }}/>
      </div>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Back */}
        <button onClick={() => onNav("landing")} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 14, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: ff }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = P.text}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = P.muted}
        >
          {isAr ? "→" : "←"} {isAr ? "العودة للرئيسية" : "Back to home"}
        </button>

        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "36px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff" }}>N</div>
            <span style={{ color: P.text, fontWeight: 800, fontSize: 20 }}>{t.brand}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 28, background: P.surface, borderRadius: 10, padding: 4 }}>
            {([["login", t.login], ["signup", t.signup]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setMode(key as "login" | "signup")} style={{
                flex: 1, background: mode === key ? P.card : "transparent",
                border: mode === key ? `1px solid ${P.border}` : "1px solid transparent",
                color: mode === key ? P.text : P.muted,
                borderRadius: 8, padding: "9px 12px", cursor: "pointer",
                fontSize: 14, fontWeight: 700, fontFamily: ff, transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          <h2 style={{ color: P.text, fontSize: 22, fontWeight: 800, marginBottom: 6, fontFamily: ff }}>
            {mode === "login" ? (isAr ? "أهلاً بعودتك" : "Welcome back") : (isAr ? "أنشئ حسابك" : "Create your account")}
          </h2>
          <p style={{ color: P.muted, fontSize: 13, marginBottom: 24 }}>
            {mode === "login" ? (isAr ? "سجّل دخولك للوصول إلى سيرتك الذاتية" : "Sign in to access your resume") : (isAr ? "ابدأ مجاناً — لا يلزم بطاقة" : "Start free — no credit card required")}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "الاسم" : "Full Name"}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={isAr ? "اسمك الكامل" : "Your full name"} required={mode === "signup"}
                  style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 14, outline: "none", fontFamily: ff, direction: isAr ? "rtl" : "ltr", boxSizing: "border-box" }}
                  onFocus={e => e.currentTarget.style.borderColor = P.violet}
                  onBlur={e => e.currentTarget.style.borderColor = P.border}
                />
              </div>
            )}
            <div>
              <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={isAr ? "بريدك الإلكتروني" : "your@email.com"} required
                style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 14, outline: "none", fontFamily: ff, direction: "ltr", boxSizing: "border-box" }}
                onFocus={e => e.currentTarget.style.borderColor = P.violet}
                onBlur={e => e.currentTarget.style.borderColor = P.border}
              />
            </div>
            <div>
              <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "كلمة المرور" : "Password"}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isAr ? "••••••••" : "••••••••"} required
                style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 14, outline: "none", fontFamily: ff, boxSizing: "border-box" }}
                onFocus={e => e.currentTarget.style.borderColor = P.violet}
                onBlur={e => e.currentTarget.style.borderColor = P.border}
              />
            </div>

            {error && <div style={{ background: `${P.red}1A`, border: `1px solid ${P.red}44`, color: P.red, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "13px 20px", cursor: loading ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: ff, opacity: loading ? 0.7 : 1, transition: "opacity 0.2s", marginTop: 4 }}>
              {loading ? (isAr ? "جارٍ المعالجة..." : "Processing...") : (mode === "login" ? t.login : t.signup)}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: P.border }}/>
            <span style={{ color: P.muted, fontSize: 12 }}>{isAr ? "أو" : "or"}</span>
            <div style={{ flex: 1, height: 1, background: P.border }}/>
          </div>

          <button onClick={() => onNav("builder")} style={{ width: "100%", background: "transparent", border: `1px solid ${P.borderLight}`, color: P.text, borderRadius: 12, padding: "12px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ff, transition: "border-color 0.2s" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = P.violet}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = P.borderLight}
          >
            🚀 {isAr ? "ابدأ بدون حساب" : "Continue without account"}
          </button>

          <p style={{ color: P.muted, fontSize: 12, textAlign: "center", marginTop: 18 }}>
            {mode === "login" ? (isAr ? "ليس لديك حساب؟ " : "Don't have an account? ") : (isAr ? "لديك حساب؟ " : "Already have an account? ")}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ background: "none", border: "none", color: P.violetLight, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}>
              {mode === "login" ? t.signup : t.login}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
