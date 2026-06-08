import { useState, useEffect } from "react";

export type Lang = "ar" | "en";
export type CvLang = "ar" | "en" | "bi";

export function useLang() {
  const [lang, setLang] = useState<Lang>("ar");
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nashmi:lang");
      if (saved === "ar" || saved === "en" || saved === "bi") {
        setLang(saved === "bi" ? "ar" : (saved as Lang));
        setChosen(true);
      }
    } catch {}
  }, []);

  const choose = (next: CvLang) => {
    const resolved: Lang = next === "bi" ? "ar" : next;
    setLang(resolved);
    setChosen(true);
    try { window.localStorage.setItem("nashmi:lang", next); } catch {}
  };

  const toggle = () => setLang(l => (l === "ar" ? "en" : "ar"));

  return { lang, toggle, choose, chosen, isAr: lang === "ar" };
}
