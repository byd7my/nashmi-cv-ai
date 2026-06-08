import { useState, useEffect, memo, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { P, FF } from "@/nashmi/lib/tokens";
import { CVPreview } from "@/nashmi/components/CVPreview";
import { ATSRing } from "@/nashmi/components/ATSRing";
import { calcATS, calcATSMatch, type CVData } from "@/nashmi/lib/ats";
import { INIT_CV, LANG_LEVELS, LANGUAGE_OPTIONS, DEGREE_LEVELS, HONORS_OPTIONS, extractTextFromFile, localParseCV, normalizeParsedCV, smartCategorize } from "@/nashmi/lib/cv-parser";
import { track } from "@/nashmi/lib/analytics";
import type { TrLang, Translation } from "@/nashmi/lib/translations";
import type { CvLang } from "@/nashmi/hooks/useLang";
import { EliteImportFeature, ELITE_CV_KEYS } from "@/nashmi/components/EliteImportFeature";

const FF2 = FF;

// ── Hoisted atoms (module scope — prevents remount on keystroke) ───────────
const Inp = memo(function Inp({ label, value, onChange, placeholder, type = "text", isAr = false }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; isAr?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, fontFamily: FF2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FF2, direction: isAr ? "rtl" : "ltr", transition: "border-color 0.2s" }}
        onFocus={e => (e.currentTarget.style.borderColor = P.violet)}
        onBlur={e => (e.currentTarget.style.borderColor = P.border)}
      />
    </div>
  );
});

const Txta = memo(function Txta({ label, value, onChange, placeholder, rows = 4, isAr = false }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; isAr?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, fontFamily: FF2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
      <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: FF2, direction: isAr ? "rtl" : "ltr", transition: "border-color 0.2s" }}
        onFocus={e => (e.currentTarget.style.borderColor = P.violet)}
        onBlur={e => (e.currentTarget.style.borderColor = P.border)}
      />
    </div>
  );
});

// ── AI call (hits /api/improve) ────────────────────────────────────────────
async function callAI(task: string, text: string, lang: string, extra?: Record<string, unknown>) {
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const res = await fetch(`${BASE}/api/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, text, language: lang, ...extra }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  return res.json() as Promise<{ text?: string; json?: unknown }>;
}

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  initialCV?: CVData | null;
  cvLang?: CvLang | null;
  onSelectPlan: (plan: string) => void;
  currentPlan: string | null;
  setCurrentPlan: (plan: string) => void;
}

type Section = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function BuilderPage({ lang, t, onNav, initialCV, cvLang, onSelectPlan, currentPlan, setCurrentPlan }: Props) {
  const isAr = lang === "ar";
  const isCvAr = (cvLang || lang) === "ar";   // language of the resume content
  const aiLang = cvLang || lang;
  const ff = FF;
  const userTier = currentPlan || "starter";
  const canExport = userTier === "premium" || userTier === "elite" || userTier === "enterprise";

  // Persist CV across navigation (checkout round-trip, refresh)
  const CV_STORAGE_KEY = "nashmi-cv-draft";
  const STARTMODE_STORAGE_KEY = "nashmi-cv-startmode";

  function loadStoredCV(): CVData | null {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(CV_STORAGE_KEY) : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as CVData) : null;
    } catch { return null; }
  }

  const [startMode, setStartMode] = useState<"choose" | "ready">(() => {
    if (initialCV) return "ready";
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(STARTMODE_STORAGE_KEY) === "ready") return "ready";
    } catch { /* ignore */ }
    return "choose";
  });

  const [cv, setCv] = useState<CVData>(() => {
    if (initialCV) return { ...INIT_CV, ...initialCV };
    const stored = loadStoredCV();
    return stored ? { ...INIT_CV, ...stored } : { ...INIT_CV };
  });
  const [activeSection, setActiveSection] = useState<Section>(0);
  const [showPreview, setShowPreview] = useState(true);
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotMsg, setCopilotMsg] = useState("");
  const [copilotHistory, setCopilotHistory] = useState([
    { role: "assistant", content: isAr ? "مرحباً! أنا مساعدك الذكي. كيف يمكنني تحسين سيرتك؟" : "Hi! I'm your AI copilot. How can I improve your resume?" },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const hasElitePackage = userTier === "elite" || userTier === "enterprise";
  const hasPremiumPackage = userTier === "premium";
  const isPaid = hasElitePackage || hasPremiumPackage;
  const [exportingPdf, setExportingPdf] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const cvPreviewRef = useRef<HTMLDivElement>(null);
  const hiddenCvPreviewRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active CV language (controlled locally so Elite users can swap AR/EN live)
  const initialActiveCvLang: "ar" | "en" =
    cvLang === "ar" || cvLang === "en" ? cvLang : (lang === "ar" ? "ar" : "en");
  const [activeCvLang, setActiveCvLang] = useState<"ar" | "en">(initialActiveCvLang);
  useEffect(() => {
    if (cvLang === "ar" || cvLang === "en") setActiveCvLang(cvLang);
  }, [cvLang]);

  const isElite = userTier === "elite" || userTier === "enterprise";
  const otherLang: "ar" | "en" = activeCvLang === "ar" ? "en" : "ar";
  const [otherLangCv, setOtherLangCv] = useState<CVData | null>(null);
  // Refresh "other language" snapshot whenever current CV / lang changes
  useEffect(() => {
    if (!isElite) { setOtherLangCv(null); return; }
    try {
      const raw = window.localStorage.getItem(ELITE_CV_KEYS[otherLang]);
      setOtherLangCv(raw ? (JSON.parse(raw) as CVData) : null);
    } catch { setOtherLangCv(null); }
  }, [isElite, otherLang, cv, activeCvLang]);

  const [showATSMatch, setShowATSMatch] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [atsMatch, setAtsMatch] = useState<{ score: number; matched: string[]; missing: string[] } | null>(null);

  const [beforeAfter, setBeforeAfter] = useState<{ section: string; before: string; after: string } | null>(null);

  useEffect(() => {
    if (initialCV) setCv({ ...INIT_CV, ...initialCV });
  }, [initialCV]);

  // Auto-save CV draft so it survives navigation (e.g. paying then returning)
  useEffect(() => {
    try { window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(cv)); } catch { /* ignore */ }
    // Elite: also persist a per-language snapshot so users can swap between AR/EN
    try {
      window.localStorage.setItem(ELITE_CV_KEYS[activeCvLang], JSON.stringify(cv));
    } catch { /* ignore */ }
  }, [cv, activeCvLang]);
  useEffect(() => {
    try { window.localStorage.setItem(STARTMODE_STORAGE_KEY, startMode); } catch { /* ignore */ }
  }, [startMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotHistory]);

  const atsScore = calcATS(cv);

  // ── setters ────────────────────────────────────────────────────────────
  const setPersonal = useCallback(<K extends keyof CVData["personal"]>(key: K, val: string) => {
    setCv(prev => ({ ...prev, personal: { ...prev.personal, [key]: val } }));
  }, []);

  const setSummary = useCallback((val: string) => setCv(prev => ({ ...prev, summary: val })), []);

  const setExp = useCallback((i: number, key: keyof CVData["experience"][0], val: string) => {
    setCv(prev => {
      const exp = [...prev.experience];
      exp[i] = { ...exp[i], [key]: val };
      return { ...prev, experience: exp };
    });
  }, []);

  const setEdu = useCallback((i: number, key: keyof CVData["education"][0], val: string | boolean) => {
    setCv(prev => {
      const edu = [...prev.education];
      edu[i] = { ...edu[i], [key]: val };
      return { ...prev, education: edu };
    });
  }, []);

  const setLangEntry = useCallback((i: number, key: keyof CVData["languages"][0], val: string) => {
    setCv(prev => {
      const langs = [...prev.languages];
      langs[i] = { ...langs[i], [key]: val };
      return { ...prev, languages: langs };
    });
  }, []);

  // ── AI improve section ─────────────────────────────────────────────────
  async function aiImprove(section: string, text: string) {
    if (!text.trim()) return;
    setAiLoading(section);
    track("ai_improvement_used", { section });
    const before = text;
    try {
      const data = await callAI(`improve_${section}`, text, aiLang);
      const after = (data.text || "").trim();
      if (after) {
        setBeforeAfter({ section, before, after });
      }
    } catch (err) {
      alert(isAr ? "حدث خطأ في AI. تأكد من إعداد OPENAI_API_KEY." : "AI error. Make sure OPENAI_API_KEY is configured.");
    } finally {
      setAiLoading(null);
    }
  }

  // ── AI import ──────────────────────────────────────────────────────────
  async function handleImport(file: File) {
    setImporting(true); setImportError("");
    track("pdf_imported");
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error("Could not extract text from file");

      // Try AI parsing first, fall back to local parser
      let parsed: CVData;
      try {
        const data = await callAI("parse_cv", text, aiLang);
        if (data.json) {
          parsed = normalizeParsedCV(data.json);
        } else {
          parsed = normalizeParsedCV(localParseCV(text));
        }
      } catch {
        parsed = normalizeParsedCV(localParseCV(text));
      }

      parsed = smartCategorize(parsed);
      setCv({ ...INIT_CV, ...parsed });
      setActiveSection(0);
      setStartMode("ready");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportError(isAr ? `فشل الاستيراد: ${msg}` : `Import failed: ${msg}`);
    } finally {
      setImporting(false);
    }
  }

  // ── AI copilot ─────────────────────────────────────────────────────────
  async function sendCopilot(msg?: string) {
    const message = (msg || copilotMsg).trim();
    if (!message) return;
    setCopilotMsg("");
    setCopilotHistory(h => [...h, { role: "user", content: message }]);
    setIsTyping(true);
    track("ai_copilot_used");
    try {
      const data = await callAI("copilot", message, aiLang, { cv, history: copilotHistory.slice(-8) });
      const reply = (data.text || "").trim() || (isAr ? "عذراً، لم أتمكن من المعالجة." : "Sorry, could not process that.");
      setCopilotHistory(h => [...h, { role: "assistant", content: reply }]);
    } catch {
      setCopilotHistory(h => [...h, { role: "assistant", content: isAr ? "⚠️ خطأ في الاتصال. تأكد من OPENAI_API_KEY." : "⚠️ Connection error. Check OPENAI_API_KEY." }]);
    } finally {
      setIsTyping(false);
    }
  }

  // ── Toast helper ──────────────────────────────────────────────────────
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── JSON Export ────────────────────────────────────────────────────────
  function exportJSON() {
    track("json_exported");
    const payload = { _nashmi: true, version: 1, exportedAt: new Date().toISOString(), cv };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nashmi-resume-${cv.personal.name ? cv.personal.name.replace(/\s+/g, "-").toLowerCase() : "draft"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(isAr ? "✓ تم حفظ السيرة بصيغة JSON" : "✓ Resume saved as JSON");
  }

  // ── JSON Import ────────────────────────────────────────────────────────
  function importJSON(file: File) {
    track("json_imported");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        if (!raw) throw new Error("Empty file");
        const parsed = JSON.parse(raw);

        // Accept either { _nashmi: true, cv: {...} } wrapper or a raw CVData object
        const data: CVData = parsed._nashmi && parsed.cv ? parsed.cv : parsed;

        // Basic structure validation
        if (typeof data !== "object" || data === null) throw new Error("Not a valid resume object");
        if (!data.personal && !data.summary && !data.experience) {
          throw new Error("Does not look like a Nashmi resume file");
        }

        setCv({ ...INIT_CV, ...data });
        setActiveSection(0);
        setStartMode("ready");
        showToast(isAr ? "✓ تم تحميل السيرة بنجاح" : "✓ Resume loaded successfully");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(
          isAr ? `✕ الملف غير صالح: ${msg}` : `✕ Invalid file: ${msg}`,
          "error"
        );
      }
    };
    reader.onerror = () => showToast(isAr ? "✕ فشل قراءة الملف" : "✕ Failed to read file", "error");
    reader.readAsText(file);
  }

  async function renderElementToPdfBlob(el: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (doc) => {
        const style = doc.createElement("style");
        style.textContent = `
          :root, html, body {
            --background:#ffffff; --foreground:#0a0a0b;
            --card:#ffffff; --card-foreground:#0a0a0b;
            --popover:#ffffff; --popover-foreground:#0a0a0b;
            --primary:#5b5fc7; --primary-foreground:#ffffff;
            --secondary:#f4f4f5; --secondary-foreground:#0a0a0b;
            --muted:#f4f4f5; --muted-foreground:#71717a;
            --accent:#f4f4f5; --accent-foreground:#0a0a0b;
            --destructive:#ef4444; --destructive-foreground:#ffffff;
            --border:#e4e4e7; --input:#e4e4e7; --ring:#5b5fc7;
            --sidebar:#ffffff; --sidebar-foreground:#0a0a0b;
            --sidebar-primary:#5b5fc7; --sidebar-primary-foreground:#ffffff;
            --sidebar-accent:#f4f4f5; --sidebar-accent-foreground:#0a0a0b;
            --sidebar-border:#e4e4e7; --sidebar-ring:#5b5fc7;
            color:#0a0a0b !important; background:#ffffff !important;
          }
          /* إصلاح تفكك الحروف العربية في html2canvas */
          * {
            letter-spacing: 0 !important;
            word-spacing: normal !important;
            font-feature-settings: "liga", "calt", "rlig" !important;
            text-rendering: optimizeLegibility !important;
          }
        `;
        doc.head.appendChild(style);

        // استهداف الحاوية المستنسخة وفرض RTL + خط عربي مدعوم
        const targetId = el.id;
        const clonedPreview = targetId
          ? doc.getElementById(targetId)
          : (doc.body.querySelector('[data-pdf-root]') as HTMLElement | null);
        if (clonedPreview) {
          clonedPreview.setAttribute("dir", "rtl");
          clonedPreview.style.direction = "rtl";
          clonedPreview.style.fontFamily =
            "'Cairo', 'Tajawal', 'Noto Naskh Arabic', 'Amiri', sans-serif";
          clonedPreview.querySelectorAll<HTMLElement>("*").forEach((node) => {
            node.style.letterSpacing = "0px";
            node.style.wordSpacing = "normal";
            if (node.style.direction === "ltr") {
              node.style.direction = "rtl";
            }
          });
        }
      },
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.97);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    const pageH = pdf.internal.pageSize.getHeight();
    let y = 0;
    while (y < pdfH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -y, pdfW, pdfH);
      y += pageH;
    }
    return pdf.output("blob");
  }

  function downloadBlob(blob: Blob, fileName: string) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { /* ignore */ }
  }

  // ── PDF Export (client-side) ────────────────────────────────────────────
  async function exportPDF() {
    if (!canExport) { setShowUpgrade(true); return; }
    if (!cvPreviewRef.current) return;
    setExportingPdf(true);
    track("pdf_exported");
    try {
      const baseName = cv.personal.name ? cv.personal.name.replace(/\s+/g, "-").toLowerCase() : "resume";

      // 1. visible preview (current language)
      const visibleBlob = await renderElementToPdfBlob(cvPreviewRef.current);
      downloadBlob(visibleBlob, `nashmi-${baseName}-${activeCvLang}.pdf`);

      // 2. Elite: also export the hidden other-language preview
      if (isElite && hiddenCvPreviewRef.current && otherLangCv) {
        await new Promise(r => setTimeout(r, 800));
        const hiddenBlob = await renderElementToPdfBlob(hiddenCvPreviewRef.current);
        downloadBlob(hiddenBlob, `nashmi-${baseName}-${otherLang}.pdf`);
        showToast(isAr ? "✓ تم تصدير النسختين العربية والإنجليزية" : "✓ Exported both Arabic and English versions");
      } else {
        showToast(isAr ? "✓ تم تصدير PDF بنجاح" : "✓ PDF exported successfully");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(isAr ? `✕ فشل تصدير PDF: ${msg}` : `✕ PDF export failed: ${msg}`, "error");
    } finally {
      setExportingPdf(false);
    }
  }

  // ── ATS Match Score ────────────────────────────────────────────────────
  function runATSMatch() {
    if (!jobDesc.trim()) return;
    const result = calcATSMatch(cv, jobDesc);
    setAtsMatch(result);
    track("ats_match_score_computed", { score: result.score });
  }

  const SECTIONS = t.builderNav;

  // ── UI helpers ─────────────────────────────────────────────────────────
  const AIBtn = ({ section, text, full = false }: { section: string; text: string; full?: boolean }) => (
    <button
      onClick={() => aiImprove(section, text)}
      disabled={!!aiLoading}
      style={{ background: aiLoading === section ? `${P.violet}44` : `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: full ? "9px 16px" : "6px 12px", cursor: aiLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, display: "flex", alignItems: "center", gap: 6, width: full ? "100%" : "auto", justifyContent: "center", transition: "background 0.2s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.background = `${P.violet}38`; }}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = aiLoading === section ? `${P.violet}44` : `${P.violet}22`}
    >
      {aiLoading === section ? "⏳" : "✦"} {aiLoading === section ? (isAr ? "جارٍ..." : "Working...") : (isAr ? "تحسين AI" : "AI Improve")}
    </button>
  );

  // ── Form panel ──────────────────────────────────────────────────────────
  const renderFormSection = () => {
    switch (activeSection) {
      case 0: return (
        <div>
          <Inp label={isAr ? "الاسم الكامل" : "Full Name"} value={cv.personal.name} onChange={v => setPersonal("name", v)} placeholder={isAr ? "اسمك الكامل" : "Your full name"} isAr={isAr}/>
          <Inp label={isAr ? "المسمى الوظيفي" : "Job Title"} value={cv.personal.title} onChange={v => setPersonal("title", v)} placeholder={isAr ? "مثال: مهندس برمجيات أول" : "e.g. Senior Software Engineer"} isAr={isAr}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Inp label={isAr ? "البريد الإلكتروني" : "Email"} type="email" value={cv.personal.email} onChange={v => setPersonal("email", v)} placeholder="you@email.com"/>
            <Inp label={isAr ? "الهاتف" : "Phone"} type="tel" value={cv.personal.phone} onChange={v => setPersonal("phone", v)} placeholder="+966 5X XXX XXXX"/>
          </div>
          <Inp label={isAr ? "المدينة" : "City"} value={cv.personal.city} onChange={v => setPersonal("city", v)} placeholder={isAr ? "الرياض، السعودية" : "Riyadh, Saudi Arabia"} isAr={isAr}/>
          <Inp label="LinkedIn" value={cv.personal.linkedin} onChange={v => setPersonal("linkedin", v)} placeholder="linkedin.com/in/username"/>
          <Inp label={isAr ? "الموقع الشخصي" : "Website"} value={cv.personal.website} onChange={v => setPersonal("website", v)} placeholder="yoursite.com"/>
        </div>
      );
      case 1: return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ color: P.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "الملخص المهني" : "Professional Summary"}</label>
            <AIBtn section="summary" text={cv.summary}/>
          </div>
          <Txta value={cv.summary} onChange={setSummary} rows={6} placeholder={isAr ? "صف نفسك بإيجاز: خبرتك، مهاراتك الرئيسية، وما تسعى إليه..." : "Briefly describe yourself: your experience, core skills, and what you bring to the table..."} isAr={isAr}/>
          <div style={{ color: P.muted, fontSize: 12, marginTop: 4 }}>
            {cv.summary.split(/\s+/).filter(Boolean).length}/80 {isAr ? "كلمة" : "words"} — {cv.summary.length < 80 ? (isAr ? "اكتب المزيد للحصول على درجة ATS أعلى" : "Write more for a higher ATS score") : "✓ Good length"}
          </div>
        </div>
      );
      case 2: return (
        <div>
          {cv.experience.map((e, i) => (
            <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: P.violetLight, fontSize: 12, fontWeight: 700 }}>{isAr ? `الخبرة ${i + 1}` : `Experience ${i + 1}`}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <AIBtn section={`exp-${i}`} text={e.desc}/>
                  {cv.experience.length > 1 && (
                    <button onClick={() => setCv(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }))} style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, color: P.red, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>
                      {t.removeItem}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label={isAr ? "المسمى الوظيفي" : "Job Title"} value={e.role} onChange={v => setExp(i, "role", v)} placeholder={isAr ? "مدير مشاريع" : "Project Manager"} isAr={isAr}/>
                <Inp label={isAr ? "الشركة" : "Company"} value={e.company} onChange={v => setExp(i, "company", v)} placeholder={isAr ? "اسم الشركة" : "Company Name"} isAr={isAr}/>
                <Inp label={isAr ? "من" : "From"} value={e.from} onChange={v => setExp(i, "from", v)} placeholder={isAr ? "يناير 2020" : "Jan 2020"}/>
                <Inp label={isAr ? "إلى" : "To"} value={e.to} onChange={v => setExp(i, "to", v)} placeholder={isAr ? "الآن" : "Present"}/>
              </div>
              <Txta label={isAr ? "المهام والإنجازات" : "Responsibilities & Achievements"} value={e.desc} onChange={v => setExp(i, "desc", v)} rows={4} placeholder={isAr ? "• قدت فريقاً من 5 مطورين وأنجزت المشروع قبل الموعد بشهر\n• خفضت وقت التحميل بنسبة 40%" : "• Led a team of 5 engineers, delivered project 1 month early\n• Reduced load time by 40%, improving user retention"} isAr={isAr}/>
            </div>
          ))}
          <button onClick={() => setCv(prev => ({ ...prev, experience: [...prev.experience, { company:"", role:"", from:"", to:"", desc:"" }] }))} style={{ width: "100%", background: "transparent", border: `1px dashed ${P.border}`, color: P.muted, borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 13, fontFamily: ff, transition: "border-color 0.2s, color 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.violet; (e.currentTarget as HTMLButtonElement).style.color=P.violetLight; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.border; (e.currentTarget as HTMLButtonElement).style.color=P.muted; }}
          >{t.addItem} {isAr ? "خبرة" : "Experience"}</button>
        </div>
      );
      case 3: return (
        <div>
          {cv.education.map((e, i) => (
            <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: P.violetLight, fontSize: 12, fontWeight: 700 }}>{isAr ? `التعليم ${i + 1}` : `Education ${i + 1}`}</span>
                {cv.education.length > 1 && (
                  <button onClick={() => setCv(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }))} style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, color: P.red, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>{t.removeItem}</button>
                )}
              </div>
              <Inp label={isAr ? "الجامعة / المؤسسة" : "University / Institution"} value={e.school} onChange={v => setEdu(i, "school", v)} placeholder={isAr ? "جامعة الملك سعود" : "King Saud University"} isAr={isAr}/>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "الدرجة العلمية" : "Degree"}</label>
                <select value={e.degree} onChange={ev => setEdu(i, "degree", ev.target.value)} style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.text, fontSize: 13, outline: "none", fontFamily: ff }}>
                  <option value="">{isAr ? "اختر الدرجة العلمية" : "Select degree"}</option>
                  {DEGREE_LEVELS.map(d => <option key={d.en} value={isCvAr ? d.ar : d.en}>{isCvAr ? d.ar : d.en}</option>)}
                </select>
              </div>
              <Inp label={isAr ? "التخصص" : "Field of Study"} value={e.field} onChange={v => setEdu(i, "field", v)} placeholder={isAr ? "علوم الحاسب" : "Computer Science"} isAr={isAr}/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label={isAr ? "من" : "From"} value={e.from} onChange={v => setEdu(i, "from", v)} placeholder="2018"/>
                <Inp label={isAr ? "إلى" : "To"} value={e.to} onChange={v => setEdu(i, "to", v)} placeholder="2022"/>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <input type="checkbox" id={`gpa-${i}`} checked={!!e.showGpa} onChange={ev => setEdu(i, "showGpa", ev.target.checked)} style={{ accentColor: P.violet }}/>
                <label htmlFor={`gpa-${i}`} style={{ color: P.muted, fontSize: 13, cursor: "pointer" }}>{isAr ? "إظهار المعدل (GPA)" : "Show GPA"}</label>
              </div>
              {e.showGpa && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Inp label="GPA" value={e.gpa} onChange={v => setEdu(i, "gpa", v)} placeholder="4.5"/>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "من" : "Out of"}</label>
                    <select value={e.gpaScale} onChange={ev => setEdu(i, "gpaScale", ev.target.value)} style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.text, fontSize: 13, outline: "none", fontFamily: ff }}>
                      {["4","5","100"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {/* Optional honors */}
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {isAr ? "التقدير / مرتبة الشرف (اختياري)" : "Honors / Grade (optional)"}
                </label>
                <select value={e.honors || ""} onChange={ev => setEdu(i, "honors", ev.target.value)} style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: e.honors ? P.text : P.muted, fontSize: 13, outline: "none", fontFamily: ff }}>
                  <option value="">{isAr ? "— بدون تقدير —" : "— No honors —"}</option>
                  {HONORS_OPTIONS.map(h => <option key={h.en} value={isCvAr ? h.ar : h.en}>{isCvAr ? h.ar : h.en}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button onClick={() => setCv(prev => ({ ...prev, education: [...prev.education, { school:"", degree:"", field:"", from:"", to:"", gpa:"", gpaScale:"5", honors:"", showGpa:false }] }))} style={{ width: "100%", background: "transparent", border: `1px dashed ${P.border}`, color: P.muted, borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 13, fontFamily: ff }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.violet; (e.currentTarget as HTMLButtonElement).style.color=P.violetLight; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.border; (e.currentTarget as HTMLButtonElement).style.color=P.muted; }}
          >{t.addItem} {isAr ? "تعليم" : "Education"}</button>
        </div>
      );
      case 4: return (
        <div>
          {cv.certifications.map((c, i) => (
            <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: P.violetLight, fontSize: 12, fontWeight: 700 }}>{isAr ? `شهادة ${i + 1}` : `Cert ${i + 1}`}</span>
                <button onClick={() => setCv(prev => ({ ...prev, certifications: prev.certifications.filter((_, idx) => idx !== i) }))} style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, color: P.red, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 10 }}>{t.removeItem}</button>
              </div>
              <Inp label={isAr ? "عنوان الشهادة" : "Certificate Title"} value={c.title} onChange={v => { const certs = [...cv.certifications]; certs[i] = { ...certs[i], title: v }; setCv(prev => ({ ...prev, certifications: certs })); }} placeholder={isAr ? "مثال: AWS Solutions Architect" : "e.g. AWS Solutions Architect"} isAr={isAr}/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label={isAr ? "الجهة المانحة" : "Issuer"} value={c.issuer} onChange={v => { const certs = [...cv.certifications]; certs[i] = { ...certs[i], issuer: v }; setCv(prev => ({ ...prev, certifications: certs })); }} placeholder="Amazon Web Services" isAr={isAr}/>
                <Inp label={isAr ? "التاريخ" : "Date"} value={c.date} onChange={v => { const certs = [...cv.certifications]; certs[i] = { ...certs[i], date: v }; setCv(prev => ({ ...prev, certifications: certs })); }} placeholder="2024"/>
              </div>
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <Inp label={isAr ? "إضافة شهادة أو دورة" : "Add Certificate / Course"} value={certInput} onChange={setCertInput} placeholder={isAr ? "اكتب عنوان الشهادة..." : "Enter certificate title..."} isAr={isAr}/>
            <button onClick={() => { if (!certInput.trim()) return; setCv(prev => ({ ...prev, certifications: [...prev.certifications, { title: certInput.trim(), issuer: "", date: "" }] })); setCertInput(""); }} style={{ width: "100%", background: `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {t.addItem}
            </button>
          </div>
        </div>
      );
      case 5: return (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {cv.skills.map((skill, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: "5px 10px", fontSize: 13 }}>
                {skill}
                <button onClick={() => setCv(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && skillInput.trim()) { setCv(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] })); setSkillInput(""); e.preventDefault(); } }} placeholder={isAr ? "مثال: React, Python, إدارة المشاريع…" : "e.g. React, Python, Project Management…"} style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.text, fontSize: 13, outline: "none", fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}
              onFocus={e => e.currentTarget.style.borderColor = P.violet}
              onBlur={e => e.currentTarget.style.borderColor = P.border}
            />
            <button onClick={() => { if (skillInput.trim()) { setCv(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] })); setSkillInput(""); } }} style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {t.addItem}
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <p style={{ color: P.muted, fontSize: 12, marginBottom: 8 }}>{isAr ? "مقترحات:" : "Suggestions:"}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(isAr ? ["React", "Python", "SQL", "Node.js", "إدارة المشاريع", "Excel", "تحليل البيانات", "التواصل الفعال"] : ["React", "Python", "SQL", "Node.js", "Project Management", "Excel", "Data Analysis", "Communication"]).filter(s => !cv.skills.includes(s)).slice(0, 8).map(s => (
                <button key={s} onClick={() => setCv(prev => ({ ...prev, skills: [...prev.skills, s] }))} style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, transition: "border-color 0.2s, color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.violet; (e.currentTarget as HTMLButtonElement).style.color=P.violetLight; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.border; (e.currentTarget as HTMLButtonElement).style.color=P.muted; }}
                >+ {s}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <AIBtn section="skills" text={cv.skills.join(", ")} full/>
          </div>
        </div>
      );
      case 6: return (
        <div>
          {cv.languages.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                {i === 0 && <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "اللغة" : "Language"}</label>}
                <select value={l.lang} onChange={ev => setLangEntry(i, "lang", ev.target.value)} style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: l.lang ? P.text : P.muted, fontSize: 13, outline: "none", fontFamily: ff, marginBottom: 14 }}>
                  <option value="">{isAr ? "— اختر اللغة —" : "— Select language —"}</option>
                  {LANGUAGE_OPTIONS.map(lo => <option key={lo.en} value={isCvAr ? lo.ar : lo.en}>{isCvAr ? lo.ar : lo.en}</option>)}
                </select>
              </div>
              <div style={{ width: 140 }}>
                {i === 0 && <label style={{ display: "block", color: P.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "المستوى" : "Level"}</label>}
                <select value={l.level} onChange={ev => setLangEntry(i, "level", ev.target.value)} style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 10px", color: P.text, fontSize: 13, outline: "none", fontFamily: ff, marginBottom: 14 }}>
                  <option value="">{isAr ? "اختر" : "Select"}</option>
                  {LANG_LEVELS.map(lv => <option key={lv.en} value={isCvAr ? lv.ar : lv.en}>{isCvAr ? lv.ar : lv.en}</option>)}
                </select>
              </div>
              {cv.languages.length > 1 && (
                <button onClick={() => setCv(prev => ({ ...prev, languages: prev.languages.filter((_, idx) => idx !== i) }))} style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, color: P.red, borderRadius: 6, padding: "10px", cursor: "pointer", fontSize: 13, marginBottom: 14 }}>×</button>
              )}
            </div>
          ))}
          <button onClick={() => setCv(prev => ({ ...prev, languages: [...prev.languages, { lang: "", level: "" }] }))} style={{ width: "100%", background: "transparent", border: `1px dashed ${P.border}`, color: P.muted, borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 13, fontFamily: ff }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.violet; (e.currentTarget as HTMLButtonElement).style.color=P.violetLight; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.border; (e.currentTarget as HTMLButtonElement).style.color=P.muted; }}
          >{t.addItem} {isAr ? "لغة" : "Language"}</button>
        </div>
      );
    }
  };

  // ── Start-choice screen (before builder) ──────────────────────────────
  if (startMode === "choose") {
    return (
      <div style={{ minHeight: "100vh", background: P.bg, direction: isAr ? "rtl" : "ltr", fontFamily: ff, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* hidden inputs so refs work */}
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}/>
        <input ref={jsonImportRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ""; }}/>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", boxShadow: `0 6px 24px ${P.violet}44` }}>N</div>
          <span style={{ color: P.text, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>{t.brand}</span>
        </div>

        <h1 style={{ color: P.text, fontSize: 28, fontWeight: 900, marginBottom: 10, textAlign: "center", letterSpacing: "-0.02em" }}>
          {isAr ? "كيف تريد البدء؟" : "How would you like to start?"}
        </h1>
        <p style={{ color: P.muted, fontSize: 14, marginBottom: 40, textAlign: "center" }}>
          {isAr ? "ابدأ سيرة جديدة من الصفر، أو استورد سيرتك الحالية" : "Start fresh or import your existing resume"}
        </p>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 560, width: "100%" }}>
          {/* New Resume */}
          <button
            onClick={() => setStartMode("ready")}
            style={{ flex: 1, minWidth: 200, background: `linear-gradient(135deg, ${P.violet}33, ${P.violetLight}22)`, border: `1.5px solid ${P.violet}55`, borderRadius: 18, padding: "32px 24px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", boxShadow: `0 4px 20px ${P.violet}22` }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = P.violet; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${P.violet}44`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${P.violet}55`; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${P.violet}22`; }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
            <div style={{ color: P.text, fontWeight: 800, fontSize: 17, marginBottom: 6, fontFamily: ff }}>
              {isAr ? "سيرة جديدة" : "New Resume"}
            </div>
            <div style={{ color: P.muted, fontSize: 13, lineHeight: 1.5 }}>
              {isAr ? "ابدأ من الصفر مع نماذج ذكية" : "Start from scratch with smart templates"}
            </div>
          </button>

          {/* Import PDF / DOCX */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{ flex: 1, minWidth: 200, background: P.surface, border: `1.5px solid ${P.border}`, borderRadius: 18, padding: "32px 24px", cursor: importing ? "not-allowed" : "pointer", textAlign: "center", transition: "all 0.2s", opacity: importing ? 0.7 : 1 }}
            onMouseEnter={e => { if (!importing) { (e.currentTarget as HTMLButtonElement).style.borderColor = P.violetLight; (e.currentTarget as HTMLButtonElement).style.background = P.card; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = P.border; (e.currentTarget as HTMLButtonElement).style.background = P.surface; }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{importing ? "⏳" : "📄"}</div>
            <div style={{ color: P.text, fontWeight: 800, fontSize: 17, marginBottom: 6, fontFamily: ff }}>
              {importing ? (isAr ? "جارٍ التحليل…" : "Analysing…") : (isAr ? "استيراد PDF / DOCX" : "Import PDF / DOCX")}
            </div>
            <div style={{ color: P.muted, fontSize: 13, lineHeight: 1.5 }}>
              {isAr ? "حلّل سيرتك الحالية بالذكاء الاصطناعي وأدخلها تلقائياً" : "AI parses your existing resume and auto-fills the form"}
            </div>
          </button>

          {/* JSON import removed */}
        </div>

        {importError && (
          <div style={{ marginTop: 24, background: `${P.red}1A`, border: `1px solid ${P.red}33`, borderRadius: 10, padding: "12px 20px", color: P.red, fontSize: 13, maxWidth: 480, textAlign: "center" }}>
            {importError}
          </div>
        )}

        <button onClick={() => onNav("landing")} style={{ marginTop: 36, background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 13, fontFamily: ff }}>
          {isAr ? "→ العودة للرئيسية" : "← Back to home"}
        </button>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.type === "error" ? `${P.red}EE` : `${P.violet}EE`, color: "#fff", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, fontFamily: ff, boxShadow: "0 8px 32px rgba(0,0,0,0.45)", whiteSpace: "nowrap" }}>
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: P.bg, direction: isAr ? "rtl" : "ltr", fontFamily: ff, display: "flex", flexDirection: "column" }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ height: 60, background: P.surface, borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 14, flexShrink: 0 }}>
        <button onClick={() => onNav("landing")} style={{ background: "none", border: `1px solid ${P.border}`, color: P.muted, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: ff, whiteSpace: "nowrap" }}>
          {isAr ? "→ الرئيسية" : "← Home"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: isAr ? 0 : "auto", marginRight: isAr ? "auto" : 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>N</div>
          <span style={{ color: P.text, fontWeight: 700, fontSize: 15 }}>{t.brand}</span>
        </div>

        <div style={{ flex: 1 }}/>

        {/* ATS score pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "6px 12px" }}>
          <span style={{ color: P.muted, fontSize: 12, whiteSpace: "nowrap" }}>{t.atsScore}</span>
          <span style={{ color: atsScore >= 80 ? P.green : atsScore >= 60 ? P.gold : P.red, fontWeight: 800, fontSize: 14 }}>{atsScore}%</span>
        </div>

        {/* ATS Match */}
        <button onClick={() => setShowATSMatch(true)} style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, whiteSpace: "nowrap" }}>
          {isAr ? "◈ مطابقة JD" : "◈ JD Match"}
        </button>

        {/* AI Import (PDF/DOCX/TXT → AI parse) */}
        <button onClick={() => fileRef.current?.click()} disabled={importing} title={isAr ? "استيراد ملف PDF/DOCX وتحليله بالذكاء الاصطناعي" : "Import PDF/DOCX and parse with AI"} style={{ background: P.card, border: `1px solid ${P.border}`, color: P.muted, borderRadius: 8, padding: "7px 11px", cursor: importing ? "not-allowed" : "pointer", fontSize: 12, fontFamily: ff, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          {importing ? "⏳" : "⬆"} {isAr ? "استيراد PDF" : "Import PDF"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}/>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: P.border, flexShrink: 0 }}/>

        {/* Copilot */}
        <button onClick={() => setShowCopilot(c => !c)} style={{ background: showCopilot ? `${P.violet}33` : `${P.violet}18`, border: `1px solid ${P.violet}${showCopilot ? "66" : "33"}`, color: P.violetLight, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, whiteSpace: "nowrap" }}>
          ✧ {t.aiCopilot}
        </button>

        {/* PDF Export */}
        <button onClick={() => { track("download_attempted", { tier: userTier }); exportPDF(); }} disabled={exportingPdf} style={{ background: canExport ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : P.surface, border: canExport ? "none" : `1px solid ${P.border}`, color: canExport ? "#fff" : P.muted, borderRadius: 8, padding: "8px 16px", cursor: exportingPdf ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, fontFamily: ff, display: "flex", alignItems: "center", gap: 6, boxShadow: canExport ? `0 4px 16px ${P.violet}44` : "none", whiteSpace: "nowrap", opacity: exportingPdf ? 0.75 : 1, transition: "opacity 0.2s" }}>
          {exportingPdf ? "⏳" : canExport ? "⬇" : "🔒"} {exportingPdf ? (isAr ? "جارٍ..." : "Working…") : t.export}
        </button>
      </div>

      {importError && (
        <div style={{ background: `${P.red}1A`, borderBottom: `1px solid ${P.red}33`, color: P.red, padding: "8px 20px", fontSize: 13 }}>
          {importError} <button onClick={() => setImportError("")} style={{ background: "none", border: "none", color: P.red, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Form sidebar */}
        <div style={{ width: 300, background: P.surface, borderRight: isAr ? "none" : `1px solid ${P.border}`, borderLeft: isAr ? `1px solid ${P.border}` : "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Section nav */}
          <div style={{ padding: "12px 8px", borderBottom: `1px solid ${P.border}` }}>
            {SECTIONS.map((label, i) => (
              <button key={i} onClick={() => setActiveSection(i as Section)} style={{
                width: "100%", textAlign: isAr ? "right" : "left", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeSection === i ? 700 : 400, fontFamily: ff, marginBottom: 2,
                background: activeSection === i ? `${P.violet}22` : "transparent",
                color: activeSection === i ? P.violetLight : P.muted,
                transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Form content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px" }}>
            {renderFormSection()}
          </div>
        </div>

        {/* CV Preview */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#2A2A3E22" }}>
          <EliteImportFeature
            userSubscriptionTier={currentPlan}
            uiLang={isAr ? "ar" : "en"}
            currentResumeData={cv}
            activeLang={activeCvLang}
            updateResumeData={(imported, newLang) => {
              setCv({ ...INIT_CV, ...imported });
              if (newLang === "ar" || newLang === "en") setActiveCvLang(newLang);
            }}
          />
          {!canExport && (
            <div style={{ background: `${P.gold}15`, border: `1px solid ${P.gold}33`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: P.gold, fontWeight: 700, fontSize: 13 }}>🔒 {isAr ? "الباقة المجانية — المعاينة كاملة" : "Free Plan — Full Preview"}</span>
                <span style={{ color: P.muted, fontSize: 12, marginRight: isAr ? 0 : 0, marginLeft: isAr ? 0 : 8 }}>  {isAr ? "· التصدير متاح للباقات المدفوعة فقط" : "· Export requires a paid plan"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setIsPaid(true)} style={{ background: `${P.green}22`, border: `1px solid ${P.green}44`, color: P.green, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff }}>
                  {isAr ? "محاكاة الدفع" : "Simulate Basic Payment"}
                </button>
                <button onClick={() => setShowUpgrade(true)} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff }}>
                  {isAr ? "ترقية" : "Upgrade"}
                </button>
              </div>
            </div>
          )}
          <div ref={cvPreviewRef} style={{ maxWidth: 794, margin: "0 auto", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <CVPreview cv={cv} lang={lang} cvLanguage={activeCvLang}/>
            {!isPaid && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", userSelect: "none", zIndex: 50, overflow: "hidden" }}>
                {Array.from({ length: 54 }).map((_, i) => {
                  const cols = 6;
                  const col = i % cols;
                  const row = Math.floor(i / cols);
                  return (
                    <span key={i} style={{
                      position: "absolute",
                      left: `${(col / cols) * 100 + (100 / cols / 2)}%`,
                      top: `${(row / 9) * 100 + (100 / 9 / 2)}%`,
                      transform: "translate(-50%, -50%) rotate(-45deg)",
                      opacity: 0.1,
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#000",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}>
                      NASHMI - نشمي
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden off-screen preview of the OTHER language (Elite only) — used for dual-PDF export */}
          {isElite && otherLangCv && (
            <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: -10000, width: 794, pointerEvents: "none", opacity: 0 }}>
              <div ref={hiddenCvPreviewRef} style={{ width: 794 }}>
                <CVPreview cv={otherLangCv} lang={lang} cvLanguage={otherLang}/>
              </div>
            </div>
          )}
        </div>


        {/* Copilot panel */}
        {showCopilot && (
          <div style={{ width: 320, background: P.surface, borderLeft: isAr ? "none" : `1px solid ${P.border}`, borderRight: isAr ? `1px solid ${P.border}` : "none", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: P.text, fontWeight: 700, fontSize: 14 }}>✧ {t.copilotTitle}</span>
              <button onClick={() => setShowCopilot(false)} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            {/* Hints */}
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${P.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {t.copilotHints.map((h, i) => (
                <button key={i} onClick={() => sendCopilot(h)} style={{ background: `${P.violet}1A`, border: `1px solid ${P.violet}33`, color: P.violetLight, borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontFamily: ff }}>
                  {h}
                </button>
              ))}
            </div>

            {/* Chat history */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {copilotHistory.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", background: m.role === "user" ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : P.card, color: "#fff", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "10px 12px", fontSize: 13, lineHeight: 1.6 }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: P.card, color: P.muted, borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: 20 }}>···</div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* Input */}
            <div style={{ padding: "12px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 8 }}>
              <input value={copilotMsg} onChange={e => setCopilotMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendCopilot()} placeholder={t.copilotPlaceholder} style={{ flex: 1, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "9px 12px", color: P.text, fontSize: 13, outline: "none", fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}
                onFocus={e => e.currentTarget.style.borderColor = P.violet}
                onBlur={e => e.currentTarget.style.borderColor = P.border}
              />
              <button onClick={() => sendCopilot()} disabled={isTyping} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: isTyping ? 0.6 : 1 }}>
                {isAr ? "←" : "→"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ATS Match Modal ─────────────────────────────────── */}
      {showATSMatch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,10,11,0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 600, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ color: P.text, fontWeight: 800, fontSize: 18, fontFamily: ff }}>
                ◈ {isAr ? "مطابقة وصف الوظيفة" : "Job Description Match"}
              </h3>
              <button onClick={() => setShowATSMatch(false)} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            <p style={{ color: P.muted, fontSize: 13, marginBottom: 14 }}>
              {isAr ? "الصق وصف الوظيفة لمعرفة مدى تطابق سيرتك معها والكلمات المفتاحية المفقودة." : "Paste the job description to see how well your resume matches and which keywords are missing."}
            </p>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={6} placeholder={isAr ? "الصق وصف الوظيفة هنا..." : "Paste job description here..."} style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 13, outline: "none", resize: "vertical", fontFamily: ff, direction: isAr ? "rtl" : "ltr", boxSizing: "border-box", marginBottom: 14 }}
              onFocus={e => e.currentTarget.style.borderColor = P.violet}
              onBlur={e => e.currentTarget.style.borderColor = P.border}
            />
            <button onClick={runATSMatch} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "11px 24px", cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: ff, marginBottom: atsMatch ? 18 : 0 }}>
              {isAr ? "تحليل الآن" : "Analyze Now"}
            </button>

            {atsMatch && (
              <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
                  <ATSRing score={atsMatch.score} size={72}/>
                  <div>
                    <div style={{ color: P.text, fontSize: 22, fontWeight: 800 }}>{atsMatch.score}% {isAr ? "تطابق" : "Match"}</div>
                    <div style={{ color: P.muted, fontSize: 13 }}>{atsMatch.matched.length} {isAr ? "كلمة مطابقة" : "matching keywords"} · {atsMatch.missing.length} {isAr ? "مفقودة" : "missing"}</div>
                  </div>
                </div>

                {atsMatch.missing.length > 0 && (
                  <div>
                    <p style={{ color: P.muted, fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "الكلمات المفتاحية المفقودة" : "Missing Keywords"}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {atsMatch.missing.map(kw => (
                        <span key={kw} style={{ background: `${P.red}15`, border: `1px solid ${P.red}33`, color: P.red, fontSize: 12, padding: "3px 9px", borderRadius: 6 }}>✕ {kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {atsMatch.matched.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ color: P.muted, fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>{isAr ? "الكلمات المطابقة" : "Matched Keywords"}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {atsMatch.matched.slice(0, 12).map(kw => (
                        <span key={kw} style={{ background: `${P.green}15`, border: `1px solid ${P.green}33`, color: P.green, fontSize: 12, padding: "3px 9px", borderRadius: 6 }}>✓ {kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Before/After AI Modal ───────────────────────────── */}
      {beforeAfter && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,10,11,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 680, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ color: P.text, fontWeight: 800, fontSize: 18, fontFamily: ff }}>
                ✦ {isAr ? "قبل وبعد تحسين AI" : "Before & After AI Improvement"}
              </h3>
              <button onClick={() => setBeforeAfter(null)} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ color: P.red, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>✕ {isAr ? "قبل" : "Before"}</div>
                <div style={{ background: P.surface, border: `1px solid ${P.red}33`, borderRadius: 10, padding: "12px 14px", color: P.muted, fontSize: 13, lineHeight: 1.7, minHeight: 80, direction: isAr ? "rtl" : "ltr" }}>
                  {beforeAfter.before}
                </div>
              </div>
              <div>
                <div style={{ color: P.green, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>✦ {isAr ? "بعد AI" : "After AI"}</div>
                <div style={{ background: P.surface, border: `1px solid ${P.green}33`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 13, lineHeight: 1.7, minHeight: 80, direction: isAr ? "rtl" : "ltr" }}>
                  {beforeAfter.after}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setBeforeAfter(null)} style={{ background: "transparent", border: `1px solid ${P.border}`, color: P.muted, borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontFamily: ff }}>
                {isAr ? "إلغاء" : "Discard"}
              </button>
              <button onClick={() => {
                const sec = beforeAfter.section;
                const after = beforeAfter.after;
                if (sec === "summary") setSummary(after);
                else if (sec.startsWith("exp-")) {
                  const idx = parseInt(sec.split("-")[1]);
                  setExp(idx, "desc", after);
                } else if (sec === "skills") {
                  const skills = after.split(/[,،;،\n]+/).map(s => s.trim()).filter(Boolean);
                  setCv(prev => ({ ...prev, skills }));
                }
                setBeforeAfter(null);
              }} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: ff, boxShadow: `0 4px 16px ${P.violet}44` }}>
                ✓ {isAr ? "تطبيق التحسين" : "Apply Improvement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade modal ───────────────────────────────────── */}
      {showUpgrade && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,10,11,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 520, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "32px 28px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setShowUpgrade(false)} style={{ position: "absolute", top: 20, [isAr ? "left" : "right"]: 20, background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 20 }}>×</button>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h3 style={{ color: P.text, fontSize: 22, fontWeight: 900, fontFamily: ff, marginBottom: 10 }}>{isAr ? "قم بالترقية للتصدير" : "Upgrade to Export"}</h3>
              <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.7 }}>
                {isAr ? "المعاينة مجانية دائماً. لتحميل PDF أو DOCX عالي الجودة، اختر باقتك." : "Preview is always free. To download a high-quality PDF or DOCX, choose your plan."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[{ tier: "premium", name: t.plans[1].name, price: t.plans[1].price, cur: t.plans[1].cur }, { tier: "elite", name: t.plans[2].name, price: t.plans[2].price, cur: t.plans[2].cur }].map(p => (
                <button key={p.tier} onClick={() => { setShowUpgrade(false); onSelectPlan(p.tier); onNav("checkout"); }} style={{ flex: 1, background: p.tier === "elite" ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : "transparent", border: `1px solid ${p.tier === "elite" ? "transparent" : P.borderLight}`, color: p.tier === "elite" ? "#fff" : P.text, borderRadius: 12, padding: "14px 12px", cursor: "pointer", fontFamily: ff, boxShadow: p.tier === "elite" ? `0 6px 24px ${P.violet}44` : "none" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{p.price} <span style={{ fontSize: 13, fontWeight: 600 }}>{p.cur}</span></div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowUpgrade(false)} style={{ width: "100%", background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 13, padding: "8px 0", fontFamily: ff }}>
              {isAr ? "البقاء على المعاينة المجانية" : "Stay on free preview"}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast notification ─────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: toast.type === "error" ? `${P.red}EE` : `${P.violet}EE`,
          color: "#fff", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700,
          fontFamily: ff, boxShadow: "0 8px 32px rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
          border: `1px solid ${toast.type === "error" ? P.red : P.violetLight}33`,
          whiteSpace: "nowrap", maxWidth: "90vw", textAlign: "center",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
