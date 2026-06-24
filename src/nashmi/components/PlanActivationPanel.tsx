import { useState } from "react";
import { P, FF } from "@/nashmi/lib/tokens";
import { activatePlanWithCode } from "@/nashmi/lib/activate-plan";
import { preserveDraftForCheckout } from "@/nashmi/lib/client-data-wipe";
import { track } from "@/nashmi/lib/analytics";

type PlanTier = "premium" | "elite";

interface Props {
  plan: PlanTier;
  sallaUrl: string;
  ctaLabel: string;
  isAr: boolean;
  highlight?: boolean;
  compact?: boolean;
  contactEmail?: string | null;
  onActivated: (plan: string) => void;
  onBeforeSalla?: () => void;
}

export function PlanActivationPanel({
  plan,
  sallaUrl,
  ctaLabel,
  isAr,
  highlight = false,
  compact = false,
  contactEmail,
  onActivated,
  onBeforeSalla,
}: Props) {
  const ff = FF;
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const labels = isAr
    ? {
        haveCode: "لدي كود تفعيل",
        placeholder: "أدخل كود التفعيل",
        activate: "تفعيل",
        hideCode: "إخفاء",
        success: "تم التفعيل بنجاح! يمكنك الآن استخدام مميزات باقتك.",
        buyHint: "اشترِ من متجر سلة واحصل على الكود",
      }
    : {
        haveCode: "I have an activation code",
        placeholder: "Enter activation code",
        activate: "Activate",
        hideCode: "Hide",
        success: "Activated! Your plan features are now unlocked.",
        buyHint: "Buy on Salla store to receive your code",
      };

  async function handleActivate() {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError("");
    track("activation_code_attempt", { plan });

    const result = await activatePlanWithCode(code, plan, contactEmail);
    setLoading(false);

    if (!result.ok) {
      setError(isAr ? result.messageAr : result.messageEn);
      track("activation_code_failed", { plan });
      return;
    }

    setSuccess(true);
    track("activation_code_used", { plan });
    onActivated(result.plan);
  }

  function openSalla() {
    onBeforeSalla?.();
    preserveDraftForCheckout();
    track("salla_store_opened", { plan });
    window.open(sallaUrl, "_blank", "noopener,noreferrer");
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: P.surface,
    border: `1px solid ${error ? P.red : P.border}`,
    borderRadius: 10,
    padding: compact ? "9px 11px" : "10px 12px",
    color: P.text,
    fontSize: 16,
    outline: "none",
    fontFamily: ff,
    direction: "ltr",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10 }}>
      <button
        type="button"
        onClick={openSalla}
        style={{
          width: "100%",
          borderRadius: 12,
          padding: compact ? "11px 14px" : "12px 18px",
          cursor: "pointer",
          fontSize: compact ? 14 : 15,
          fontWeight: 800,
          fontFamily: ff,
          background: highlight ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : "transparent",
          border: highlight ? "none" : `1px solid ${P.borderLight}`,
          color: highlight ? "#fff" : P.text,
          boxShadow: highlight ? `0 6px 24px ${P.violet}44` : "none",
          transition: "opacity 0.2s, transform 0.2s",
        }}
      >
        {ctaLabel}
      </button>

      {!compact && (
        <p style={{ color: P.muted, fontSize: 11, textAlign: "center", margin: 0, lineHeight: 1.5 }}>
          {labels.buyHint}
        </p>
      )}

      {success ? (
        <div
          style={{
            background: `${P.green}18`,
            border: `1px solid ${P.green}44`,
            borderRadius: 10,
            padding: "10px 12px",
            color: P.green,
            fontSize: 12,
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          ✓ {labels.success}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setShowCode(s => !s);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: P.violetLight,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: ff,
              padding: "2px 0",
              textAlign: "center",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {showCode ? labels.hideCode : labels.haveCode}
          </button>

          {showCode && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <input
                  type="text"
                  value={code}
                  onChange={e => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") void handleActivate();
                  }}
                  placeholder={labels.placeholder}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => void handleActivate()}
                  disabled={loading || !code.trim()}
                  style={{
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
                    border: "none",
                    color: "#fff",
                    borderRadius: 10,
                    padding: compact ? "9px 14px" : "10px 16px",
                    cursor: loading || !code.trim() ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    fontSize: 13,
                    fontFamily: ff,
                    opacity: loading || !code.trim() ? 0.65 : 1,
                    minWidth: compact ? 72 : 80,
                  }}
                >
                  {loading ? "…" : labels.activate}
                </button>
              </div>
              {error && (
                <p style={{ color: P.red, fontSize: 12, margin: 0, lineHeight: 1.5, textAlign: "center" }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
