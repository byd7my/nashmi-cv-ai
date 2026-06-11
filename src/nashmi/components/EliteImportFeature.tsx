import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CVData } from "@/nashmi/lib/ats";
import { cvMatchesLanguage, translateCv } from "@/nashmi/lib/cv-translate";
import type { CvLang } from "@/nashmi/hooks/useLang";

type EliteLang = Exclude<CvLang, "bi">;

export const ELITE_CV_KEYS: Record<EliteLang, string> = {
  ar: "nashmi-cv-draft-ar",
  en: "nashmi-cv-draft-en",
};

interface Props {
  userSubscriptionTier: string | null;
  uiLang: "ar" | "en";
  currentResumeData: CVData;
  updateResumeData: (cv: CVData, lang: EliteLang) => void;
  activeLang: EliteLang;
}

const P = {
  card: "#1a1625",
  cardHover: "#211c2e",
  border: "rgba(124,92,255,0.30)",
  active: "#5b5fc7",
  activeRing: "rgba(167,139,250,0.55)",
  inactive: "#2a2438",
  inactiveHover: "#322c42",
  text: "#F4F2FF",
  muted: "#cfc9e6",
};

export function EliteImportFeature({
  userSubscriptionTier,
  uiLang,
  currentResumeData,
  updateResumeData,
  activeLang,
}: Props) {
  const isAr = uiLang === "ar";
  const isElite = userSubscriptionTier === "elite" || userSubscriptionTier === "enterprise";
  const [busy, setBusy] = useState<EliteLang | null>(null);

  // Auto-save current draft under its language key on every change
  useEffect(() => {
    if (!isElite || !currentResumeData) return;
    try {
      window.localStorage.setItem(
        ELITE_CV_KEYS[activeLang],
        JSON.stringify(currentResumeData),
      );
    } catch { /* ignore */ }
  }, [currentResumeData, activeLang, isElite]);

  async function handleSwitch(target: EliteLang) {
    if (target === activeLang || busy) return;

    // 1. snapshot current language before leaving
    try {
      window.localStorage.setItem(
        ELITE_CV_KEYS[activeLang],
        JSON.stringify(currentResumeData),
      );
    } catch { /* ignore */ }

    // 2. look up saved target version
    let saved: CVData | null = null;
    try {
      const raw = window.localStorage.getItem(ELITE_CV_KEYS[target]);
      if (raw) saved = JSON.parse(raw) as CVData;
    } catch { /* ignore */ }

    if (saved && cvMatchesLanguage(saved, target)) {
      updateResumeData(saved, target);
      toast.success(
        isAr
          ? `تم استيراد النسخة ${target === "ar" ? "العربية" : "الإنجليزية"}`
          : `Imported ${target === "ar" ? "Arabic" : "English"} version`,
      );
      return;
    }

    // 3. translate from current draft (or re-translate stale/wrong-language cache)
    setBusy(target);
    const tid = toast.loading(
      isAr
        ? `جاري ترجمة السيرة إلى ${target === "ar" ? "العربية" : "الإنجليزية"}...`
        : `Translating resume to ${target === "ar" ? "Arabic" : "English"}...`,
    );
    const translated = await translateCv(currentResumeData, target);
    toast.dismiss(tid);
    setBusy(null);

    if (translated) {
      try {
        window.localStorage.setItem(ELITE_CV_KEYS[target], JSON.stringify(translated));
      } catch { /* ignore */ }
      updateResumeData(translated, target);
      toast.success(
        isAr ? "تمت الترجمة بنجاح" : "Translated successfully",
      );
    } else {
      toast.error(
        isAr
          ? "تعذّرت الترجمة التلقائية. تحقق من اتصال OpenAI وحاول مرة أخرى."
          : "Auto-translate failed. Check your OpenAI connection and try again.",
      );
    }
  }

  if (!isElite) return null;

  const btn = (lang: EliteLang, labelAr: string, labelEn: string, flag: string) => {
    const active = activeLang === lang;
    const loading = busy === lang;
    return (
      <button
        type="button"
        onClick={() => handleSwitch(lang)}
        disabled={!!busy}
        style={{
          flex: "1 1 180px",
          padding: "11px 18px",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          cursor: busy ? "wait" : "pointer",
          transition: "all 0.2s",
          background: active ? P.active : P.inactive,
          color: active ? "#fff" : P.muted,
          border: "none",
          outline: active ? `2px solid ${P.activeRing}` : "none",
          opacity: loading ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onMouseEnter={(e) => {
          if (!active && !busy) e.currentTarget.style.background = P.inactiveHover;
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = P.inactive;
        }}
      >
        <span>{isAr ? labelAr : labelEn}</span>
        <span>{flag}</span>
      </button>
    );
  };

  return (
    <div style={{ width: "100%", marginBottom: 18 }} dir={isAr ? "rtl" : "ltr"}>
      <div
        style={{
          background: P.card,
          border: `1px solid ${P.border}`,
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 8px 28px rgba(124,92,255,0.18)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⭐️</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, margin: 0 }}>
            {isAr ? "ميزات باقة النخبة الخاصة بك" : "Your Elite plan features"}
          </h3>
        </div>
        <div style={{ display: "flex", gap: 10, flex: "1 1 320px", justifyContent: "flex-end" }}>
          {btn("en", "النسخة الإنجليزية US", "English version US", "🇺🇸")}
          {btn("ar", "النسخة العربية SA", "Arabic version SA", "🇸🇦")}
        </div>
      </div>
    </div>
  );
}

export default EliteImportFeature;
