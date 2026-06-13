import { CV_TEMPLATES, type CvTemplateId } from "@/nashmi/lib/cv-templates";
import { P, FF } from "@/nashmi/lib/tokens";

const STRIP_CSS = `
  .tpl-strip {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding: 10px 12px 8px;
    background: ${P.surface};
    border-bottom: 1px solid ${P.border};
    flex-shrink: 0;
  }
  .tpl-strip-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .tpl-strip-label {
    font-size: 11px;
    font-weight: 800;
    color: ${P.muted};
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }
  .tpl-strip-hint {
    font-size: 10px;
    font-weight: 700;
    color: ${P.green};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .tpl-strip-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    padding: 2px 0 4px;
  }
  .tpl-strip-scroll::-webkit-scrollbar { display: none; }
  .tpl-chip {
    flex: 0 0 auto;
    scroll-snap-align: start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 13px;
    border-radius: 999px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .tpl-chip:active { transform: scale(0.96); }
  .tpl-chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

interface Props {
  isAr: boolean;
  value: CvTemplateId;
  onChange: (id: CvTemplateId) => void;
  variant?: "desktop" | "mobile";
}

export function TemplatePicker({ isAr, value, onChange, variant = "desktop" }: Props) {
  const ff = FF;

  if (variant === "mobile") {
    return (
      <>
        <style>{STRIP_CSS}</style>
        <div className="tpl-strip" role="group" aria-label={isAr ? "اختيار القالب" : "Choose template"}>
          <div className="tpl-strip-head">
            <span className="tpl-strip-label">{isAr ? "القالب" : "Template"}</span>
            <span className="tpl-strip-hint">
              {isAr ? "PDF ATS موحّد" : "Same ATS PDF"}
            </span>
          </div>
          <div className="tpl-strip-scroll">
            {CV_TEMPLATES.map((tpl) => {
              const active = value === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  className="tpl-chip"
                  aria-pressed={active}
                  onClick={() => onChange(tpl.id)}
                  style={{
                    background: active ? `${tpl.accent}22` : P.card,
                    border: `1px solid ${active ? tpl.accent : P.border}`,
                    color: active ? P.text : P.muted,
                  }}
                >
                  <span className="tpl-chip-dot" style={{ background: tpl.accent }} />
                  {isAr ? tpl.name.ar : tpl.name.en}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 794, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ color: P.muted, fontSize: 12, fontWeight: 700, marginInlineEnd: 4 }}>
        {isAr ? "القالب:" : "Template:"}
      </span>
      {CV_TEMPLATES.map((tpl) => {
        const active = value === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            title={isAr ? "كل القوالب تُصدَّر PDF ATS بنفس التنسيق الآمن" : "All templates export the same ATS-safe PDF layout"}
            style={{
              background: active ? `${tpl.accent}22` : P.surface,
              border: `1px solid ${active ? tpl.accent : P.border}`,
              color: active ? P.text : P.muted,
              borderRadius: 999,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: ff,
            }}
          >
            {isAr ? tpl.name.ar : tpl.name.en}
          </button>
        );
      })}
      <span style={{ color: P.green, fontSize: 11, fontWeight: 700 }}>
        ✓ {isAr ? "PDF ATS واحد لكل القوالب" : "Same ATS PDF for all"}
      </span>
    </div>
  );
}
