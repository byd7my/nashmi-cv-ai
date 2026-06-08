import { P, FF } from "@/nashmi/lib/tokens";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface PageShellProps {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  onLangToggle: () => void;
  page: string;
  children: React.ReactNode;
}

export function PageShell({ lang, t, onNav, onLangToggle, page, children }: PageShellProps) {
  const isAr = lang === "ar";
  return (
    <div style={{ background:P.bg, minHeight:"100vh", fontFamily: isAr ? FF : "'DM Sans', system-ui, sans-serif", color:P.text }}>
      <Navbar lang={lang} t={t} onNav={onNav} page={page} onLangToggle={onLangToggle}/>
      {children}
      <Footer lang={lang} t={t} onNav={onNav}/>
    </div>
  );
}
