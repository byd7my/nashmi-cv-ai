import { useEffect, useRef, useState } from "react";
import { P, FF } from "@/nashmi/lib/tokens";
import { CVPreview } from "@/nashmi/components/CVPreview";
import type { CVData } from "@/nashmi/lib/ats";
import type { TrLang } from "@/nashmi/lib/translations";

const CV_WIDTH = 794;
const DEFAULT_CV_HEIGHT = 1100;

interface ExportPreviewModalProps {
  lang: TrLang;
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  isElite: boolean;
  userTier: string | null;
  primaryCv: CVData;
  primaryLang: "ar" | "en";
  secondaryCv: CVData | null;
  secondaryLang: "ar" | "en";
  loading: boolean;
  loadError: string | null;
}

function computePreviewScale(viewportWidth: number, isElite: boolean, stacked: boolean): number {
  const pad = 48;
  if (stacked || viewportWidth < 640) {
    return Math.min(0.92, Math.max(0.32, (viewportWidth - pad) / CV_WIDTH));
  }
  if (isElite) {
    const columnWidth = (viewportWidth - pad * 2) / 2 - 12;
    return Math.min(0.48, Math.max(0.34, columnWidth / CV_WIDTH));
  }
  return Math.min(0.58, Math.max(0.38, (viewportWidth - pad * 2) / CV_WIDTH));
}

function ScaledCvCard({
  cv,
  cvLanguage,
  userTier,
  uiLang,
  label,
  scale,
  maxPreviewHeight,
}: {
  cv: CVData;
  cvLanguage: "ar" | "en";
  userTier: string | null;
  uiLang: TrLang;
  label: string;
  scale: number;
  maxPreviewHeight: number;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(DEFAULT_CV_HEIGHT);
  const scaledW = Math.max(Math.round(CV_WIDTH * scale), 120);
  const scaledH = Math.max(Math.round(contentHeight * scale), 280);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.scrollHeight || DEFAULT_CV_HEIGHT);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cv, cvLanguage, scale]);

  return (
    <div className="export-preview-card">
      <div className="export-preview-card-label">{label}</div>
      <div
        className="export-preview-card-frame"
        style={{ maxHeight: maxPreviewHeight }}
      >
        <div
          className="export-preview-card-scaler"
          style={{ width: scaledW, height: Math.min(scaledH, maxPreviewHeight - 8) }}
        >
          <div
            ref={innerRef}
            style={{
              width: CV_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              background: "#fff",
              boxShadow: "0 2px 16px rgba(15,23,42,0.12)",
            }}
          >
            <CVPreview cv={cv} lang={uiLang} cvLanguage={cvLanguage} userTier={userTier} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExportPreviewModal({
  lang,
  open,
  onClose,
  onContinue,
  isElite,
  userTier,
  primaryCv,
  primaryLang,
  secondaryCv,
  secondaryLang,
  loading,
  loadError,
}: ExportPreviewModalProps) {
  const isAr = lang === "ar";
  const ff = FF;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  const stacked = isElite && viewportWidth < 760;
  const scale = computePreviewScale(viewportWidth, isElite, stacked);
  const maxPreviewHeight =
    viewportWidth < 640
      ? Math.min(viewportHeight * 0.38, 340)
      : Math.min(viewportHeight * 0.46, 460);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, loading]);

  if (!open) return null;

  const primaryLabel =
    primaryLang === "ar" ? (isAr ? "النسخة العربية" : "Arabic version") : isAr ? "النسخة الإنجليزية" : "English version";
  const secondaryLabel =
    secondaryLang === "ar" ? (isAr ? "النسخة العربية" : "Arabic version") : isAr ? "النسخة الإنجليزية" : "English version";

  const canContinue = !loading && (!isElite || Boolean(secondaryCv));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-preview-title"
      className="export-preview-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      style={{ direction: isAr ? "rtl" : "ltr" }}
    >
      <style>{`
        .export-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(10,10,11,0.92);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .export-preview-dialog {
          width: 100%;
          background: ${P.card};
          border: 1px solid ${P.border};
          border-radius: 20px;
          padding: 22px 18px 18px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.65);
          position: relative;
          margin: auto 0;
        }
        .export-preview-grid {
          display: grid;
          gap: 14px;
          margin-bottom: 18px;
        }
        .export-preview-grid--single {
          grid-template-columns: minmax(0, 1fr);
          justify-items: center;
        }
        .export-preview-grid--dual {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .export-preview-card {
          min-width: 0;
          width: 100%;
        }
        .export-preview-card-label {
          color: ${P.violetLight};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 8px;
          text-align: center;
        }
        .export-preview-card-frame {
          background: ${P.surface};
          border: 1px solid ${P.border};
          border-radius: 12px;
          padding: 8px;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        .export-preview-card-scaler {
          margin: 0 auto;
          overflow: hidden;
        }
        .export-preview-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        @media (max-width: 759px) {
          .export-preview-dialog {
            max-width: 100%;
            border-radius: 16px;
            padding: 20px 14px 14px;
          }
          .export-preview-grid--dual {
            grid-template-columns: minmax(0, 1fr);
          }
          .export-preview-actions {
            flex-direction: column-reverse;
          }
          .export-preview-actions button {
            width: 100%;
            justify-content: center;
          }
          #export-preview-title {
            font-size: 17px !important;
          }
        }
        @media (min-width: 760px) {
          .export-preview-dialog {
            max-width: ${isElite ? "920px" : "560px"};
            padding: 26px 26px 22px;
          }
        }
      `}</style>

      <div ref={dialogRef} className="export-preview-dialog" style={{ fontFamily: ff, maxHeight: "calc(100dvh - 24px)", overflowY: "auto" }}>
        <button
          onClick={onClose}
          disabled={loading}
          aria-label={isAr ? "إغلاق" : "Close"}
          style={{
            position: "absolute",
            top: 10,
            [isAr ? "left" : "right"]: 12,
            background: "transparent",
            border: "none",
            color: P.muted,
            fontSize: 22,
            cursor: loading ? "not-allowed" : "pointer",
            lineHeight: 1,
            opacity: loading ? 0.4 : 1,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          ×
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, paddingInlineEnd: 36 }}>
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
            👁
          </div>
          <h2 id="export-preview-title" style={{ color: P.text, fontSize: 19, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
            {isElite
              ? isAr
                ? "راجع النسختين قبل التصدير"
                : "Review both versions before export"
              : isAr
                ? "راجع سيرتك قبل التصدير"
                : "Review your resume before export"}
          </h2>
        </div>

        <p style={{ color: P.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          {isElite
            ? isAr
              ? "مرّر داخل كل نسخة للتأكد من المحتوى. بعد التصدير لا يمكن التعديل."
              : "Scroll inside each version to check the content. You cannot edit after export."
            : isAr
              ? "مرّر داخل المعاينة للتأكد. بعد التصدير لا يمكن التعديل."
              : "Scroll the preview to verify. You cannot edit after export."}
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: "24px 12px", color: P.violetLight, fontSize: 14, fontWeight: 700 }}>
            ⏳ {isAr ? "جاري تجهيز النسخة الثانية…" : "Preparing the second version…"}
          </div>
        )}

        {loadError && !loading && (
          <div
            style={{
              background: `${P.red}18`,
              border: `1px solid ${P.red}44`,
              borderRadius: 10,
              padding: "12px 14px",
              color: P.red,
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.6,
            }}
          >
            {loadError}
          </div>
        )}

        {!loading && (
          <div
            className={`export-preview-grid ${isElite && secondaryCv ? (stacked ? "export-preview-grid--single" : "export-preview-grid--dual") : "export-preview-grid--single"}`}
          >
            <ScaledCvCard
              cv={primaryCv}
              cvLanguage={primaryLang}
              userTier={userTier}
              uiLang={lang}
              label={primaryLabel}
              scale={scale}
              maxPreviewHeight={maxPreviewHeight}
            />
            {isElite && secondaryCv && (
              <ScaledCvCard
                cv={secondaryCv}
                cvLanguage={secondaryLang}
                userTier={userTier}
                uiLang={lang}
                label={secondaryLabel}
                scale={scale}
                maxPreviewHeight={maxPreviewHeight}
              />
            )}
          </div>
        )}

        <div className="export-preview-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "transparent",
              border: `1px solid ${P.borderLight}`,
              color: P.text,
              borderRadius: 10,
              padding: "12px 18px",
              minHeight: 44,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: ff,
              opacity: loading ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            {isAr ? "رجوع للتعديل" : "Back to editing"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            style={{
              background: canContinue ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : P.surface,
              border: canContinue ? "none" : `1px solid ${P.border}`,
              color: canContinue ? "#fff" : P.muted,
              borderRadius: 10,
              padding: "12px 22px",
              minHeight: 44,
              cursor: canContinue ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 800,
              fontFamily: ff,
              boxShadow: canContinue ? `0 6px 24px ${P.violet}44` : "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            {isElite
              ? isAr
                ? "راجعت النسختين — متابعة"
                : "I've reviewed both — continue"
              : isAr
                ? "راجعت السيرة — متابعة"
                : "I've reviewed — continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
