import { useState, useEffect } from "react";
import { getCvSessionId } from "@/nashmi/lib/session";
import { setPurchaseToken, setSessionPlanTier } from "@/nashmi/lib/plan-session";
import { P, FF } from "@/nashmi/lib/tokens";
import { track } from "@/nashmi/lib/analytics";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  plan: string;
  onPaid: (plan: string) => void;
}

export function CheckoutPage({ lang, t, onNav, plan, onPaid }: Props) {
  const isAr = lang === "ar";
  const ff = FF;
  const [step, setStep] = useState<"review" | "pay" | "success">("review");
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState("mada");
  const [payError, setPayError] = useState("");

  const planData = t.plans.find(p => p.tier === plan) || t.plans[1];
  const price = planData.price + (planData.cur ? " " + planData.cur : "");

  const handlePay = async () => {
    setLoading(true);
    setPayError("");
    track("payment_page_reached", { plan, method: payMethod });

    try {
      const sessionId = getCvSessionId();
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-nashmi-session-id": sessionId },
        body: JSON.stringify({
          plan,
          sessionId,
          paymentMethod: payMethod,
          paymentRef: `demo-${Date.now()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.token !== "string") {
        throw new Error(typeof data?.error === "string" ? data.error : `Payment failed (${res.status})`);
      }

      setPurchaseToken(data.token);
      setSessionPlanTier(plan);
      onPaid(plan);
      setStep("success");
    } catch (err) {
      setPayError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر إتمام الدفع"
            : "Could not complete payment",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== "success") return;
    const id = setTimeout(() => onNav("builder"), 1800);
    return () => clearTimeout(id);
  }, [step, onNav]);

  if (step === "success") {
    return (
      <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: ff }}>
        <div style={{ width: "100%", maxWidth: 480, background: P.card, border: `1px solid ${P.green}44`, borderRadius: 24, padding: "48px 36px", textAlign: "center", boxShadow: `0 0 60px ${P.green}1A` }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${P.green}1A`, border: `2px solid ${P.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>✓</div>
          <h2 style={{ color: P.text, fontSize: 26, fontWeight: 900, marginBottom: 10 }}>{isAr ? "تم الدفع بنجاح!" : "Payment Successful!"}</h2>
          <p style={{ color: P.muted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
            {isAr
              ? `تم تفعيل باقة ${planData.name}. جلسة واحدة لبناء وتصدير سيرتك — سيتم تحويلك للمنشئ...`
              : `Your ${planData.name} plan is active. One session to build and export — redirecting to the builder...`}
          </p>
          <button onClick={() => onNav("builder")} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "14px 32px", cursor: "pointer", fontSize: 15, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 24px ${P.violet}44` }}>
            {isAr ? "انتقل إلى المنشئ ←" : "Go to Builder →"}
          </button>
        </div>
      </div>
    );
  }

  const methods = [
    { id: "mada",       label: "Mada",             icon: "💳", sub: isAr ? "بطاقة مدى السعودية" : "Saudi Mada card" },
    { id: "visa",       label: "Visa / Mastercard", icon: "💳", sub: isAr ? "بطاقة دولية" : "International card" },
    { id: "applepay",   label: "Apple Pay",         icon: "🍎", sub: isAr ? "الدفع السريع" : "Fast checkout" },
    { id: "stcpay",     label: "STC Pay",           icon: "📱", sub: isAr ? "محفظة STC" : "STC wallet" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, paddingTop: 80, fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}>
      <div style={{ width: "100%", maxWidth: 840, display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div>
          <button onClick={() => onNav("builder")} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 14, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: ff }}>
            {isAr ? "→" : "←"} {isAr ? "العودة" : "Back"}
          </button>

          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "28px 26px" }}>
            <h2 style={{ color: P.text, fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{isAr ? "طريقة الدفع" : "Payment Method"}</h2>

            <div style={{ background: `${P.violet}12`, border: `1px solid ${P.violet}33`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: P.violetLight, marginBottom: 16, lineHeight: 1.6 }}>
              {isAr
                ? "⚡ دفعة واحدة = جلسة سيرة واحدة. بعد التصدير تنتهي الجلسة وتحتاج شراء جديد لسيرة أخرى."
                : "⚡ One payment = one resume session. After export the session ends; a new purchase is needed for another resume."}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
              {methods.map(m => (
                <button key={m.id} onClick={() => setPayMethod(m.id)} style={{ background: payMethod === m.id ? `${P.violet}1A` : P.surface, border: `1px solid ${payMethod === m.id ? P.violet : P.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: ff, transition: "all 0.2s" }}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <span style={{ textAlign: isAr ? "right" : "left" }}>
                    <span style={{ display: "block", color: P.text, fontWeight: 700, fontSize: 13 }}>{m.label}</span>
                    <span style={{ display: "block", color: P.muted, fontSize: 11 }}>{m.sub}</span>
                  </span>
                </button>
              ))}
            </div>

            {(payMethod === "mada" || payMethod === "visa") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "رقم البطاقة" : "Card Number"}</label>
                  <input placeholder="4111 1111 1111 1111" style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 14px", color: P.text, fontSize: 14, outline: "none", fontFamily: "monospace", direction: "ltr", boxSizing: "border-box" }} readOnly/>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "تاريخ الانتهاء" : "Expiry"}</label>
                    <input placeholder="MM / YY" style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 14px", color: P.text, fontSize: 14, outline: "none", direction: "ltr", boxSizing: "border-box" }} readOnly/>
                  </div>
                  <div>
                    <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>CVV</label>
                    <input placeholder="•••" style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 14px", color: P.text, fontSize: 14, outline: "none", direction: "ltr", boxSizing: "border-box" }} readOnly/>
                  </div>
                </div>
              </div>
            )}

            {payError && (
              <div style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, borderRadius: 10, padding: "10px 12px", color: P.red, fontSize: 13, marginBottom: 14 }}>
                {payError}
              </div>
            )}

            <button onClick={handlePay} disabled={loading} style={{ width: "100%", background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "14px 20px", cursor: loading ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 24px ${P.violet}44`, opacity: loading ? 0.8 : 1, transition: "opacity 0.2s" }}>
              {loading ? (isAr ? "⏳ جارٍ المعالجة..." : "⏳ Processing...") : `${isAr ? "ادفع" : "Pay"} ${price}`}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, color: P.muted, fontSize: 12 }}>
              🔒 {isAr ? "دفع آمن — سيتم ربط بوابة دفع حقيقية قريباً" : "Secure checkout — real payment gateway coming soon"}
            </div>
          </div>
        </div>

        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "26px 22px" }}>
          <h3 style={{ color: P.text, fontSize: 16, fontWeight: 800, marginBottom: 18 }}>{isAr ? "ملخص الطلب" : "Order Summary"}</h3>

          <div style={{ background: `linear-gradient(135deg, ${P.violet}15, transparent)`, border: `1px solid ${P.violet}33`, borderRadius: 12, padding: "16px 14px", marginBottom: 18 }}>
            <div style={{ color: P.text, fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{planData.name}</div>
            <div style={{ color: P.muted, fontSize: 13, lineHeight: 1.6 }}>{planData.desc}</div>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 7 }}>
            {planData.features.filter(f => f.included).map((f, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 7, color: P.textSub, fontSize: 12 }}>
                <span style={{ color: P.green, fontWeight: 700 }}>✓</span>
                {f.text}
              </li>
            ))}
          </ul>

          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: P.muted, fontSize: 13 }}>{isAr ? "الباقة" : "Plan"}</span>
              <span style={{ color: P.text, fontSize: 13 }}>{price}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ color: P.muted, fontSize: 13 }}>{isAr ? "الضريبة" : "Tax"}</span>
              <span style={{ color: P.muted, fontSize: 13 }}>{isAr ? "شامل الضريبة" : "Included"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${P.border}`, paddingTop: 12 }}>
              <span style={{ color: P.text, fontWeight: 800, fontSize: 15 }}>{isAr ? "الإجمالي" : "Total"}</span>
              <span style={{ color: P.violetLight, fontWeight: 900, fontSize: 18 }}>{price}</span>
            </div>
          </div>

          <div style={{ marginTop: 18, background: `${P.green}15`, border: `1px solid ${P.green}33`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: P.green, display: "flex", gap: 6, alignItems: "flex-start" }}>
            ✓ {isAr ? "دفعة واحدة — بدون اشتراك شهري" : "One-time payment — no subscription"}
          </div>
        </div>
      </div>
    </div>
  );
}
