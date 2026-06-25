import { useState, useEffect, useCallback } from "react";
import { useLang, type CvLang } from "@/nashmi/hooks/useLang";
import { TR } from "@/nashmi/lib/translations";
import type { CVData } from "@/nashmi/lib/ats";
import { getSessionPlanTier, setSessionPlanTier } from "@/nashmi/lib/plan-session";

import { LandingPage } from "@/nashmi/pages/LandingPage";
import { BuilderPage } from "@/nashmi/pages/BuilderPage";
import { AuthPage } from "@/nashmi/pages/AuthPage";
import { BlogPage } from "@/nashmi/pages/BlogPage";
import { AdminPage } from "@/nashmi/pages/AdminPage";
import { LanguageModal } from "@/nashmi/components/LanguageModal";
import { CvLangModal } from "@/nashmi/components/CvLangModal";
import { parseBlogSlugFromHash } from "@/nashmi/lib/blog";
import { applyHtmlLang, applySiteMeta } from "@/nashmi/lib/site-meta";

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

type Page = "landing" | "builder" | "auth" | "blog" | "admin";

const PUBLIC_PAGES = new Set<string>(["landing", "builder", "blog"]);

function hashToPage(): Page {
  if (typeof window === "undefined") return "landing";
  const first = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  if (!first || first === "landing" || first === "auth" || first === "admin") return "landing";
  if (first === "blog") return "blog";
  if (first === "checkout") return "landing";
  return PUBLIC_PAGES.has(first) ? (first as Page) : "landing";
}

function pageToHash(page: Page): string {
  return page === "landing" ? "" : `#/${page}`;
}

export default function App() {
  const { lang, toggle, choose, chosen } = useLang();
  const t = TR[lang];

  const [page, setPage] = useState<Page>(() => hashToPage());
  const [blogSlug, setBlogSlug] = useState<string | null>(() => parseBlogSlugFromHash());
  const [currentPlan, setCurrentPlan] = useState<string | null>(() => {
    const stored = getSessionPlanTier();
    return stored !== "starter" ? stored : null;
  });
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
    applyHtmlLang(lang);
  }, [lang]);

  useEffect(() => {
    if (page !== "landing") return;
    applySiteMeta(t.siteTitle, t.siteDescription);
  }, [lang, page, t.siteTitle, t.siteDescription]);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
    if (raw === "blog" || raw.startsWith("blog/")) {
      const slug = raw.split("/")[1];
      window.location.replace(slug ? `/blog/${slug}` : "/blog");
    }
    if (raw === "checkout") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      setPage(hashToPage());
      setBlogSlug(parseBlogSlugFromHash());
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, blogSlug]);

  const syncHash = useCallback((dest: Page) => {
    const next = pageToHash(dest);
    const current = window.location.hash;
    if (next !== current) {
      if (next) window.location.hash = next;
      else window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

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
    const next = PUBLIC_PAGES.has(dest) ? (dest as Page) : "landing";
    if (next === "builder") {
      if (!selectedCvLang) {
        const picked = await ensureCvLang();
        if (!picked) return;
      }
      setInitialCV(cv ?? null);
    }
    if (next === "blog") {
      window.location.href = "/blog";
      return;
    }
    setPage(next);
    syncHash(next);
  }

  function openBlogPost(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return;
    window.location.href = `/blog/${normalized}`;
  }

  function openBlogList() {
    window.location.href = "/blog";
  }

  function handlePlanActivated(tier: string) {
    if (tier !== "premium" && tier !== "elite" && tier !== "enterprise") return;
    setSessionPlanTier(tier);
    setCurrentPlan(tier);
  }

  const shared = {
    lang, t, onNav: navTo, onLangToggle: toggle, page,
    onPlanActivated: handlePlanActivated,
    onOpenBlogPost: openBlogPost,
    onOpenBlogList: openBlogList,
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
          onPlanActivated={handlePlanActivated}
          currentPlan={currentPlan}
          setCurrentPlan={setCurrentPlan}
        />
      );
      break;
    case "auth":
      pageNode = <AuthPage lang={lang} t={t} onNav={navTo} onLangToggle={toggle} page={page}/>;
      break;
    case "blog":
      pageNode = <BlogPage {...shared} blogSlug={blogSlug} />;
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
