import { useState, useEffect, useRef } from "react";
import { P, FF } from "@/nashmi/lib/tokens";
import { addReview } from "@/nashmi/lib/reviews";
import type { TrLang } from "@/nashmi/lib/translations";

interface ExportConfirmModalProps {
  lang: TrLang;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  defaultName?: string;
}

export function ExportConfirmModal({
  lang,
  open,
  onClose,
  onConfirm,
  defaultName,
}: ExportConfirmModalProps) {
  const isAr = lang === "ar";
  const ff = FF;
  const [agreed, setAgreed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setAgreed(false);
      setRating(0);
      setHoverRating(0);
      setFeedback("");
      setSubmitted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const feedbackTrimmed = feedback.trim();
  const minFeedbackChars = 10;
  const canSubmit =
    agreed && rating >= 1 && rating <= 5 && feedbackTrimmed.length >= minFeedbackChars;

  const acknowledgement = isAr
    ? "أتعهد بأن جميع معلوماتي صحيحة وتمت مراجعتها، والموقع غير مسؤول عن أي أخطاء، ولا يحق لي التعديل عليها بعد التصدير"
    : "I confirm that all my information is correct and has been reviewed. The website is not responsible for any errors, and I cannot modify it after export.";

  async function handleSubmit() {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    await addReview({
      name: defaultName,
      rating,
      text: feedbackTrimmed,
    });
    onConfirm();
  }

  const ratingLabels = isAr
    ? ["", "سيء جداً", "مقبول", "جيد", "ممتاز", "رائع جداً"]
    : ["", "Very bad", "Okay", "Good", "Great", "Excellent"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
        direction: isAr ? "rtl" : "ltr",
        animation: "fadeUp 0.25s ease both",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .export-confirm-actions {
            flex-direction: column-reverse !important;
          }
          .export-confirm-actions button {
            width: 100%;
            min-height: 44px;
          }
        }
      `}</style>
      <div
        ref={dialogRef}
        style={{
          width: "100%",
          maxWidth: 560,
          background: P.card,
          border: `1px solid ${P.border}`,
          borderRadius: 20,
          padding: "26px 26px 22px",
          boxShadow: `0 32px 80px rgba(0,0,0,0.65)`,
          fontFamily: ff,
          position: "relative",
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          style={{
            position: "absolute",
            top: 12,
            [isAr ? "left" : "right"]: 14,
            background: "transparent",
            border: "none",
            color: P.muted,
            fontSize: 22,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            ⬇
          </div>
          <h2
            id="export-confirm-title"
            style={{ color: P.text, fontSize: 19, fontWeight: 800, lineHeight: 1.3 }}
          >
            {isAr ? "تأكيد التصدير وتقييم نشمي" : "Confirm Export & Rate Nashmi"}
          </h2>
        </div>

        <p style={{ color: P.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.7 }}>
          {isAr
            ? "قبل تصدير سيرتك الذاتية، نحتاج منك تأكيد المعلومات وتقييم تجربتك معنا."
            : "Before exporting your resume, please confirm your information and share a quick rating of your experience."}
        </p>

        {/* Acknowledgement checkbox */}
        <label
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "14px 14px",
            background: agreed ? `${P.violet}14` : P.surface,
            border: `1px solid ${agreed ? P.violet : P.border}`,
            borderRadius: 12,
            cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
            marginBottom: 18,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            style={{
              width: 18,
              height: 18,
              marginTop: 2,
              accentColor: P.violet,
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: P.text,
              fontSize: 13,
              lineHeight: 1.75,
              fontWeight: 500,
            }}
          >
            {acknowledgement}
            <span style={{ color: P.red, marginInlineStart: 4 }}>*</span>
          </span>
        </label>

        {/* Star rating */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              color: P.muted,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {isAr ? "تقييمك لخدمة نشمي" : "Rate Nashmi"}
            <span style={{ color: P.red, marginInlineStart: 4 }}>*</span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
            onMouseLeave={() => setHoverRating(0)}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} ${isAr ? "نجوم" : "stars"}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onFocus={() => setHoverRating(star)}
                    onBlur={() => setHoverRating(0)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      fontSize: 30,
                      lineHeight: 1,
                      color: active ? P.gold : `${P.muted}80`,
                      transition: "transform 0.12s, color 0.12s",
                      transform: active ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {active ? "★" : "☆"}
                  </button>
                );
              })}
            </div>
            <span
              style={{
                color: rating ? P.violetLight : P.muted,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {ratingLabels[hoverRating || rating] || (isAr ? "اختر تقييمك" : "Choose a rating")}
            </span>
          </div>
        </div>

        {/* Feedback textarea */}
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="nashmi-feedback"
            style={{
              display: "block",
              color: P.muted,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 6,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {isAr ? "رأيك في الخدمة" : "Your feedback"}
            <span style={{ color: P.red, marginInlineStart: 4 }}>*</span>
          </label>
          <textarea
            id="nashmi-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              isAr
                ? "شاركنا تجربتك مع نشمي بكلمات قصيرة..."
                : "Share your experience with Nashmi in a few words..."
            }
            required
            rows={4}
            minLength={minFeedbackChars}
            style={{
              width: "100%",
              background: P.surface,
              border: `1px solid ${P.border}`,
              borderRadius: 10,
              padding: "11px 12px",
              color: P.text,
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: ff,
              direction: isAr ? "rtl" : "ltr",
              lineHeight: 1.7,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = P.violet)}
            onBlur={(e) => (e.currentTarget.style.borderColor = P.border)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              color: feedbackTrimmed.length >= minFeedbackChars ? P.green : P.muted,
              fontSize: 11,
            }}
          >
            <span>
              {isAr
                ? `الحد الأدنى ${minFeedbackChars} حرفاً`
                : `Minimum ${minFeedbackChars} characters`}
            </span>
            <span>{feedbackTrimmed.length}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="export-confirm-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${P.borderLight}`,
              color: P.text,
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: ff,
            }}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitted}
            aria-disabled={!canSubmit || submitted}
            style={{
              background:
                canSubmit && !submitted
                  ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`
                  : P.surface,
              border: canSubmit && !submitted ? "none" : `1px solid ${P.border}`,
              color: canSubmit && !submitted ? "#fff" : P.muted,
              borderRadius: 10,
              padding: "10px 22px",
              cursor: canSubmit && !submitted ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 800,
              fontFamily: ff,
              boxShadow: canSubmit && !submitted ? `0 6px 24px ${P.violet}44` : "none",
              transition: "transform 0.15s, opacity 0.15s",
              opacity: submitted ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {submitted ? "⏳" : "⬇"}{" "}
            {submitted
              ? isAr
                ? "جارٍ التصدير..."
                : "Exporting..."
              : isAr
                ? "إرسال التقييم وتصدير"
                : "Submit & Export"}
          </button>
        </div>

        {!canSubmit && (
          <p style={{ color: P.muted, fontSize: 11, textAlign: "center", marginTop: 12 }}>
            {isAr
              ? "الرجاء إكمال جميع الحقول الإلزامية لتفعيل زر التصدير."
              : "Please complete all required fields to enable the export button."}
          </p>
        )}
      </div>
    </div>
  );
}
