import { P, FF } from "@/nashmi/lib/tokens";
import type { TrLang } from "@/nashmi/lib/translations";

interface ExportLangWarningModalProps {
  lang: TrLang;
  open: boolean;
  missingLang: "ar" | "en";
  onClose: () => void;
  onViewOther: () => void;
  onContinue: () => void;
}

export function ExportLangWarningModal({
  lang,
  open,
  missingLang,
  onClose,
  onViewOther,
  onContinue,
}: ExportLangWarningModalProps) {
  const isAr = lang === "ar";
  const ff = FF;

  if (!open) return null;

  const missingLabel =
    missingLang === "ar"
      ? isAr
        ? "النسخة العربية"
        : "Arabic version"
      : isAr
        ? "النسخة الإنجليزية"
        : "English version";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-lang-warning-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10,10,11,0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
        direction: isAr ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: P.card,
          border: `1px solid ${P.border}`,
          borderRadius: 18,
          padding: "24px 22px 20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          fontFamily: ff,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
        <h2
          id="export-lang-warning-title"
          style={{ color: P.text, fontSize: 18, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.4 }}
        >
          {isAr ? "لم تعرض النسخة الثانية بعد" : "You haven't viewed the second version"}
        </h2>
        <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.75, marginBottom: 20 }}>
          {isAr
            ? `لم تفتح ${missingLabel} بعد. ننصحك بمراجعتها من أزرار النخبة في المعاينة قبل التصدير.`
            : `You haven't opened the ${missingLabel} yet. We recommend reviewing it using the Elite language buttons in the preview before exporting.`}
        </p>

        <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          <button
            type="button"
            onClick={onViewOther}
            style={{
              width: "100%",
              minHeight: 44,
              background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
              border: "none",
              color: "#fff",
              borderRadius: 10,
              padding: "12px 18px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 800,
              fontFamily: ff,
            }}
          >
            {isAr ? `عرض ${missingLabel}` : `View ${missingLabel}`}
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              width: "100%",
              minHeight: 44,
              background: "transparent",
              border: `1px solid ${P.borderLight}`,
              color: P.text,
              borderRadius: 10,
              padding: "12px 18px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: ff,
            }}
          >
            {isAr ? "متابعة التصدير على أي حال" : "Continue export anyway"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              minHeight: 40,
              background: "transparent",
              border: "none",
              color: P.muted,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: ff,
            }}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
