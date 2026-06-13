import { useEffect, useState, type CSSProperties } from "react";
import { P, FF } from "@/nashmi/lib/tokens";

export const MOBILE_TOUR_STORAGE_KEY = "nashmi:mobile-builder-tour-v3";

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
    bodyAr: "اضغط على أي قسم في سيرتك الذاتية لتعديله مباشرة",
    bodyEn: "Tap any section on your resume to edit it directly",
  },
  {
    target: "tab-sections",
    tab: "sections",
    titleAr: "الأقسام",
    titleEn: "Sections",
    bodyAr: "تصفّح قائمة الأقسام واختر ما تريد تعديله بسرعة",
    bodyEn: "Browse the section list and pick what you want to edit",
  },
  {
    target: "tab-copilot",
    tab: "copilot",
    titleAr: "المساعد الذكي",
    titleEn: "AI Assistant",
    bodyAr: "عدّل وحسّن سيرتك الذاتية بالذكاء الاصطناعي",
    bodyEn: "Improve and refine your resume with AI",
  },
  {
    target: "tab-export",
    tab: "export",
    titleAr: "التصدير",
    titleEn: "Export",
    bodyAr: "صدّر سيرتك PDF متوافق مع ATS بعد اختيار الباقة المناسبة",
    bodyEn: "Export an ATS-ready PDF after choosing a paid plan",
  },
];

function tourSelector(target: MobileTourTarget): string {
  return `[data-tour="${target}"]`;
}

interface Props {
  step: number;
  isAr: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function MobileBuilderTutorial({ step, isAr, onNext, onPrev, onClose }: Props) {
  const current = MOBILE_TOUR_STEPS[step];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ff = FF;
  const total = MOBILE_TOUR_STEPS.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const isNavTarget = current.target.startsWith("tab-");

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(tourSelector(current.target));
      setRect(el?.getBoundingClientRect() ?? null);
    };
    update();
    const t = window.setTimeout(update, 120);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const el = document.querySelector(tourSelector(current.target));
    const ro = el ? new ResizeObserver(update) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro?.disconnect();
    };
  }, [current.target, step]);

  const pad = isNavTarget ? 6 : 10;
  const hole = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const cardStyle: CSSProperties = isNavTarget
    ? {
        position: "fixed",
        left: 16,
        right: 16,
        bottom: "calc(76px + env(safe-area-inset-bottom))",
        zIndex: 5601,
      }
    : {
        position: "fixed",
        left: 16,
        right: 16,
        top: hole ? Math.min(hole.top + hole.height + 14, window.innerHeight * 0.42) : "28%",
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
              borderRadius: isNavTarget ? 14 : 10,
              boxShadow: "0 0 0 9999px rgba(10,10,11,0.88)",
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
              borderRadius: isNavTarget ? 14 : 10,
              border: `2px solid ${P.violet}`,
              boxShadow: `0 0 0 4px ${P.violet}33, 0 0 24px ${P.violet}44`,
              pointerEvents: "none",
            }}
          />
          {current.target === "cv-preview" && (
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                top: hole.top + hole.height * 0.28,
                left: hole.left + hole.width * 0.42,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: 34, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }}>👆</span>
              <span
                style={{
                  background: "rgba(255,255,255,0.96)",
                  color: "#111",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 12px",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  maxWidth: 180,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {isAr ? "انقر على أي قسم للتعديل" : "Tap any section to edit"}
              </span>
            </div>
          )}
        </>
      )}

      <div
        style={{
          ...cardStyle,
          background: P.card,
          border: `1px solid ${P.border}`,
          borderRadius: 18,
          padding: "18px 16px 14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: 900,
              color: "#fff",
              flexShrink: 0,
              boxShadow: `0 4px 14px ${P.violet}44`,
            }}
          >
            N
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: P.text, fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
              {isAr ? "مرحباً بك في نشمي" : "Welcome to Nashmi"}
            </div>
            <div style={{ color: P.muted, fontSize: 11, marginTop: 2 }}>
              {isAr ? "جولة سريعة — 4 خطوات" : "Quick tour — 4 steps"}
            </div>
          </div>
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 5, flexShrink: 0 }}>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === step ? 18 : 7,
                  height: 7,
                  borderRadius: 999,
                  background: i === step ? P.violetLight : `${P.violet}33`,
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          style={{
            position: "absolute",
            top: 12,
            [isAr ? "left" : "right"]: 12,
            background: "none",
            border: "none",
            color: P.muted,
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ×
        </button>

        <h3 style={{ color: P.text, fontSize: 17, fontWeight: 800, margin: "0 0 8px", paddingInlineEnd: 28 }}>
          {isAr ? current.titleAr : current.titleEn}
        </h3>
        <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.75, margin: "0 0 16px" }}>
          {isAr ? current.bodyAr : current.bodyEn}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ color: P.muted, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
            {isAr ? `${step + 1} من ${total}` : `${step + 1} of ${total}`}
          </span>
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: isAr ? "flex-start" : "flex-end" }}>
            {!isFirst && (
              <button
                type="button"
                onClick={onPrev}
                style={{
                  background: "transparent",
                  border: `1px solid ${P.borderLight}`,
                  color: P.textSub,
                  borderRadius: 10,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: ff,
                }}
              >
                {isAr ? "السابق" : "Previous"}
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              style={{
                background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
                border: "none",
                color: "#fff",
                borderRadius: 10,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: ff,
                boxShadow: `0 4px 16px ${P.violet}44`,
              }}
            >
              {isLast ? (isAr ? "تم" : "Done") : (isAr ? "التالي" : "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
