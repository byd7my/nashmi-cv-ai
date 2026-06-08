import { useState, useEffect } from "react";
import { useLang, type CvLang } from "@/nashmi/hooks/useLang";
import { TR } from "@/nashmi/lib/translations";
import type { CVData } from "@/nashmi/lib/ats";

import { LandingPage } from "@/nashmi/pages/LandingPage";
import { BuilderPage } from "@/nashmi/pages/BuilderPage";
import { AuthPage } from "@/nashmi/pages/AuthPage";
import { TemplatesPage } from "@/nashmi/pages/TemplatesPage";
import { BlogPage } from "@/nashmi/pages/BlogPage";
import { CheckoutPage } from "@/nashmi/pages/CheckoutPage";
import { AdminPage } from "@/nashmi/pages/AdminPage";
import { LanguageModal } from "@/nashmi/components/LanguageModal";
import { CvLangModal } from "@/nashmi/components/CvLangModal";

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { overflow-x: hidden; scroll-behavior: smooth; }
  body {
    font-family: 'Thmanyah', 'Tajawal', system-ui, sans-serif;
    background: #0A0A0B;
    color: #F4F2FF;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  * { line-height: 1.6; overflow-wrap: break-word; }
  :lang(ar), [dir="rtl"], .ar-text { line-height: 1.75; padding-bottom: 0.05em; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; padding-bottom: 0.08em; overflow: visible; }
  input, textarea, button, select { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #111118; }
  ::-webkit-scrollbar-thumb { background: #2A2A3E; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #7C5CFF88; }
`;

type Page = "landing" | "builder" | "auth" | "templates" | "blog" | "checkout" | "admin";

export default function App() {
  const { lang, toggle, choose, chosen } = useLang();
  const t = TR[lang];

  const [page, setPage] = useState<Page>("landing");
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [initialCV, setInitialCV] = useState<CVData | null>(null);
  const [selectedCvLang, setSelectedCvLang] = useState<CvLang | null>(null);
  const [cvLangResolver, setCvLangResolver] = useState<((l: CvLang | null) => void) | null>(null);

  useEffect(() => {
    const id = "nashmi-global";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  function ensureCvLang(): Promise<CvLang | null> {
    if (selectedCvLang) return Promise.resolve(selectedCvLang);
    return new Promise(resolve => setCvLangResolver(() => resolve));
  }

  function pickCvLang(l: CvLang) {
    setSelectedCvLang(l);
    if (cvLangResolver) { cvLangResolver(l); setCvLangResolver(null); }
  }

  function closeCvLangModal() {
    if (cvLangResolver) { cvLangResolver(null); setCvLangResolver(null); }
  }

  async function navTo(dest: string, cv?: CVData) {
    if (dest === "builder") {
      if (!selectedCvLang) {
        const picked = await ensureCvLang();
        if (!picked) return;
      }
      if (cv) setInitialCV(cv);
    }
    setPage(dest as Page);
  }

  function selectPlan(plan: string) {
    setSelectedPlan(plan);
    setPage("checkout");
  }

  const shared = {
    lang, t, onNav: navTo, onLangToggle: toggle, page,
    onSelectPlan: selectPlan,
  };

  if (!chosen) {
    return <LanguageModal onChoose={choose}/>;
  }

  let pageNode: React.ReactNode;
  switch (page) {
    case "builder":
      pageNode = (
        <BuilderPage
          lang={lang} t={t} onNav={navTo}
          initialCV={initialCV}
          cvLang={selectedCvLang}
          onSelectPlan={selectPlan}
          currentPlan={currentPlan}
          setCurrentPlan={setCurrentPlan}
        />
      );
      break;
    case "auth":
      pageNode = <AuthPage lang={lang} t={t} onNav={navTo} onLangToggle={toggle} page={page}/>;
      break;
    case "templates":
      pageNode = <TemplatesPage {...shared}/>;
      break;
    case "blog":
      pageNode = <BlogPage {...shared}/>;
      break;
    case "checkout":
      pageNode = (
        <CheckoutPage lang={lang} t={t} onNav={navTo} plan={selectedPlan} onPaid={setCurrentPlan}/>
      );
      break;
    case "admin":
      pageNode = <AdminPage lang={lang} t={t} onNav={navTo}/>;
      break;
    default:
      pageNode = <LandingPage {...shared}/>;
  }

  return (
    <>
      {pageNode}
      {cvLangResolver && (
        <CvLangModal lang={lang} onPick={pickCvLang} onClose={closeCvLangModal}/>
      )}
    </>
  );
}
