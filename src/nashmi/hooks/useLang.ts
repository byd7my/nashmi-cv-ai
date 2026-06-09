import { useState, useEffect } from "react";

export type Lang = "ar" | "en";
export type CvLang = "ar" | "en" | "bi";

export function useLang() {
  const [lang, setLang] = useState<Lang>("ar");
  // Arabic is the default — no language picker required to enter the site.
  const [chosen, setChosen] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nashmi:lang");
      if (saved === "en") setLang("en");
      else if (saved === "ar" || saved === "bi") setLang("ar");
    } catch {}
  }, []);

  const choose = (next: CvLang) => {
    const resolved: Lang = next === "bi" ? "ar" : next;
    setLang(resolved);
    setChosen(true);
    try { window.localStorage.setItem("nashmi:lang", next); } catch {}
  };

  const toggle = () => {
    setLang(l => {
      const next: Lang = l === "ar" ? "en" : "ar";
      try { window.localStorage.setItem("nashmi:lang", next); } catch {}
      return next;
    });
  };

  return { lang, toggle, choose, chosen, isAr: lang === "ar" };
}
