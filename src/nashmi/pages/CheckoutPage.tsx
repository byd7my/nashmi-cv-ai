import { useState, useEffect } from "react";
import { getCvSessionId } from "@/nashmi/lib/session";
import { setPurchaseToken, setSessionPlanTier } from "@/nashmi/lib/plan-session";
import { touchFreeDraftTimestamp } from "@/nashmi/lib/client-data-wipe";
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

const CHECKOUT_CSS = `
  .checkout-page {
    min-height: 100vh;
    background: ${P.bg};
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 80px 24px 32px;
    box-sizing: border-box;
  }
  .checkout-grid {
    width: 100%;
    max-width: 840px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 24px;
    align-items: start;
  }
  .checkout-card {
    background: ${P.card};
    border: 1px solid ${P.border};
    border-radius: 20px;
    box-sizing: border-box;
  }
  .checkout-pay-card { padding: 28px 26px; }
  .checkout-summary-card { padding: 26px 22px; }
  .checkout-methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 22px;
  }
  .checkout-method-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    min-width: 0;
    text-align: inherit;
  }
  .checkout-method-label {
    display: block;
    font-weight: 700;
    font-size: 13px;
    color: ${P.text};
    word-break: break-word;
  }
  .checkout-method-sub {
    display: block;
    font-size: 11px;
    color: ${P.muted};
    line-height: 1.4;
  }
  .checkout-expiry-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .checkout-success-wrap {
    min-height: 100vh;
    background: ${P.bg};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .checkout-success-card {
    width: 100%;
    max-width: 480px;
    background: ${P.card};
    border: 1px solid ${P.green}44;
    border-radius: 24px;
    padding: 48px 36px;
    text-align: center;
    box-shadow: 0 0 60px ${P.green}1A;
    box-sizing: border-box;
  }
  @media (max-width: 768px) {
    .checkout-page {
      padding: 72px 14px 24px;
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
    .checkout-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .checkout-summary-card { order: -1; }
    .checkout-pay-card { padding: 20px 16px; }
    .checkout-summary-card { padding: 20px 16px; }
    .checkout-methods { grid-template-columns: 1fr; gap: 8px; }
    .checkout-method-btn { padding: 14px 12px; }
    .checkout-success-card { padding: 36px 20px; border-radius: 18px; }
    .checkout-success-title { font-size: 22px !important; }
  }
  @media (max-width: 380px) {
    .checkout-expiry-row { grid-template-columns: 1fr; }
  }
`;

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
    touchFreeDraftTimestamp();
    const id = window.setInterval(() => touchFreeDraftTimestamp(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (step !== "success") return;
    const id = setTimeout(() => onNav("builder"), 1800);
    return () => clearTimeout(id);
  }, [step, onNav]);

  if (step === "success") {
    return (
      <>
        <style>{CHECKOUT_CSS}</style>
        <div className="checkout-success-wrap" style={{ fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}>
          <div className="checkout-success-card">
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${P.green}1A`, border: `2px solid ${P.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>✓</div>
            <h2 className="checkout-success-title" style={{ color: P.text, fontSize: 26, fontWeight: 900, marginBottom: 10 }}>{isAr ? "تم الدفع بنجاح!" : "Payment Successful!"}</h2>
            <p style={{ color: P.muted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
              {isAr
                ? `تم تفعيل باقة ${planData.name}. جلسة واحدة لبناء وتصدير سيرتك — سيتم تحويلك للمنشئ...`
                : `Your ${planData.name} plan is active. One session to build and export — redirecting to the builder...`}
            </p>
            <button onClick={() => onNav("builder")} style={{ width: "100%", maxWidth: 280, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "14px 24px", cursor: "pointer", fontSize: 15, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 24px ${P.violet}44` }}>
              {isAr ? "انتقل إلى المنشئ ←" : "Go to Builder →"}
            </button>
          </div>
        </div>
      </>
    );
  }

  const methods = [
    { id: "mada", label: "Mada", icon: "💳", sub: isAr ? "بطاقة مدى السعودية" : "Saudi Mada card" },
    { id: "visa", label: "Visa / Mastercard", icon: "💳", sub: isAr ? "بطاقة دولية" : "International card" },
    { id: "applepay", label: "Apple Pay", icon: "🍎", sub: isAr ? "الدفع السريع" : "Fast checkout" },
    { id: "stcpay", label: "STC Pay", icon: "📱", sub: isAr ? "محفظة STC" : "STC wallet" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: P.surface,
    border: `1px solid ${P.border}`,
    borderRadius: 10,
    padding: "11px 14px",
    color: P.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{CHECKOUT_CSS}</style>
      <div className="checkout-page" style={{ fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}>
        <div className="checkout-grid">
          <div>
            <button
              type="button"
              onClick={() => onNav("builder")}
              style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 6, fontFamily: ff, padding: 0 }}
            >
              {isAr ? "→" : "←"} {isAr ? "العودة" : "Back"}
            </button>

            <div className="checkout-card checkout-pay-card">
              <h2 style={{ color: P.text, fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{isAr ? "طريقة الدفع" : "Payment Method"}</h2>

              <div style={{ background: `${P.violet}12`, border: `1px solid ${P.violet}33`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: P.violetLight, marginBottom: 16, lineHeight: 1.65 }}>
                {isAr
                  ? "⚡ دفعة واحدة = جلسة سيرة واحدة. بعد التصدير تنتهي الجلسة."
                  : "⚡ One payment = one resume session. Session ends after export."}
              </div>

              <div className="checkout-methods">
                {methods.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="checkout-method-btn"
                    onClick={() => setPayMethod(m.id)}
                    style={{
                      background: payMethod === m.id ? `${P.violet}1A` : P.surface,
                      border: `1px solid ${payMethod === m.id ? P.violet : P.border}`,
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: isAr ? "right" : "left" }}>
                      <span className="checkout-method-label">{m.label}</span>
                      <span className="checkout-method-sub">{m.sub}</span>
                    </span>
                  </button>
                ))}
              </div>

              {(payMethod === "mada" || payMethod === "visa") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "رقم البطاقة" : "Card Number"}</label>
                    <input placeholder="4111 1111 1111 1111" style={{ ...inputStyle, fontFamily: "monospace", direction: "ltr" }} readOnly />
                  </div>
                  <div className="checkout-expiry-row">
                    <div>
                      <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "تاريخ الانتهاء" : "Expiry"}</label>
                      <input placeholder="MM / YY" style={{ ...inputStyle, direction: "ltr" }} readOnly />
                    </div>
                    <div>
                      <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>CVV</label>
                      <input placeholder="•••" style={{ ...inputStyle, direction: "ltr" }} readOnly />
                    </div>
                  </div>
                </div>
              )}

              {payError && (
                <div style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, borderRadius: 10, padding: "10px 12px", color: P.red, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                  {payError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                style={{ width: "100%", background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "14px 20px", cursor: loading ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 24px ${P.violet}44`, opacity: loading ? 0.8 : 1 }}
              >
                {loading ? (isAr ? "⏳ جارٍ المعالجة..." : "⏳ Processing...") : `${isAr ? "ادفع" : "Pay"} ${price}`}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, color: P.muted, fontSize: 11, lineHeight: 1.5, textAlign: "center" }}>
                🔒 {isAr ? "دفع آمن — مدى · Visa · Apple Pay · STC Pay" : "Secure payment — Mada · Visa · Apple Pay · STC Pay"}
              </div>
            </div>
          </div>

          <div className="checkout-card checkout-summary-card">
            <h3 style={{ color: P.text, fontSize: 16, fontWeight: 800, marginBottom: 16 }}>{isAr ? "ملخص الطلب" : "Order Summary"}</h3>

            <div style={{ background: `linear-gradient(135deg, ${P.violet}15, transparent)`, border: `1px solid ${P.violet}33`, borderRadius: 12, padding: "16px 14px", marginBottom: 16 }}>
              <div style={{ color: P.text, fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{planData.name}</div>
              <div style={{ color: P.muted, fontSize: 13, lineHeight: 1.6 }}>{planData.desc}</div>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 7 }}>
              {planData.features.filter(f => f.included).map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, color: P.textSub, fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ color: P.green, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
                <span style={{ color: P.muted, fontSize: 13 }}>{isAr ? "الباقة" : "Plan"}</span>
                <span style={{ color: P.text, fontSize: 13, fontWeight: 700 }}>{price}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                <span style={{ color: P.muted, fontSize: 13 }}>{isAr ? "الضريبة" : "Tax"}</span>
                <span style={{ color: P.muted, fontSize: 13 }}>{isAr ? "شامل الضريبة" : "Included"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${P.border}`, paddingTop: 12, gap: 12 }}>
                <span style={{ color: P.text, fontWeight: 800, fontSize: 15 }}>{isAr ? "الإجمالي" : "Total"}</span>
                <span style={{ color: P.violetLight, fontWeight: 900, fontSize: 18 }}>{price}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, background: `${P.green}15`, border: `1px solid ${P.green}33`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: P.green, lineHeight: 1.5 }}>
              ✓ {isAr ? "دفعة واحدة — بدون اشتراك شهري" : "One-time payment — no subscription"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
