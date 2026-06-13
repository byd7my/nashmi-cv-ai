import { useEffect, useState, type CSSProperties } from "react";
import { P, FF } from "@/nashmi/lib/tokens";

export const MOBILE_TOUR_STORAGE_KEY = "nashmi:mobile-builder-tour-v6";

export type MobileTourTarget = "cv-preview" | "tab-sections" | "tab-copilot" | "tab-export";

export type MobileTourStep = {
  target: MobileTourTarget;
  tab?: "preview" | "sections" | "copilot" | "export";
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export const MOBILE_TOUR_STEPS: MobileTourStep[] = [
  {
    target: "cv-preview",
    tab: "preview",
    titleAr: "اضغط للتعديل",
    titleEn: "Tap to edit",
    bodyAr: "اضغط أي قسم في السيرة",
    bodyEn: "Tap any section on the CV",
  },
  {
    target: "tab-sections",
    tab: "sections",
    titleAr: "الأقسام",
    titleEn: "Sections",
    bodyAr: "اختر القسم للتعديل",
    bodyEn: "Pick a section to edit",
  },
  {
    target: "tab-copilot",
    tab: "copilot",
    titleAr: "المساعد الذكي",
    titleEn: "AI Assistant",
    bodyAr: "حسّن سيرتك بالذكاء الاصطناعي",
    bodyEn: "Improve with AI",
  },
  {
    target: "tab-export",
    tab: "export",
    titleAr: "التصدير",
    titleEn: "Export",
    bodyAr: "صدّر PDF متوافق ATS",
    bodyEn: "Export ATS PDF",
  },
];

function tourSelector(target: MobileTourTarget): string {
  return `[data-tour="${target}"]`;
}

/** Step 0 highlights a CV section inside the scaled A4 paper, not the outer stage. */
function resolveTourTargetElement(target: MobileTourTarget): Element | null {
  if (target === "cv-preview") {
    return (
      document.querySelector('[data-cv-section="summary"]') ??
      document.querySelector(tourSelector(target))
    );
  }
  return document.querySelector(tourSelector(target));
}

interface Props {
  step: number;
  isAr: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  /** Re-measure highlights when preview scale/layout changes (e.g. mobile A4 transform). */
  layoutKey?: number;
}

export function MobileBuilderTutorial({ step, isAr, onNext, onPrev, onClose, layoutKey }: Props) {
  const current = MOBILE_TOUR_STEPS[step];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ff = FF;
  const total = MOBILE_TOUR_STEPS.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const isNavTarget = current.target.startsWith("tab-");

  useEffect(() => {
    const update = () => {
      const el = resolveTourTargetElement(current.target);
      setRect(el?.getBoundingClientRect() ?? null);
    };
    update();
    const t = window.setTimeout(update, 120);
    const t2 = window.setTimeout(update, 320);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const el = resolveTourTargetElement(current.target);
    const ro = el ? new ResizeObserver(update) : null;
    if (el && ro) ro.observe(el);
    const paper = document.querySelector(".cv-preview-paper-inner");
    const paperRo = paper ? new ResizeObserver(update) : null;
    if (paper && paperRo) paperRo.observe(paper);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro?.disconnect();
      paperRo?.disconnect();
    };
  }, [current.target, step, layoutKey]);

  const pad = isNavTarget ? 4 : 6;
  const hole = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const cardStyle: CSSProperties = {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(268px, calc(100vw - 32px))",
    bottom: "calc(78px + env(safe-area-inset-bottom))",
    zIndex: 5601,
  };

  return (
    <div
      className="mobile-builder-tour"
      style={{ position: "fixed", inset: 0, zIndex: 5600, fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? current.titleAr : current.titleEn}
    >
      {hole && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              borderRadius: isNavTarget ? 10 : 8,
              boxShadow: "0 0 0 9999px rgba(10,10,11,0.82)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              borderRadius: isNavTarget ? 10 : 8,
              border: `1.5px solid ${P.violet}`,
              boxShadow: `0 0 0 2px ${P.violet}33`,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <div
        style={{
          ...cardStyle,
          background: P.card,
          border: `1px solid ${P.border}`,
          borderRadius: 12,
          padding: "8px 10px",
          boxShadow: "0 10px 32px rgba(0,0,0,0.45)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          style={{
            position: "absolute",
            top: 4,
            [isAr ? "left" : "right"]: 6,
            background: "none",
            border: "none",
            color: P.muted,
            fontSize: 16,
            lineHeight: 1,
            cursor: "pointer",
            padding: 2,
          }}
        >
          ×
        </button>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4, paddingInlineEnd: 18 }}>
          <span style={{ color: P.text, fontSize: 12, fontWeight: 800 }}>
            {isAr ? current.titleAr : current.titleEn}
          </span>
          <span style={{ color: P.muted, fontSize: 10, fontWeight: 600 }}>
            {step + 1}/{total}
          </span>
        </div>
        <p style={{ color: P.muted, fontSize: 10, lineHeight: 1.45, margin: "0 0 8px" }}>
          {isAr ? current.bodyAr : current.bodyEn}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              style={{
                background: "transparent",
                border: `1px solid ${P.borderLight}`,
                color: P.textSub,
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: ff,
              }}
            >
              {isAr ? "السابق" : "Back"}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            style={{
              background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
              border: "none",
              color: "#fff",
              borderRadius: 7,
              padding: "5px 12px",
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: ff,
            }}
          >
            {isLast ? (isAr ? "تم" : "Done") : (isAr ? "التالي" : "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
