import { useState, useEffect, memo, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { toast as sonnerToast } from "sonner";
import { P, FF } from "@/nashmi/lib/tokens";
import { CVPreview } from "@/nashmi/components/CVPreview";
import { ATSRing } from "@/nashmi/components/ATSRing";
import { calcATS, calcATSMatch, type CVData } from "@/nashmi/lib/ats";
import { INIT_CV, LANG_LEVELS, LANGUAGE_OPTIONS, DEGREE_LEVELS, HONORS_OPTIONS, EN_HEADERS, AR_HEADERS, extractTextFromFile, localParseCV, normalizeParsedCV, smartCategorize, isResumeJsonFile, parseResumeJsonFile, persistBilingualImport, describeImportError, isPdfFile } from "@/nashmi/lib/cv-parser";
import { track } from "@/nashmi/lib/analytics";
import type { TrLang, Translation } from "@/nashmi/lib/translations";
import type { CvLang } from "@/nashmi/hooks/useLang";
import { EliteImportFeature, ELITE_CV_KEYS } from "@/nashmi/components/EliteImportFeature";
import { cvMatchesLanguage, ensureArabicPersonalName, translateCvDetailed } from "@/nashmi/lib/cv-translate";
import { ExportConfirmModal } from "@/nashmi/components/ExportConfirmModal";
import { ExportLangWarningModal } from "@/nashmi/components/ExportLangWarningModal";
import { TemplatePicker } from "@/nashmi/components/TemplatePicker";
import {
  MobileBuilderTutorial,
  MOBILE_TOUR_STEPS,
  MOBILE_TOUR_STORAGE_KEY,
} from "@/nashmi/components/MobileBuilderTutorial";
import { getCvSessionId } from "@/nashmi/lib/session";
import { getSessionPlanTier, setSessionPlanTier, getPurchaseToken } from "@/nashmi/lib/plan-session";
import {
  wipeAllClientCvData,
  expireFreeDraftIfStale,
  touchFreeDraftTimestamp,
  preserveDraftForCheckout,
  wipeFreeClientCvData,
  hasActivePaidSession,
  loadPaidSessionCvRaw,
  savePaidSessionCv,
  CV_STORAGE_KEY,
  EDITMODE_STORAGE_KEY,
  STARTMODE_STORAGE_KEY,
} from "@/nashmi/lib/client-data-wipe";
import { SALLA_PREMIUM_URL, SALLA_ELITE_URL } from "@/nashmi/lib/constants";
import { PlanActivationPanel } from "@/nashmi/components/PlanActivationPanel";
import {
  setStoredCvTemplate,
  resetStoredCvTemplate,
  getDefaultCvTemplate,
  DEFAULT_CV_TEMPLATE,
  getCvTemplateStyles,
  type CvTemplateId,
} from "@/nashmi/lib/cv-templates";
import { renderCvToAtsPdfBlob, parsePdfToCvData, type CvData as ExportCvData } from "@/nashmi/lib/cv-pdf-export";
import { exportResumePdfs } from "@/nashmi/lib/pdf-export/export-controller";
import { isMobileLayout } from "@/nashmi/lib/mobile-layout";
import { NASHMI_BUILD_ID } from "@/nashmi/lib/build-version";

const FF2 = FF;

/** Fit fixed A4 paper to mobile viewport width (PDF-viewer style, minimal side padding). */
function computeMobilePreviewScale(viewportWidth: number, paperWidth: number, horizontalPad = 16): number {
  const usable = Math.max(280, viewportWidth - horizontalPad);
  return Math.min(1, usable / paperWidth);
}

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

// ── Editable CV canvas (click-to-edit mode) ─────────────────────────────────
// Mirrors CVPreview's visual layout but wraps every section in a clickable
// region that opens the matching editor panel. The PDF export still renders
// the untouched CVPreview component off-screen, so this never affects output.
function EditableCVPreview({ cv, cvIsAr, activePanel, onSelect, templateId, compactSections = false }: {
  cv: CVData;
  cvIsAr: boolean;
  activePanel: string | null;
  onSelect: (id: string) => void;
  templateId?: CvTemplateId;
  compactSections?: boolean;
}) {
  const H = cvIsAr ? AR_HEADERS : EN_HEADERS;
  const tpl = getCvTemplateStyles(templateId ?? getDefaultCvTemplate());
  const ffCv = cvIsAr
    ? "'Cairo', 'Tajawal', 'Noto Naskh Arabic', Tahoma, Arial, sans-serif"
    : "'Inter', 'Helvetica Neue', Arial, sans-serif";

  const headStyle: React.CSSProperties = tpl.sectionTitle;

  const Sec = ({ id, children, mb = 0 }: { id: string; children: React.ReactNode; mb?: number }) => {
    const active = activePanel === id;
    const activate = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(id);
    };
    return (
      <div
        role="button"
        tabIndex={0}
        data-cv-section={id}
        aria-label={id}
        onClick={activate}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(id);
          }
        }}
        style={{
          cursor: "pointer",
          borderRadius: 8,
          transition: "outline 0.15s, background 0.15s",
          outline: active ? `2px solid ${P.violet}88` : "2px solid transparent",
          outlineOffset: 2,
          marginBottom: mb,
          padding: compactSections ? "6px 4px" : "12px 10px",
          marginInline: compactSections ? -2 : -6,
          minHeight: compactSections ? 36 : 48,
          touchAction: "manipulation",
          WebkitTapHighlightColor: `${P.violet}44`,
          position: "relative",
          zIndex: 2,
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLDivElement).style.outline = `2px solid ${P.violet}33`;
            (e.currentTarget as HTMLDivElement).style.background = `${P.violet}08`;
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.outline = active ? `2px solid ${P.violet}88` : "2px solid transparent";
          el.style.background = "transparent";
        }}
      >
        {children}
      </div>
    );
  };

  const SectionHead = ({ id, label, mb = 10 }: { id: string; label: string; mb?: number }) => {
    const activate = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(id);
    };
    return (
    <div
      role="button"
      tabIndex={0}
      data-cv-section={id}
      onClick={activate}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      style={{
        ...headStyle,
        marginBottom: mb,
        cursor: "pointer",
        borderRadius: 8,
        padding: "10px 8px",
        marginInline: -6,
        minHeight: 44,
        touchAction: "manipulation",
        WebkitTapHighlightColor: `${P.violet}44`,
        position: "relative",
        zIndex: 2,
      }}
    >
      {label}
    </div>
    );
  };

  const Placeholder = ({ label }: { label: string }) => (
    <div style={{ border: "1.5px dashed #BBB", color: "#999", borderRadius: 6, padding: "8px 10px", fontSize: 9.5, textAlign: "center" }}>
      + {label}
    </div>
  );

  const certs = (cv.certifications || []);
  const hasCerts = certs.some(c => c.title || c.issuer || c.date);

  return (
    <div className="cv-canvas-inner" style={{ background: "#fff", color: "#111", fontFamily: ffCv, fontSize: 10.5, lineHeight: 1.55, padding: tpl.pagePadding, width: "100%", minHeight: 600, direction: cvIsAr ? "rtl" : "ltr" }}>
      {/* Personal header */}
      <Sec id="personal" mb={16}>
        <div style={{ textAlign: tpl.headerAlign, borderBottom: tpl.headerBorder, padding: tpl.headerPadding, borderLeft: tpl.sidebarAccent ? `4px solid ${tpl.accent}` : undefined }}>
          <div style={{ fontSize: tpl.nameSize, fontWeight: 700 }}>{cv.personal.name || (cvIsAr ? "الاسم الكامل" : "Full Name")}</div>
          {cv.personal.title && <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>{cv.personal.title}</div>}
          <div style={{ fontSize: 10, color: "#555", marginTop: 6, display: "flex", gap: 12, justifyContent: tpl.headerAlign === "center" ? "center" : "flex-start", flexWrap: "wrap" }}>
            {cv.personal.email && <span>{cv.personal.email}</span>}
            {cv.personal.phone && <span>{cv.personal.phone}</span>}
            {cv.personal.city && <span>{cv.personal.city}</span>}
            {cv.personal.linkedin && <span>{cv.personal.linkedin}</span>}
          </div>
        </div>
      </Sec>

      {/* Summary */}
      <Sec id="summary" mb={14}>
        <div style={headStyle}>{H.summary}</div>
        {cv.summary
          ? <p style={{ color: "#222", fontSize: 10 }}>{cv.summary}</p>
          : <Placeholder label={cvIsAr ? "أضف ملخصاً مهنياً" : "Add a professional summary"}/>}
      </Sec>

      {/* Experience */}
      <div style={{ marginBottom: 6 }}>
        <SectionHead id="experience-0" label={H.experience} />
        {cv.experience.map((e, i) => (
          <Sec key={i} id={`experience-${i}`} mb={12}>
            {(e.company || e.role || e.desc) ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 10 }}>
                  <span>{e.role}{e.company && ` — ${e.company}`}</span>
                  <span style={{ color: "#666", fontSize: 9.5 }}>{e.from}{e.to ? ` – ${e.to}` : ""}</span>
                </div>
                {e.desc && <div style={{ marginTop: 4, fontSize: 9.5, color: "#333", whiteSpace: "pre-line" }}>• {e.desc}</div>}
              </div>
            ) : (
              <Placeholder label={cvIsAr ? "أضف خبرة عملية" : "Add a work experience"}/>
            )}
          </Sec>
        ))}
      </div>

      {/* Education */}
      <div style={{ marginBottom: 6 }}>
        <SectionHead id="education-0" label={H.education} />
        {cv.education.map((e, i) => {
          const degreeText = [e.degree, e.field].filter(Boolean).join(cvIsAr ? " - " : " in ");
          const parts = [degreeText, e.school].filter(Boolean);
          return (
            <Sec key={i} id={`education-${i}`} mb={10}>
              {(e.school || e.degree) ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, fontSize: 10 }}>
                    <span style={{ fontWeight: 700 }}>
                      {parts.map((p, idx) => (<span key={idx}>{idx > 0 && <span style={{ color: "#999", fontWeight: 400, margin: "0 8px" }}>|</span>}{p}</span>))}
                    </span>
                    <span style={{ color: "#666", fontSize: 9.5, whiteSpace: "nowrap" }}>{e.from}{e.to ? ` – ${e.to}` : ""}</span>
                  </div>
                  {((e.showGpa && e.gpa) || e.honors) && (
                    <div style={{ color: "#555", fontSize: 8.5, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {e.showGpa && e.gpa && <span>{cvIsAr ? "المعدل" : "GPA"}: {e.gpa}{e.gpaScale ? `/${e.gpaScale}` : ""}</span>}
                      {e.honors && <span>{cvIsAr ? "مرتبة الشرف" : "Honors"}: {e.honors}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <Placeholder label={cvIsAr ? "أضف مؤهلاً تعليمياً" : "Add an education entry"}/>
              )}
            </Sec>
          );
        })}
      </div>

      {/* Certifications */}
      <Sec id="certifications" mb={10}>
        <div style={{ ...headStyle, marginBottom: 10, pointerEvents: "none" }}>{H.certifications}</div>
        {hasCerts ? certs.filter(c => c.title || c.issuer || c.date).map((c, i) => (
          <div key={i} style={{ marginBottom: 8, fontSize: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>{c.title}{c.issuer ? ` — ${c.issuer}` : ""}</span>
              {c.date && <span style={{ color: "#666", fontSize: 9.5 }}>{c.date}</span>}
            </div>
          </div>
        )) : <Placeholder label={cvIsAr ? "أضف شهادة أو دورة" : "Add a certification"}/>}
      </Sec>

      {/* Skills */}
      <Sec id="skills" mb={14}>
        <div style={{ ...headStyle, marginTop: 4, pointerEvents: "none" }}>{H.skills}</div>
        {cv.skills.length > 0
          ? <div style={{ color: "#222", fontSize: 10 }}>{cv.skills.join(tpl.skillsSeparator)}</div>
          : <Placeholder label={cvIsAr ? "أضف مهاراتك" : "Add your skills"}/>}
      </Sec>

      {/* Languages */}
      <Sec id="languages">
        <div style={{ ...headStyle, pointerEvents: "none" }}>{H.languages}</div>
        {cv.languages.some(l => l.lang)
          ? <div style={{ color: "#222", fontSize: 10 }}>{cv.languages.filter(l => l.lang).map(l => `${l.lang}${l.level ? ` (${l.level})` : ""}`).join(" · ")}</div>
          : <Placeholder label={cvIsAr ? "أضف اللغات" : "Add languages"}/>}
      </Sec>
    </div>
  );
}

function descToBullets(desc: string): string[] {
  return desc
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^[\s•\-–—oO]+/, "").trim())
    .filter(Boolean);
}

function bulletsToDesc(bullets: string[]): string {
  return bullets.map((b) => `• ${b}`).join("\n");
}

function builderCvToExportCv(cv: CVData): ExportCvData {
  return {
    fullName: cv.personal.name,
    jobTitle: cv.personal.title || undefined,
    phone: cv.personal.phone || undefined,
    email: cv.personal.email || undefined,
    linkedin: cv.personal.linkedin || undefined,
    location: cv.personal.city || undefined,
    summary: cv.summary || undefined,
    experience: cv.experience
      .filter((e) => e.role?.trim() || e.company?.trim() || e.desc?.trim())
      .map((e) => ({
        jobTitle: e.role,
        company: e.company,
        location: cv.personal.city || undefined,
        startDate: e.from,
        endDate: e.to,
        bullets: descToBullets(e.desc),
      })),
    education: cv.education
      .filter((e) => e.school?.trim() || e.degree?.trim())
      .map((e) => ({
        institution: e.school,
        degree: [e.degree, e.field].filter(Boolean).join(" in "),
        year: e.to || e.from,
        gpa: e.showGpa && e.gpa ? e.gpa : undefined,
        honors: e.honors || undefined,
      })),
    certifications: cv.certifications
      .filter((c) => c.title?.trim() || c.issuer?.trim() || c.date?.trim())
      .map((c) => ({
        name: c.title || c.issuer,
        issuer: c.issuer || undefined,
        year: c.date,
      })),
    skills: cv.skills,
    languages: cv.languages
      .filter((l) => l.lang?.trim())
      .map((l) => (l.level ? `${l.lang} (${l.level})` : l.lang)),
  };
}

function exportCvToBuilderCv(parsed: Partial<ExportCvData>): Partial<CVData> {
  const experience = (parsed.experience || []).map((e) => ({
    role: e.jobTitle || "",
    company: e.company || "",
    from: e.startDate || "",
    to: e.endDate || "",
    desc: bulletsToDesc(e.bullets || []),
  }));

  const education = (parsed.education || []).map((e) => ({
    school: e.institution || "",
    degree: e.degree || "",
    field: "",
    from: "",
    to: e.year || "",
    gpa: e.gpa || "",
    gpaScale: "5",
    honors: e.honors || "",
    showGpa: !!e.gpa,
  }));

  const certifications = (parsed.certifications || []).map((c) => ({
    title: c.name || "",
    issuer: c.issuer || "",
    date: c.year || "",
  }));

  const languages = (parsed.languages || []).map((line) => {
    const m = line.match(/^(.+?)\s*\((.+)\)\s*$/);
    return m ? { lang: m[1].trim(), level: m[2].trim() } : { lang: line.trim(), level: "" };
  });

  return {
    personal: {
      name: parsed.fullName || "",
      title: parsed.jobTitle || "",
      phone: parsed.phone || "",
      email: parsed.email || "",
      linkedin: parsed.linkedin || "",
      city: parsed.location || "",
      website: "",
    },
    summary: parsed.summary || "",
    ...(experience.length ? { experience } : {}),
    ...(education.length ? { education } : {}),
    certifications,
    projects: parsed.projects ?? INIT_CV.projects,
    skills: parsed.skills || [],
    languages: languages.length ? languages : INIT_CV.languages,
  };
}

class AiRateLimitError extends Error {
  readonly code = "AI_RATE_LIMIT";
  readonly usageType?: string;
  readonly limit?: number;

  constructor(message: string, usageType?: string, limit?: number) {
    super(message);
    this.name = "AiRateLimitError";
    this.usageType = usageType;
    this.limit = limit;
  }
}

function rateLimitUserMessage(isAr: boolean, usageType?: string, limit?: number): string {
  switch (usageType) {
    case "translate":
      return isAr
        ? `تجاوزت حد الترجمة (${limit ?? 40} طلب) لهذه السيرة. عدّل يدوياً أو صدّر وابدأ سيرة جديدة.`
        : `Translation limit reached (${limit ?? 40} requests) for this resume. Edit manually, export, or start a new session.`;
    case "copilot":
      return isAr
        ? `تجاوزت حد المساعد الذكي (${limit ?? 35} رسالة) لهذه السيرة. صدّر أو ابدأ سيرة جديدة.`
        : `AI assistant limit reached (${limit ?? 35} messages) for this resume. Export or start a new session.`;
    case "parse":
      return isAr
        ? `تجاوزت حد استيراد السيرة (${limit ?? 3} مرات) لهذه الجلسة.`
        : `CV import limit reached (${limit ?? 3} imports) for this session.`;
    case "improve":
    default:
      return isAr
        ? `تجاوزت ${limit ?? 3} محاولات لهذا الزر في هذه السيرة. عدّل يدوياً أو صدّر وابدأ سيرة جديدة.`
        : `You used all ${limit ?? 3} attempts for this button on this resume. Edit manually, export, or start a new session.`;
  }
}

type CopilotUpdate = { path: string; value: unknown };

type CopilotResponse = {
  message: string;
  updates: CopilotUpdate[];
};

const COPILOT_TEXT_PATH =
  /^(summary|personal\.(name|email|phone|city|title|linkedin|website)|experience\.\d+\.(role|company|from|to|desc)|education\.\d+\.(school|degree|field|from|to|gpa|honors)|languages\.\d+\.(lang|level)|certifications\.\d+\.(title|issuer|date)|skills)$/;

function copilotPathLabel(path: string, cv: CVData, isAr: boolean): string {
  if (path === "summary") return isAr ? "الملخص المهني" : "Professional Summary";
  if (path === "skills") return isAr ? "المهارات" : "Skills";
  if (path.startsWith("personal.")) {
    const field = path.split(".")[1];
    const labels: Record<string, [string, string]> = {
      name: ["الاسم", "Name"],
      title: ["المسمى الوظيفي", "Job Title"],
      email: ["البريد", "Email"],
      phone: ["الجوال", "Phone"],
      city: ["المدينة", "City"],
      linkedin: ["LinkedIn", "LinkedIn"],
      website: ["الموقع", "Website"],
    };
    const pair = labels[field];
    return pair ? (isAr ? pair[0] : pair[1]) : path;
  }
  const expMatch = path.match(/^experience\.(\d+)\./);
  if (expMatch) {
    const idx = Number(expMatch[1]);
    const role = cv.experience[idx]?.role?.trim();
    return isAr
      ? `الخبرة ${idx + 1}${role ? ` (${role})` : ""}`
      : `Experience ${idx + 1}${role ? ` (${role})` : ""}`;
  }
  const eduMatch = path.match(/^education\.(\d+)\./);
  if (eduMatch) {
    const idx = Number(eduMatch[1]);
    const school = cv.education[idx]?.school?.trim();
    return isAr
      ? `التعليم ${idx + 1}${school ? ` (${school})` : ""}`
      : `Education ${idx + 1}${school ? ` (${school})` : ""}`;
  }
  const langMatch = path.match(/^languages\.(\d+)\./);
  if (langMatch) {
    const idx = Number(langMatch[1]) + 1;
    return isAr ? `اللغة ${idx}` : `Language ${idx}`;
  }
  const certMatch = path.match(/^certifications\.(\d+)\./);
  if (certMatch) {
    const idx = Number(certMatch[1]) + 1;
    return isAr ? `الشهادة ${idx}` : `Certification ${idx}`;
  }
  return path;
}

function setCopilotPath(root: CVData, path: string, value: unknown): boolean {
  if (path === "skills") {
    let skills: string[] = [];
    if (Array.isArray(value)) {
      skills = value.map(String).map((s) => s.trim()).filter(Boolean);
    } else if (typeof value === "string") {
      skills = value
        .split(/\n|[,،]|(?:\s*[•·|]\s*)|(?:\s+-\s+)/)
        .map((s) => s.replace(/^[\s•\-–—*]+/, "").trim())
        .filter(Boolean);
    }
    if (!skills.length) return false;
    root.skills = skills;
    return true;
  }
  const strVal = typeof value === "string" ? value : String(value ?? "");
  const parts = path.split(".");
  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (cur === null || typeof cur !== "object") return false;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return false;
      cur = cur[idx];
    } else {
      cur = (cur as Record<string, unknown>)[part];
      if (cur === undefined) return false;
    }
  }
  const last = parts[parts.length - 1];
  if (cur === null || typeof cur !== "object" || Array.isArray(cur)) return false;
  (cur as Record<string, unknown>)[last] = strVal;
  return true;
}

function applyCopilotUpdates(
  cv: CVData,
  updates: CopilotUpdate[],
  isAr: boolean,
): { next: CVData; appliedLabels: string[] } {
  const next = JSON.parse(JSON.stringify(cv)) as CVData;
  const appliedLabels: string[] = [];
  for (const update of normalizeCopilotUpdates(updates)) {
    if (!update?.path || !COPILOT_TEXT_PATH.test(update.path)) continue;
    if (!setCopilotPath(next, update.path, update.value)) continue;
    const label = copilotPathLabel(update.path, cv, isAr);
    if (!appliedLabels.includes(label)) appliedLabels.push(label);
  }
  return { next, appliedLabels };
}

function parseCopilotResponse(raw: string): CopilotResponse {
  const clean = raw.replace(/```json|```/g, "").trim();
  const tryParse = (text: string): CopilotResponse | null => {
    try {
      const parsed = JSON.parse(text) as { message?: unknown; updates?: unknown; changes?: unknown; edits?: unknown };
      if (typeof parsed?.message !== "string") return null;
      const rawUpdates = parsed.updates ?? parsed.changes ?? parsed.edits;
      const updates = Array.isArray(rawUpdates)
        ? rawUpdates.filter(
            (u): u is CopilotUpdate =>
              !!u &&
              typeof u === "object" &&
              typeof (u as CopilotUpdate).path === "string" &&
              "value" in (u as object),
          )
        : [];
      return { message: parsed.message.trim(), updates: normalizeCopilotUpdates(updates) };
    } catch {
      return null;
    }
  };
  const direct = tryParse(clean);
  if (direct) return direct;
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const nested = tryParse(clean.slice(start, end + 1));
    if (nested) return nested;
  }
  return { message: raw.trim(), updates: [] };
}

function buildCopilotCvPayload(cv: CVData) {
  return {
    personal: cv.personal,
    summary: cv.summary,
    experience: cv.experience,
    education: cv.education,
    skills: cv.skills,
    languages: cv.languages,
    certifications: cv.certifications,
  };
}

function detectConversationLang(message: string, fallback: "ar" | "en"): "ar" | "en" {
  const ar = (message.match(/[\u0600-\u06FF]/g) || []).length;
  const en = (message.match(/[A-Za-z]/g) || []).length;
  if (ar === 0 && en === 0) return fallback;
  return ar >= en ? "ar" : "en";
}

function isCopilotQuestionOnly(message: string): boolean {
  const m = message.trim();
  if (!m) return true;
  const editIntent =
    /(حس|عد|غير|عدل|اكتب|أكتب|أضف|اضف|ضيف|احذ|شيل|بدل|نقح|سو|مهار|skill|ملخص|summary|experience|خبر|education|تعل|cert|شهاد|title|اسم|linkedin|لغ|language|improve|edit|change|fix|update|add|remove|rewrite|enhance|optimi|professional|better|stronger|shorter|longer)/i.test(m);
  if (editIntent) return false;
  return /[؟?]$/.test(m) && /^(what|how|why|who|when|where|is |are |can |does |do |explain|tell me|ما |كيف |لماذا |هل |ممكن تشرح|وش |ايش )/i.test(m);
}

function normalizeCopilotUpdate(raw: CopilotUpdate): CopilotUpdate | null {
  if (!raw?.path || raw.value === undefined || raw.value === null) return null;
  let path = String(raw.path).trim().toLowerCase().replace(/\s+/g, "");
  if (path === "skills" || path === "skill" || path === "المهارات") return { path: "skills", value: raw.value };
  if (path === "summary" || path === "الملخص" || path === "professionalsummary") return { path: "summary", value: raw.value };
  if (path.startsWith("personal.")) return { path, value: raw.value };
  if (/^experience\.\d+\./.test(path)) return { path, value: raw.value };
  if (/^education\.\d+\./.test(path)) return { path, value: raw.value };
  if (/^languages\.\d+\./.test(path)) return { path, value: raw.value };
  if (/^certifications\.\d+\./.test(path)) return { path, value: raw.value };
  return COPILOT_TEXT_PATH.test(path) ? { path, value: raw.value } : null;
}

function normalizeCopilotUpdates(raw: CopilotUpdate[]): CopilotUpdate[] {
  const out: CopilotUpdate[] = [];
  for (const item of raw) {
    const normalized = normalizeCopilotUpdate(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function buildCopilotEditPrompt(opts: {
  conversationIsAr: boolean;
  cvContentIsAr: boolean;
  cvPayload: object;
  historyText: string;
  userRequest: string;
  forceUpdates: boolean;
}): string {
  const { conversationIsAr, cvContentIsAr, cvPayload, historyText, userRequest, forceUpdates } = opts;
  return `
You are an expert resume writing assistant embedded in a CV builder.

Conversation language (for "message" ONLY): ${conversationIsAr ? "Arabic" : "English"}
Resume text language (for every "updates" value): ${cvContentIsAr ? "Arabic" : "English"}

Current resume (text fields only):
${JSON.stringify(cvPayload, null, 2)}

Conversation history:
${historyText || "(none)"}

User request:
${userRequest}

Return ONLY valid JSON (no markdown, no code fences):
{"message":"","updates":[]}

Rules:
- TEXT ONLY. Never change templates, layout, styling, fonts, colors, or design.
- "message" MUST be in ${conversationIsAr ? "Arabic" : "English"} — the language the user is speaking.
- Every string in "updates" MUST be in ${cvContentIsAr ? "Arabic" : "English"} — the resume language.
- Interpret the user's request freely in natural language (Arabic or English). Do NOT require specific wording.
  Examples that ALL mean edit skills → path "skills":
  "عدل مهاراتي", "عدل على مهاراتي", "حسن مهاراتي", "حسّن skills", "improve my skills", "fix skills section"
  Examples for summary → path "summary":
  "حسن ملخصي", "عدّل الملخص", "improve summary", "make summary shorter"
- Allowed paths ONLY:
  personal.name, personal.email, personal.phone, personal.city, personal.title, personal.linkedin, personal.website,
  summary,
  experience.N.role, experience.N.company, experience.N.from, experience.N.to, experience.N.desc,
  education.N.school, education.N.degree, education.N.field, education.N.from, education.N.to, education.N.gpa, education.N.honors,
  skills (array of strings OR one comma/newline-separated string),
  languages.N.lang, languages.N.level,
  certifications.N.title, certifications.N.issuer, certifications.N.date
  (N = 0-based index)
- Do not invent employers, schools, or degrees unless the user explicitly asks.
- experience.desc: bullet lines (• optional per line).
${forceUpdates
    ? `- The user wants a resume TEXT change. "updates" MUST contain at least one valid change. Never reply without applying edits.`
    : `- If the user wants any resume text changed (in any wording), "updates" MUST NOT be empty.
- Only pure questions with no edit intent may use "updates": [].`}
- When "updates" is not empty, "message" MUST name each changed section clearly.
  `.trim();
}

async function runCopilotTextEditApply(
  message: string,
  cv: CVData,
  cvContentLang: "ar" | "en",
  conversationLang: "ar" | "en",
): Promise<CopilotResponse | null> {
  const data = await callAI("copilot_apply", message, conversationLang, { cv, cvContentLang });
  const parsed = data.json as CopilotResponse | undefined;
  if (!parsed?.updates?.length) return null;
  return parsed;
}

async function runCopilotSectionFallback(
  message: string,
  cv: CVData,
  cvContentLang: "ar" | "en",
  convIsAr: boolean,
): Promise<{ next: CVData; reply: string } | null> {
  const m = message.toLowerCase();
  if (/مهار|skill/i.test(m)) {
    const data = await callAI("improve_skills", cv.skills.join(", "), cvContentLang, { cv });
    const suggested = Array.isArray(data.json)
      ? (data.json as string[])
      : (data.text || "").split("\n").map((s) => s.trim()).filter(Boolean);
    if (!suggested.length) return null;
    const merged = [...cv.skills];
    for (const skill of suggested) {
      if (!merged.some((s) => s.toLowerCase() === skill.toLowerCase())) merged.push(skill);
    }
    return {
      next: { ...cv, skills: merged },
      reply: convIsAr
        ? `✓ تم تحديث المهارات.\n\n${merged.join(" · ")}`
        : `✓ Skills updated.\n\n${merged.join(" · ")}`,
    };
  }
  if (/ملخص|summary/i.test(m)) {
    const data = await callAI("improve_summary", cv.summary, cvContentLang, { cv });
    const text = data.text?.trim();
    if (!text) return null;
    return {
      next: { ...cv, summary: text },
      reply: convIsAr ? `✓ تم تحديث الملخص المهني.\n\n${text}` : `✓ Professional Summary updated.\n\n${text}`,
    };
  }
  if (/خبر|experience|exp/i.test(m)) {
    const next = JSON.parse(JSON.stringify(cv)) as CVData;
    const changed: string[] = [];
    for (let i = 0; i < next.experience.length; i += 1) {
      const exp = next.experience[i];
      if (!exp?.desc?.trim() && !exp?.role?.trim()) continue;
      const data = await callAI(`improve_exp-${i}`, exp.desc, cvContentLang, { cv: next });
      const text = data.text?.trim();
      if (!text) continue;
      next.experience[i] = { ...exp, desc: text };
      changed.push(convIsAr ? `الخبرة ${i + 1}` : `Experience ${i + 1}`);
    }
    if (!changed.length) return null;
    return {
      next,
      reply: convIsAr ? `✓ تم تحديث: ${changed.join("، ")}` : `✓ Updated: ${changed.join(", ")}`,
    };
  }
  return null;
}

async function callOpenAIRaw(
  prompt: string,
  options?: {
    usageType?: "improve" | "translate" | "copilot" | "parse";
    usageFeature?: string;
  },
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sessionId = getCvSessionId();
  if (sessionId) headers["x-nashmi-session-id"] = sessionId;
  headers["x-nashmi-plan-tier"] = getSessionPlanTier();
  const purchaseToken = getPurchaseToken();
  if (purchaseToken) headers["x-nashmi-purchase-token"] = purchaseToken;

  const res = await fetch("/api/openai", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt,
      usageType: options?.usageType,
      usageFeature: options?.usageFeature,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 429 && data?.code === "AI_RATE_LIMIT") {
      throw new AiRateLimitError(
        typeof data?.error === "string"
          ? data.error
          : "You have reached the AI usage limit.",
        typeof data?.usageType === "string" ? data.usageType : options?.usageType,
        typeof data?.limit === "number" ? data.limit : undefined,
      );
    }
    const retryAfter = data?.retryAfter ? ` ${data.retryAfter}` : "";
    const codeSuffix = data?.code ? ` (${data.code})` : "";
    throw new Error(`${data?.error || `OpenAI error: ${res.status}`}${codeSuffix}${retryAfter}`);
  }

  return (data?.text || "").trim();
}

async function callAI(task: string, text: string, lang: string, extra?: Record<string, unknown>): Promise<{ text?: string; json?: unknown }> {
  const isAr = (lang || "").startsWith("ar");
  const outLang = isAr
    ? "اكتب الناتج باللغة العربية الفصحى المهنية فقط."
    : "Write the output in professional English only.";

  // ── برومت الملخص المهني ────────────────────────────────────────────────
  if (task === "improve_summary") {
    const cv = (extra as any)?.cv;

    const expText = cv?.experience?.map((e: any) =>
      `- ${e.role || ""} @ ${e.company || ""} (${e.from || ""} - ${e.to || ""})
${e.desc || ""}`
    ).join("\n\n") || "";

    const eduText = cv?.education?.map((e: any) =>
      `- ${e.degree || ""} ${e.field ? `in ${e.field}` : ""} — ${e.school || ""} (${e.from || ""} - ${e.to || ""})${e.honors ? `, ${e.honors}` : ""}`
    ).join("\n") || "";

    const certsText = cv?.certifications?.map((c: any) =>
      `- ${c.title || ""}${c.issuer ? ` — ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`
    ).join("\n") || "";

    const prompt = `
You are a professional resume writer and ATS optimization expert.

Task:
Rewrite the professional summary using the current summary, work experience, educational background, and professional certifications together.
The result must be comprehensive, well-structured, and fully ATS-compatible while reflecting all available information.

Current summary:
${text || "No current summary provided."}

Work experience:
${expText || "No work experience provided."}

Educational background:
${eduText || "No education provided."}

Professional certifications and courses:
${certsText || "No certifications provided."}

Rules:
- Synthesize the summary, experience, education, and certifications into one cohesive professional summary.
- Keep it comprehensive yet concise (3 to 5 sentences).
- Use ATS-friendly keywords that match the candidate's field and experience.
- Mention education or certifications only when they are actually provided.
- Do not invent companies, dates, degrees, or certificates.
- Do not use first person pronouns like "I", "my", "أنا", "ني".
- Return only the improved summary with no explanation.

${outLang}
    `.trim();
    const result = await callOpenAIRaw(prompt, { usageType: "improve", usageFeature: "summary" });
    return { text: result.trim() };
  }

  // ── برومت تحسين المهام والإنجازات ─────────────────────────────────────
  if (task.startsWith("improve_exp-")) {
    const cv = (extra as any)?.cv;
    const idx = parseInt(task.replace("improve_exp-", ""), 10);
    const exp = cv?.experience?.[idx];
    const role = exp?.role || "";
    const company = exp?.company || "";
    const from = exp?.from || "";
    const to = exp?.to || "";

    const prompt = `
You are a professional resume writer and ATS optimization expert.

Task:
Improve the responsibilities and achievements for this role using the job title and the written tasks/achievements.
Use strong, ATS-optimized wording with a powerful action verb at the start of every bullet.

Job title:
${role || "Not provided"}

Company:
${company || "Not provided"}

Period:
${from || ""} - ${to || ""}

Current tasks and achievements:
${text || "No responsibilities provided."}

Rules:
- Rewrite specifically for the job title above.
- Start every bullet with a strong action verb (e.g. Led, Built, Optimized, أدار، طوّر، حسّن).
- Make each bullet professional, results-oriented, and ATS-friendly.
- Preserve the meaning of the original tasks; do not invent fake numbers, tools, or achievements.
- Use bullet points only.
- Return only the improved tasks and achievements with no explanation.

${outLang}
    `.trim();
    const result = await callOpenAIRaw(prompt, { usageType: "improve", usageFeature: `exp-${idx}` });
    return { text: result.trim() };
  }

  // ── برومت اقتراح المهارات ──────────────────────────────────────────────
  if (task === "improve_skills") {
    const cv = (extra as any)?.cv;
    const specialty = cv?.personal?.title || "";
    const titles = cv?.experience?.map((e: any) => e.role).filter(Boolean).join(", ") || "";
    const experienceDetails = cv?.experience?.map((e: any) =>
      `${e.role || ""} @ ${e.company || ""}:\n${e.desc || ""}`
    ).filter(Boolean).join("\n\n") || "";
    const existing = cv?.skills?.join(", ") || text || "";

    const prompt = `
You are an ATS resume optimization expert.

Task:
Suggest skills that match the candidate's specialization, job titles, and experience.
Skills must be relevant to the job market and optimized for ATS screening.

Specialization / target role:
${specialty || titles || "Not provided"}

Job titles:
${titles || "No job titles provided."}

Work experience:
${experienceDetails || "No experience details provided."}

Existing skills:
${existing || "No existing skills provided."}

Rules:
- Suggest 10 to 15 skills that fit the specialization and experience.
- Prioritize in-demand, market-relevant, ATS-friendly keywords.
- Include a balanced mix of technical skills, tools, and professional competencies when appropriate.
- Do not duplicate existing skills.
- Do not suggest unrelated skills.
- Write one skill per line with no numbering, bullets, commas, or explanations.
- Return only the skills list.

${outLang}
    `.trim();
    const result = await callOpenAIRaw(prompt, { usageType: "improve", usageFeature: "skills" });
    // نحول النتيجة لقائمة نظيفة
    const skills = result
      .split("\n")
      .map((s: string) => s.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((s: string) => s.length > 1);
    return { text: skills.join("\n"), json: skills };
  }

  // ── تحليل السيرة عند الاستيراد ─────────────────────────────────────────
  if (task === "parse_cv") {
    const prompt = `
Extract resume data from the following text and return ONLY a valid JSON object with this exact structure:
{
  "personal": { "name": "", "title": "", "email": "", "phone": "", "city": "", "linkedin": "", "website": "" },
  "summary": "",
  "experience": [{ "role": "", "company": "", "from": "", "to": "", "desc": "" }],
  "education": [{ "school": "", "degree": "", "field": "", "from": "", "to": "", "gpa": "", "gpaScale": "5", "honors": "", "showGpa": false }],
  "certifications": [{ "title": "", "issuer": "", "date": "" }],
  "skills": [],
  "languages": [{ "lang": "", "level": "" }]
}

Resume text:
${text}

Return ONLY the JSON, no explanation, no markdown, no code blocks.
    `.trim();
    const result = await callOpenAIRaw(prompt, { usageType: "parse" });
    const clean = result.replace(/```json|```/g, "").trim();
    try {
      return { json: JSON.parse(clean) };
    } catch {
      return { text: result };
    }
  }

  // ── Copilot ────────────────────────────────────────────────────────────
  if (task === "copilot" || task === "copilot_apply") {
    const cv = (extra as any)?.cv as CVData | undefined;
    const history = ((extra as any)?.history ?? []) as { role: string; content: string }[];
    const cvContentLang = String((extra as any)?.cvContentLang ?? lang);
    const cvContentIsAr = cvContentLang.startsWith("ar");
    const cvPayload = cv ? buildCopilotCvPayload(cv) : {};
    const historyText = history.map((h: any) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");
    const prompt = buildCopilotEditPrompt({
      conversationIsAr: isAr,
      cvContentIsAr,
      cvPayload,
      historyText,
      userRequest: text,
      forceUpdates: task === "copilot_apply",
    });
    const result = await callOpenAIRaw(prompt, { usageType: "copilot" });
    const parsed = parseCopilotResponse(result);
    return { text: parsed.message, json: parsed };
  }

  // fallback
  throw new Error(isAr ? "مهمة AI غير معروفة." : "Unknown AI task.");
}

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  initialCV?: CVData | null;
  cvLang?: CvLang | null;
  onPlanActivated?: (plan: string) => void;
  currentPlan: string | null;
  setCurrentPlan: (plan: string) => void;
}

type Section = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function BuilderPage({ lang, t, onNav, initialCV, cvLang, onPlanActivated, currentPlan, setCurrentPlan }: Props) {
  const isAr = lang === "ar";
  const isCvAr = (cvLang || lang) === "ar";   // language of the resume content
  const aiLang = cvLang || lang;
  const ff = FF;
  const CANVAS = {
    bg: "#EBEDF2",
    pattern: "radial-gradient(circle, #D4D7DE 1px, transparent 1px)",
    paperShadow: "0 2px 24px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.04)",
    lightBg: "#F8F9FB",
    lightBorder: "#E2E5EB",
    lightText: "#1E1B4B",
    lightMuted: "#64748B",
  };
  const userTier = currentPlan || getSessionPlanTier() || "starter";
  const canExport = userTier === "premium" || userTier === "elite" || userTier === "enterprise";

  // Persist CV across navigation (checkout round-trip, refresh)

  function loadStoredCV(): CVData | null {
    if (typeof window !== "undefined" && hasActivePaidSession()) {
      try {
        const raw = loadPaidSessionCvRaw();
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? (parsed as CVData) : null;
      } catch { return null; }
    }
    if (typeof window !== "undefined" && expireFreeDraftIfStale()) return null;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(CV_STORAGE_KEY) : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as CVData) : null;
    } catch { return null; }
  }

  function hasStoredDraft(): boolean {
    const stored = loadStoredCV();
    if (!stored) return false;
    const p = stored.personal;
    return !!(
      p?.name?.trim() ||
      p?.email?.trim() ||
      stored.summary?.trim() ||
      stored.experience?.some(e => e.role?.trim() || e.company?.trim()) ||
      stored.education?.some(e => e.school?.trim() || e.degree?.trim())
    );
  }

  const [startMode, setStartMode] = useState<"choose" | "ready">(() => {
    if (initialCV) return "ready";
    if (typeof window === "undefined") return "choose";
    try {
      if (window.localStorage.getItem(STARTMODE_STORAGE_KEY) === "ready") return "ready";
    } catch { /* ignore */ }
    return hasStoredDraft() ? "ready" : "choose";
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
    { role: "assistant", content: isAr ? "مرحباً! أنا مساعدك الذكي. كيف يمكنني تحسين سيرتك؟" : "Hi! I'm your AI assistant. How can I improve your resume?" },
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
  const [showExportLangWarning, setShowExportLangWarning] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [eliteSwitchBusy, setEliteSwitchBusy] = useState<"ar" | "en" | null>(null);
  const [cvTemplate, setCvTemplate] = useState<CvTemplateId>(() => DEFAULT_CV_TEMPLATE);

  // ── Click-to-edit canvas mode ──────────────────────────────────────────
  const [editMode, setEditMode] = useState<"canvas" | "sidebar">("sidebar");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);

  type MobileTab = "preview" | "sections" | "copilot" | "export";
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");
  const [mobileTourStep, setMobileTourStep] = useState<number | null>(null);
  const mobileTourTimerRef = useRef<number | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const scaledCvRef = useRef<HTMLDivElement>(null);
  const [scaledCvHeight, setScaledCvHeight] = useState(1100);

  const CV_PAPER_WIDTH = 794;
  const DESKTOP_PREVIEW_MAX_SCALE = 1;
  const DESKTOP_PREVIEW_MIN_SCALE = 0.32;
  /** Slightly enlarges the paper preview on desktop (capped at max scale). */
  const PREVIEW_SCALE_BOOST = 1.14;

  useEffect(() => {
    setSessionPlanTier(currentPlan || "starter");
  }, [currentPlan]);

  useEffect(() => {
    setStoredCvTemplate(cvTemplate);
  }, [cvTemplate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (startMode === "ready") {
        window.localStorage.setItem(STARTMODE_STORAGE_KEY, "ready");
      } else {
        window.localStorage.removeItem(STARTMODE_STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [startMode]);

  useEffect(() => {
    try { window.localStorage.setItem(EDITMODE_STORAGE_KEY, editMode); } catch { /* ignore */ }
  }, [editMode]);

  useEffect(() => {
    if (startMode !== "ready") return;
    if (window.matchMedia("(max-width: 768px)").matches) return;
    setEditMode("sidebar");
    setActivePanel(null);
  }, [startMode]);

  const resetDesktopEditMode = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) return;
    setEditMode("sidebar");
    setActivePanel(null);
  };

  // Close the editor panel when clicking outside it (auto-save is continuous,
  // so closing loses nothing). Clicking another CV section re-opens instantly
  // because mousedown (close) fires before the section's click (open).
  useEffect(() => {
    if (!activePanel) return;
    const onDown = (ev: MouseEvent) => {
      if (editorPanelRef.current && !editorPanelRef.current.contains(ev.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [activePanel]);
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
  const [viewedCvLangs, setViewedCvLangs] = useState<{ ar: boolean; en: boolean }>(() => ({
    ar: initialActiveCvLang === "ar",
    en: initialActiveCvLang === "en",
  }));
  useEffect(() => {
    if (cvLang === "ar" || cvLang === "en") setActiveCvLang(cvLang);
  }, [cvLang]);

  useEffect(() => {
    setViewedCvLangs((prev) => ({ ...prev, [activeCvLang]: true }));
  }, [activeCvLang]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    const computeDesktopScale = (area: HTMLElement | null, cvHeight: number) => {
      const usableW = Math.max(320, (area?.clientWidth ?? CV_PAPER_WIDTH) - 20);
      let usableH = 400;
      if (area) {
        const areaRect = area.getBoundingClientRect();
        const stage = area.querySelector(".cv-preview-stage");
        const stageTop = stage?.getBoundingClientRect().top ?? areaRect.top + 200;
        usableH = Math.max(300, areaRect.bottom - stageTop - 4);
      }
      const cvH = Math.max(480, cvHeight);
      const byWidth = usableW / CV_PAPER_WIDTH;
      const byHeight = usableH / cvH;
      const fit = Math.min(byWidth, byHeight) * PREVIEW_SCALE_BOOST;
      return Math.min(DESKTOP_PREVIEW_MAX_SCALE, Math.max(DESKTOP_PREVIEW_MIN_SCALE, fit));
    };
    const updateLayout = () => {
      const mobile = isMobileLayout();
      setIsMobile(mobile);
      if (mobile) {
        const area = previewAreaRef.current;
        const vw = area?.clientWidth ?? window.innerWidth;
        setPreviewScale(computeMobilePreviewScale(vw, CV_PAPER_WIDTH));
        return;
      }
      const area = previewAreaRef.current;
      setPreviewScale(computeDesktopScale(area, scaledCvHeight));
    };
    updateLayout();
    mq.addEventListener("change", updateLayout);
    coarse.addEventListener("change", updateLayout);
    window.addEventListener("resize", updateLayout);
    const areaEl = previewAreaRef.current;
    const ro = areaEl
      ? new ResizeObserver(() => updateLayout())
      : null;
    if (areaEl && ro) ro.observe(areaEl);
    return () => {
      mq.removeEventListener("change", updateLayout);
      coarse.removeEventListener("change", updateLayout);
      window.removeEventListener("resize", updateLayout);
      ro?.disconnect();
    };
  }, [startMode, scaledCvHeight, cv]);

  useEffect(() => {
    if (!scaledCvRef.current) return;
    const el = scaledCvRef.current;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setScaledCvHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mobileTab, cv, activeCvLang, editMode, previewScale]);

  const scheduleMobileTour = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMobileLayout()) return;
    try {
      if (sessionStorage.getItem(MOBILE_TOUR_STORAGE_KEY)) return;
    } catch { /* ignore */ }

    const attempt = (tryCount = 0) => {
      const preview =
        document.querySelector('[data-cv-section="summary"]') ??
        document.querySelector('[data-tour="cv-preview"]');
      if (!preview && tryCount < 40) {
        mobileTourTimerRef.current = window.setTimeout(() => attempt(tryCount + 1), 150);
        return;
      }
      if (!preview) return;
      setMobileTab("preview");
      setMobileTourStep(0);
    };

    if (mobileTourTimerRef.current !== null) {
      window.clearTimeout(mobileTourTimerRef.current);
    }
    mobileTourTimerRef.current = window.setTimeout(() => attempt(0), 500);
  }, []);

  const startFreshResume = useCallback(() => {
    setCv({ ...INIT_CV });
    setActiveSection(0);
    setActivePanel(null);
    setCopilotHistory([
      { role: "assistant", content: isAr ? "مرحباً! أنا مساعدك الذكي. كيف يمكنني تحسين سيرتك؟" : "Hi! I'm your AI assistant. How can I improve your resume?" },
    ]);
    setCvTemplate(DEFAULT_CV_TEMPLATE);
    resetStoredCvTemplate();
    wipeFreeClientCvData();
    setStartMode("ready");
    resetDesktopEditMode();
  }, [isAr]);

  const continueDraft = useCallback(() => {
    const stored = loadStoredCV();
    if (stored) setCv({ ...INIT_CV, ...stored });
    setCvTemplate(DEFAULT_CV_TEMPLATE);
    resetStoredCvTemplate();
    setStartMode("ready");
    resetDesktopEditMode();
  }, []);

  useEffect(() => {
    if (startMode !== "ready" || !isMobile) return;
    scheduleMobileTour();
    return () => {
      if (mobileTourTimerRef.current !== null) {
        window.clearTimeout(mobileTourTimerRef.current);
        mobileTourTimerRef.current = null;
      }
    };
  }, [startMode, isMobile, scheduleMobileTour]);

  useEffect(() => {
    if (mobileTourStep === null) return;
    const tab = MOBILE_TOUR_STEPS[mobileTourStep]?.tab;
    if (tab) setMobileTab(tab);
  }, [mobileTourStep]);

  const finishMobileTour = () => {
    try { sessionStorage.setItem(MOBILE_TOUR_STORAGE_KEY, "1"); } catch { /* ignore */ }
    setMobileTourStep(null);
    setActivePanel(null);
    setMobileTab("preview");
    requestAnimationFrame(() => {
      previewAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleMobileTourNext = () => {
    if (mobileTourStep === null) return;
    if (mobileTourStep >= MOBILE_TOUR_STEPS.length - 1) finishMobileTour();
    else setMobileTourStep(mobileTourStep + 1);
  };

  const handleMobileTourPrev = () => {
    if (mobileTourStep === null || mobileTourStep <= 0) return;
    setMobileTourStep(mobileTourStep - 1);
  };

  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const sheetDragStartY = useRef(0);

  useEffect(() => {
    setSheetDragY(0);
    setIsSheetDragging(false);
  }, [activePanel]);

  const onSheetDragStart = (clientY: number) => {
    sheetDragStartY.current = clientY;
    setIsSheetDragging(true);
  };

  const onSheetDragEnd = useCallback(() => {
    setSheetDragY(y => {
      if (y > 100) setActivePanel(null);
      return 0;
    });
    setIsSheetDragging(false);
  }, []);

  useEffect(() => {
    if (!isSheetDragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dy = Math.max(0, clientY - sheetDragStartY.current);
      setSheetDragY(dy);
      if ("touches" in e) e.preventDefault();
    };
    const onEnd = () => onSheetDragEnd();
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [isSheetDragging, onSheetDragEnd]);

  const isElite = userTier === "elite" || userTier === "enterprise";
  const otherLang: "ar" | "en" = activeCvLang === "ar" ? "en" : "ar";
  const hasViewedBothEliteLangs = viewedCvLangs.ar && viewedCvLangs.en;
  const missingExportLang: "ar" | "en" = !viewedCvLangs.ar ? "ar" : "en";
  const [otherLangCv, setOtherLangCv] = useState<CVData | null>(null);
  // Refresh "other language" snapshot whenever current CV / lang changes
  useEffect(() => {
    if (!isElite) { setOtherLangCv(null); return; }
    try {
      const raw = window.localStorage.getItem(ELITE_CV_KEYS[otherLang]);
      const parsed = raw ? (JSON.parse(raw) as CVData) : null;
      setOtherLangCv(parsed && cvMatchesLanguage(parsed, otherLang) ? parsed : null);
    } catch { setOtherLangCv(null); }
  }, [isElite, otherLang, activeCvLang]);

  const [showATSMatch, setShowATSMatch] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [atsMatch, setAtsMatch] = useState<{ score: number; matched: string[]; missing: string[] } | null>(null);

  const [beforeAfter, setBeforeAfter] = useState<{ section: string; before: string; after: string } | null>(null);

  useEffect(() => {
    if (!initialCV) return;
    setCv({ ...INIT_CV, ...initialCV });
    setCvTemplate(DEFAULT_CV_TEMPLATE);
    resetStoredCvTemplate();
  }, [initialCV]);

  useEffect(() => {
    if (initialCV) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (hasActivePaidSession()) return;
      if (!expireFreeDraftIfStale()) return;
      setCv({ ...INIT_CV });
      setActiveSection(0);
      setActivePanel(null);
      setStartMode("choose");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [initialCV]);

  // Auto-save CV draft so it survives navigation (e.g. paying then returning)
  useEffect(() => {
    const json = JSON.stringify(cv);
    if (hasActivePaidSession()) {
      savePaidSessionCv(json);
      return;
    }
    try { window.localStorage.setItem(CV_STORAGE_KEY, json); } catch { /* ignore */ }
    try {
      window.localStorage.setItem(ELITE_CV_KEYS[activeCvLang], json);
    } catch { /* ignore */ }
    touchFreeDraftTimestamp();
  }, [cv, activeCvLang, isPaid]);

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
    if (!isPaid) {
      openUpgradeModal();
      sonnerToast.info(isAr ? "تحسين AI متاح للباقات المدفوعة فقط" : "AI Improve is available on paid plans only");
      return;
    }
    if (!text.trim() && section === "summary") {
      // allow empty summary — OpenAI will use the rest of the CV
    } else if (!text.trim()) return;
    setAiLoading(section);
    track("ai_improvement_used", { section });
    const before = text;
    try {
      const data = await callAI(`improve_${section}`, text, aiLang, { cv });
      const after = (data.text || "").trim();
      if (after) {
        setBeforeAfter({ section, before, after });
      }
    } catch (err) {
      if (err instanceof AiRateLimitError) {
        sonnerToast.error(rateLimitUserMessage(isAr, err.usageType, err.limit));
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("MISSING_OPENAI_KEY") || msg.includes("OPENAI_API_KEY")) {
        sonnerToast.error(
          isAr
            ? "مفتاح OpenAI غير مضبوط. أضف OPENAI_API_KEY في متغيرات البيئة."
            : "OpenAI API key is missing. Add OPENAI_API_KEY to your environment variables.",
        );
        return;
      }
      if (msg.includes("AI_USAGE_CHECK_FAILED") || msg.includes("Supabase")) {
        sonnerToast.error(
          isAr
            ? "تعذر التحقق من حد الاستخدام. تأكد من إعداد Supabase وجدول ai_usage."
            : "Could not verify usage limits. Check Supabase config and the ai_usage table.",
        );
        return;
      }
      sonnerToast.error(isAr ? `فشل تحسين AI: ${msg}` : `AI improve failed: ${msg}`);
    } finally {
      setAiLoading(null);
    }
  }

  // ── AI import ──────────────────────────────────────────────────────────
  async function handleImport(file: File) {
    setImporting(true); setImportError("");
    track("pdf_imported");
    try {
      if (isResumeJsonFile(file)) {
        applyNashmiJsonImport(await parseResumeJsonFile(file));
        return;
      }

      if (isPdfFile(file)) {
        const parsed = await parsePdfToCvData(file);
        const merged = smartCategorize({ ...INIT_CV, ...exportCvToBuilderCv(parsed) });
        setCv(merged);
        setActiveSection(0);
        setCvTemplate(DEFAULT_CV_TEMPLATE);
        resetStoredCvTemplate();
        setStartMode("ready");
        resetDesktopEditMode();
        return;
      }

      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        throw new Error(isPdfFile(file) ? "PDF_IMAGE_ONLY" : "EMPTY_FILE");
      }

      // Try AI parsing first, fall back to local parser
      let parsed: CVData;
      try {
        const data = await callAI("parse_cv", text, aiLang);
        if (data.json) {
          parsed = normalizeParsedCV(data.json);
        } else {
          parsed = normalizeParsedCV(localParseCV(text));
        }
      } catch (parseErr) {
        if (parseErr instanceof AiRateLimitError) {
          sonnerToast.info(
            isAr
              ? "تجاوزت حد استيراد AI — تم استخدام المحلل المحلي بدلاً منه."
              : "AI import limit reached — using the local parser instead.",
          );
        }
        parsed = normalizeParsedCV(localParseCV(text));
      }

      parsed = smartCategorize(parsed);
      setCv({ ...INIT_CV, ...parsed });
      setActiveSection(0);
      setCvTemplate(DEFAULT_CV_TEMPLATE);
      resetStoredCvTemplate();
      setStartMode("ready");
      resetDesktopEditMode();
    } catch (e: unknown) {
      if (isPdfFile(file) && e instanceof Error) {
        setImportError(e.message);
      } else {
        setImportError(isAr ? `فشل الاستيراد: ${describeImportError(e, isAr)}` : `Import failed: ${describeImportError(e, false)}`);
      }
    } finally {
      setImporting(false);
    }
  }

  function applyNashmiJsonImport(imported: Awaited<ReturnType<typeof parseResumeJsonFile>>) {
    track("json_imported");
    persistBilingualImport(imported.bilingual);
    setCv({ ...INIT_CV, ...smartCategorize(imported.cv) });
    if (imported.activeLang === "ar" || imported.activeLang === "en") {
      setActiveCvLang(imported.activeLang);
    }
    setActiveSection(0);
    setCvTemplate(DEFAULT_CV_TEMPLATE);
    resetStoredCvTemplate();
    setStartMode("ready");
    resetDesktopEditMode();
    showToast(isAr ? "✓ تم تحميل السيرة بنجاح" : "✓ Resume loaded successfully");
  }

  // ── AI copilot ─────────────────────────────────────────────────────────
  function requestCopilotAccess(): boolean {
    if (!isPaid) {
      openUpgradeModal();
      sonnerToast.info(isAr ? "المساعد الذكي متاح للباقات المدفوعة فقط" : "AI assistant is available on paid plans only");
      return false;
    }
    return true;
  }

  async function sendCopilot(msg?: string) {
    if (!requestCopilotAccess()) return;
    const message = (msg || copilotMsg).trim();
    if (!message) return;
    setCopilotMsg("");
    setCopilotHistory(h => [...h, { role: "user", content: message }]);
    setIsTyping(true);
    track("ai_copilot_used");
    try {
      const conversationLang = detectConversationLang(message, isAr ? "ar" : "en");
      const convIsAr = conversationLang === "ar";

      const wantsEdit = !isCopilotQuestionOnly(message);
      const task = wantsEdit ? "copilot_apply" : "copilot";

      const data = await callAI(task, message, conversationLang, {
        cv,
        history: copilotHistory.slice(-8),
        cvContentLang: activeCvLang,
      });
      let copilot = data.json as CopilotResponse | undefined;
      let reply = (data.text || "").trim() || (convIsAr ? "عذراً، لم أتمكن من المعالجة." : "Sorry, could not process that.");
      let didApply = false;

      const tryApply = (payload: CopilotResponse | undefined) => {
        if (!payload?.updates?.length) return false;
        const { next, appliedLabels } = applyCopilotUpdates(cv, payload.updates, convIsAr);
        if (!appliedLabels.length) return false;
        setCv(next);
        reply = payload.message.trim() || reply;
        const where = appliedLabels.join(convIsAr ? "، " : ", ");
        if (!reply.includes(where) && !/عدّل|عدل|حدّث|حدث|updated|changed|modified|تم تحديث/i.test(reply)) {
          reply += convIsAr
            ? `\n\n✓ تم تطبيق التعديلات على: ${where}`
            : `\n\n✓ Applied changes to: ${where}`;
        }
        return true;
      };

      didApply = tryApply(copilot);

      if (!didApply && wantsEdit) {
        const retry = await runCopilotTextEditApply(message, cv, activeCvLang, conversationLang);
        if (retry) {
          copilot = retry;
          didApply = tryApply(retry);
        }
      }

      if (!didApply && wantsEdit) {
        const sectionFallback = await runCopilotSectionFallback(message, cv, activeCvLang, convIsAr);
        if (sectionFallback) {
          setCv(sectionFallback.next);
          reply = sectionFallback.reply;
          didApply = true;
        }
      }

      if (wantsEdit && !didApply) {
        reply = convIsAr
          ? "⚠️ لم أتمكن من تطبيق التعديل هذه المرة. جرّب مرة أخرى أو حدّد القسم بوضوح (مثل الملخص أو المهارات أو الخبرة)."
          : "⚠️ Could not apply the edit this time. Please try again or mention the section (summary, skills, experience, etc.).";
      }

      setCopilotHistory(h => [...h, { role: "assistant", content: reply }]);
    } catch (err) {
      if (err instanceof AiRateLimitError) {
        const msg = rateLimitUserMessage(isAr, err.usageType, err.limit);
        sonnerToast.error(msg);
        setCopilotHistory(h => [...h, { role: "assistant", content: `⚠️ ${msg}` }]);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setCopilotHistory(h => [...h, { role: "assistant", content: (isAr ? "⚠️ خطأ في الاتصال: " : "⚠️ Connection error: ") + msg }]);
    } finally {
      setIsTyping(false);
    }
  }

  function renderCopilotPanel(fullScreen = false, light = fullScreen) {
    const bg = light ? "#fff" : P.surface;
    const border = light ? CANVAS.lightBorder : P.border;
    const textColor = light ? CANVAS.lightText : P.text;
    const mutedColor = light ? CANVAS.lightMuted : P.muted;
    const bubbleBg = light ? "#F1F3F7" : P.card;
    const bubbleColor = light ? CANVAS.lightText : "#fff";
    const inputBg = light ? "#F8F9FB" : P.card;
    return (
      <div style={{ width: fullScreen ? "100%" : 340, background: bg, borderLeft: fullScreen ? "none" : (isAr ? "none" : `1px solid ${border}`), borderRight: fullScreen ? "none" : (isAr ? `1px solid ${border}` : "none"), display: "flex", flexDirection: "column", flex: fullScreen ? 1 : undefined, minHeight: fullScreen ? "100%" : undefined }}>
        {!fullScreen && (
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: textColor, fontWeight: 700, fontSize: 14 }}>✧ {t.copilotTitle}</span>
            <button onClick={() => setShowCopilot(false)} style={{ background: "none", border: "none", color: mutedColor, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {t.copilotHints.map((h, i) => (
            <button key={i} onClick={() => sendCopilot(h)} style={{ background: `${P.violet}12`, border: `1px solid ${P.violet}33`, color: P.violet, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: ff }}>
              {h}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {copilotHistory.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "85%", background: m.role === "user" ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : bubbleBg, color: m.role === "user" ? "#fff" : bubbleColor, borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "10px 12px", fontSize: 13, lineHeight: 1.6 }}>
                {m.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: bubbleBg, color: mutedColor, borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: 20 }}>···</div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
        <div style={{ padding: "12px", borderTop: `1px solid ${border}`, display: "flex", gap: 8, paddingBottom: fullScreen ? "calc(12px + env(safe-area-inset-bottom))" : 12 }}>
          <input value={copilotMsg} onChange={e => setCopilotMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendCopilot()} placeholder={t.copilotPlaceholder} style={{ flex: 1, background: inputBg, border: `1px solid ${border}`, borderRadius: 10, padding: "9px 12px", color: textColor, fontSize: 13, outline: "none", fontFamily: ff, direction: isAr ? "rtl" : "ltr" }}
            onFocus={e => e.currentTarget.style.borderColor = P.violet}
            onBlur={e => e.currentTarget.style.borderColor = border}
          />
          <button onClick={() => sendCopilot()} disabled={isTyping} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: isTyping ? 0.6 : 1 }}>
            {isAr ? "←" : "→"}
          </button>
        </div>
      </div>
    );
  }

  // ── Toast helper ──────────────────────────────────────────────────────
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openUpgradeModal() {
    setActivePanel(null);
    setBeforeAfter(null);
    setShowUpgrade(true);
  }

  // ── JSON Export / Import ───────────────────────────────────────────────
  function exportJSON() {
    track("json_exported");
    downloadJsonBackup();
    showToast(isAr ? "✓ تم حفظ السيرة بصيغة JSON" : "✓ Resume saved as JSON");
  }

  function importJSON(file: File) {
    void (async () => {
      try {
        applyNashmiJsonImport(await parseResumeJsonFile(file));
      } catch (err: unknown) {
        showToast(
          isAr ? `✕ ${describeImportError(err, isAr)}` : `✕ ${describeImportError(err, false)}`,
          "error",
        );
      }
    })();
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result || "");
        resolve(s.includes(",") ? s.slice(s.indexOf(",") + 1) : s);
      };
      reader.onerror = () => reject(new Error("Failed to read PDF"));
      reader.readAsDataURL(blob);
    });
  }

  // ── Email the exported CV to the address the client entered in the CV ──
  async function emailCvCopy(files: { filename: string; blob: Blob }[]) {
    const recipient = (cv.personal.email || "").trim();
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return;
    try {
      const attachments: { filename: string; content: string }[] = [];
      let total = 0;
      for (const f of files) {
        const content = await blobToBase64(f.blob);
        total += content.length;
        attachments.push({ filename: f.filename, content });
      }
      if (total > 4_000_000) {
        showToast(isAr ? "✕ حجم الملف كبير جداً لإرساله بالبريد" : "✕ File too large to email", "error");
        return;
      }
      showToast(isAr ? "📧 جارٍ إرسال نسخة إلى بريدك..." : "📧 Emailing a copy to you...");
      const res = await fetch("/api/send-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, name: cv.personal.name, lang: isAr ? "ar" : "en", attachments }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        track("cv_emailed");
        showToast(isAr ? `✓ تم إرسال السيرة إلى ${recipient} — تحقق من البريد المزعج إن لم يظهر` : `✓ Resume sent to ${recipient} — check spam if you don't see it`);
      } else {
        showToast(isAr ? `✕ تعذر إرسال البريد: ${data?.error || res.status}` : `✕ Email failed: ${data?.error || res.status}`, "error");
      }
    } catch {
      showToast(isAr ? "✕ تعذر إرسال البريد الإلكتروني" : "✕ Could not send the email", "error");
    }
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

  function buildNashmiJsonPayload() {
    const payload: Record<string, unknown> = {
      _nashmi: true,
      version: 2,
      exportedAt: new Date().toISOString(),
      lang: activeCvLang,
      cv,
    };
    if (isElite) {
      const bilingual: Partial<Record<"ar" | "en", CVData>> = {};
      for (const langKey of ["ar", "en"] as const) {
        try {
          const raw = window.localStorage.getItem(ELITE_CV_KEYS[langKey]);
          if (raw) bilingual[langKey] = JSON.parse(raw) as CVData;
        } catch { /* ignore */ }
      }
      if (bilingual.ar || bilingual.en) payload.bilingual = bilingual;
    }
    return payload;
  }

  function downloadJsonBackup() {
    const baseName = cv.personal.name ? cv.personal.name.replace(/\s+/g, "-").toLowerCase() : "resume";
    const blob = new Blob([JSON.stringify(buildNashmiJsonPayload(), null, 2)], { type: "application/json" });
    downloadBlob(blob, `nashmi-${baseName}-backup.json`);
  }

  async function switchEliteCvLang(target: "ar" | "en") {
    if (eliteSwitchBusy) return;

    if (target === activeCvLang && cvMatchesLanguage(cv, target)) {
      if (target === "ar") {
        const fixed = await ensureArabicPersonalName(cv);
        if (fixed.personal.name !== cv.personal.name) {
          try {
            window.localStorage.setItem(ELITE_CV_KEYS[target], JSON.stringify(fixed));
          } catch { /* ignore */ }
          setCv(fixed);
          showToast(isAr ? "تمت كتابة الاسم بالعربية" : "Name transliterated to Arabic");
        }
      }
      return;
    }

    try {
      window.localStorage.setItem(ELITE_CV_KEYS[activeCvLang], JSON.stringify(cv));
    } catch { /* ignore */ }

    let saved: CVData | null = null;
    try {
      const raw = window.localStorage.getItem(ELITE_CV_KEYS[target]);
      if (raw) saved = JSON.parse(raw) as CVData;
    } catch { /* ignore */ }

    if (saved && !cvMatchesLanguage(saved, target)) {
      try {
        window.localStorage.removeItem(ELITE_CV_KEYS[target]);
      } catch { /* ignore */ }
      saved = null;
    }

    if (saved && cvMatchesLanguage(saved, target)) {
      const ready = target === "ar" ? await ensureArabicPersonalName(saved) : saved;
      if (ready.personal.name !== saved.personal.name) {
        try {
          window.localStorage.setItem(ELITE_CV_KEYS[target], JSON.stringify(ready));
        } catch { /* ignore */ }
      }
      setCv({ ...INIT_CV, ...ready });
      setCvTemplate(DEFAULT_CV_TEMPLATE);
      resetStoredCvTemplate();
      setActiveCvLang(target);
      showToast(
        isAr
          ? `تم استيراد النسخة ${target === "ar" ? "العربية" : "الإنجليزية"}`
          : `Imported ${target === "ar" ? "Arabic" : "English"} version`,
      );
      return;
    }

    setEliteSwitchBusy(target);
    const tid = sonnerToast.loading(
      isAr
        ? `جاري ترجمة السيرة إلى ${target === "ar" ? "العربية" : "الإنجليزية"}...`
        : `Translating resume to ${target === "ar" ? "Arabic" : "English"}...`,
    );
    try {
      const result = await translateCvDetailed(cv, target);
      if (result.ok) {
        try {
          window.localStorage.setItem(ELITE_CV_KEYS[target], JSON.stringify(result.cv));
        } catch { /* ignore */ }
        setCv({ ...INIT_CV, ...result.cv });
        setCvTemplate(DEFAULT_CV_TEMPLATE);
        resetStoredCvTemplate();
        setActiveCvLang(target);
        showToast(isAr ? "تمت الترجمة بنجاح" : "Translated successfully");
      } else {
        showToast(result.error, "error");
      }
    } finally {
      sonnerToast.dismiss(tid);
      setEliteSwitchBusy(null);
    }
  }

  async function ensureOtherLangCv(): Promise<{ ok: true; cv: CVData } | { ok: false; error: string }> {
    let altCv = otherLangCv;
    if (altCv && cvMatchesLanguage(altCv, otherLang)) {
      return { ok: true, cv: altCv };
    }

    const result = await translateCvDetailed(cv, otherLang);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    altCv = result.cv;
    flushSync(() => setOtherLangCv(altCv));
    try {
      window.localStorage.setItem(ELITE_CV_KEYS[otherLang], JSON.stringify(altCv));
    } catch { /* ignore */ }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    return { ok: true, cv: altCv };
  }

  function requestExport() {
    track("download_attempted", { tier: userTier });
    if (!canExport) {
      openUpgradeModal();
      return;
    }

    if (isElite && !hasViewedBothEliteLangs) {
      setShowExportLangWarning(true);
      return;
    }

    setShowExportConfirm(true);
  }

  async function viewOtherLangBeforeExport() {
    setShowExportLangWarning(false);
    if (isMobile) setMobileTab("preview");
    await switchEliteCvLang(missingExportLang);
  }

  function proceedExportAfterWarning() {
    setShowExportLangWarning(false);
    setShowExportConfirm(true);
  }

  // ── PDF Export (ATS text layer — real selectable text, not images) ───────
  async function exportPDF() {
    if (!canExport) { openUpgradeModal(); return; }
    setExportingPdf(true);
    track("pdf_exported");
    try {
      const baseName = cv.personal.name ? cv.personal.name.replace(/\s+/g, "-").toLowerCase() : "resume";
      const exportedFiles: { filename: string; blob: Blob }[] = [];

      let altCv: CVData | null =
        isElite && otherLangCv && cvMatchesLanguage(otherLangCv, otherLang) ? otherLangCv : null;
      if (isElite && !altCv) {
        const prepared = await ensureOtherLangCv();
        if (prepared.ok) altCv = prepared.cv;
        else if (prepared.error) showToast(prepared.error, "error");
      }

      const pdfFiles = await exportResumePdfs({
        baseName,
        primaryCv: builderCvToExportCv(cv),
        primaryLang: activeCvLang,
        exportBoth: isElite && !!altCv,
        secondaryCv: altCv ? builderCvToExportCv(altCv) : undefined,
        secondaryLang: otherLang,
      });

      for (const file of pdfFiles) {
        exportedFiles.push({ filename: file.filename, blob: file.blob });
      }

      await emailCvCopy(exportedFiles);

      for (const file of exportedFiles) {
        downloadBlob(file.blob, file.filename);
      }

      if (isElite && altCv) {
        showToast(
          isAr
            ? "✓ تم تصدير النسختين PDF (متوافق ATS) — شكراً لاستخدامك نشمي"
            : "✓ Both ATS-friendly PDFs exported — thank you for using Nashmi",
        );
      } else if (isElite && !altCv) {
        showToast(
          isAr
            ? "✓ تم تصدير النسخة الحالية — تعذّرت ترجمة النسخة الثانية"
            : "✓ Current version exported — second version translation failed",
          "error",
        );
      } else {
        showToast(
          isAr
            ? "✓ PDF متوافق مع ATS — تم التصدير بنجاح"
            : "✓ ATS-friendly PDF exported successfully",
        );
      }

      const purchaseToken = getPurchaseToken();
      const sessionId = getCvSessionId();
      if (purchaseToken && sessionId) {
        try {
          await fetch("/api/purchase?action=consume", {
            method: "POST",
            headers: {
              "x-nashmi-purchase-token": purchaseToken,
              "x-nashmi-session-id": sessionId,
            },
          });
        } catch { /* ignore */ }
      }

      // Paid users: CV goes to email only; keep their export review, wipe everything else.
      wipeAllClientCvData();
      setCv({ ...INIT_CV });
      setCvTemplate(DEFAULT_CV_TEMPLATE);
      resetStoredCvTemplate();
      setActiveSection(0);
      setActivePanel(null);
      setStartMode("choose");
      setCopilotHistory([
        { role: "assistant", content: isAr ? "مرحباً! أنا مساعدك الذكي. كيف يمكنني تحسين سيرتك؟" : "Hi! I'm your AI assistant. How can I improve your resume?" },
      ]);
      setCurrentPlan("starter");

      setTimeout(() => onNav("landing"), 1200);
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
  const MOBILE_SECTION_IDS = ["personal", "summary", "experience-0", "education-0", "certifications", "skills", "languages"] as const;
  const MOBILE_TAB_LABELS = isAr
    ? { preview: "معاينة", sections: "الأقسام", copilot: "المساعد الذكي", export: "تصدير" }
    : { preview: "Preview", sections: "Sections", copilot: "AI Assistant", export: "Export" };

  const desktopPreviewMaxW = Math.round(CV_PAPER_WIDTH * previewScale);

  // ── UI helpers ─────────────────────────────────────────────────────────
  const AIBtn = ({ section, text, full = false }: { section: string; text: string; full?: boolean }) => (
    <button
      onClick={() => aiImprove(section, text)}
      disabled={!!aiLoading}
      style={{ background: aiLoading === section ? `${P.violet}44` : isPaid ? `${P.violet}22` : P.surface, border: `1px solid ${isPaid ? `${P.violet}44` : P.border}`, color: isPaid ? P.violetLight : P.muted, borderRadius: 8, padding: full ? "9px 16px" : "6px 12px", cursor: aiLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, display: "flex", alignItems: "center", gap: 6, width: full ? "100%" : "auto", justifyContent: "center", transition: "background 0.2s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.background = `${P.violet}38`; }}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = aiLoading === section ? `${P.violet}44` : isPaid ? `${P.violet}22` : P.surface}
    >
      {aiLoading === section ? "⏳" : isPaid ? "✦" : "🔒"} {aiLoading === section ? (isAr ? "جارٍ..." : "Working...") : (isAr ? "تحسين AI" : "AI Improve")}
    </button>
  );

  // ── Shared field renderers (used by sidebar accordion AND click-to-edit panels) ──
  const renderPersonalFields = () => (
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

  const renderSummaryFields = () => (
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

  const renderExpItem = (i: number) => {
    const e = cv.experience[i];
    if (!e) return null;
    return (
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
    );
  };

  const renderAddExpBtn = (onAdded?: (newIndex: number) => void) => (
    <button onClick={() => { const newIndex = cv.experience.length; setCv(prev => ({ ...prev, experience: [...prev.experience, { company:"", role:"", from:"", to:"", desc:"" }] })); onAdded?.(newIndex); }} style={{ width: "100%", background: "transparent", border: `1px dashed ${P.border}`, color: P.muted, borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 13, fontFamily: ff, transition: "border-color 0.2s, color 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.violet; (e.currentTarget as HTMLButtonElement).style.color=P.violetLight; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.border; (e.currentTarget as HTMLButtonElement).style.color=P.muted; }}
    >{t.addItem} {isAr ? "خبرة" : "Experience"}</button>
  );

  const renderEduItem = (i: number) => {
    const e = cv.education[i];
    if (!e) return null;
    return (
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
    );
  };

  const renderAddEduBtn = (onAdded?: (newIndex: number) => void) => (
    <button onClick={() => { const newIndex = cv.education.length; setCv(prev => ({ ...prev, education: [...prev.education, { school:"", degree:"", field:"", from:"", to:"", gpa:"", gpaScale:"5", honors:"", showGpa:false }] })); onAdded?.(newIndex); }} style={{ width: "100%", background: "transparent", border: `1px dashed ${P.border}`, color: P.muted, borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 13, fontFamily: ff }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.violet; (e.currentTarget as HTMLButtonElement).style.color=P.violetLight; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=P.border; (e.currentTarget as HTMLButtonElement).style.color=P.muted; }}
    >{t.addItem} {isAr ? "تعليم" : "Education"}</button>
  );

  const renderCertFields = () => (
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

  const renderSkillsFields = () => (
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

  const renderLanguagesFields = () => (
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

  // ── Form panel (sidebar accordion) ─────────────────────────────────────
  const renderFormSection = () => {
    switch (activeSection) {
      case 0: return renderPersonalFields();
      case 1: return renderSummaryFields();
      case 2: return <div>{cv.experience.map((_, i) => renderExpItem(i))}{renderAddExpBtn()}</div>;
      case 3: return <div>{cv.education.map((_, i) => renderEduItem(i))}{renderAddEduBtn()}</div>;
      case 4: return renderCertFields();
      case 5: return renderSkillsFields();
      case 6: return renderLanguagesFields();
    }
  };

  // ── Click-to-edit panel: title + content per panel key ─────────────────
  const panelTitle = (panel: string): string => {
    if (panel === "personal") return SECTIONS[0];
    if (panel === "summary") return SECTIONS[1];
    if (panel.startsWith("experience-")) return `${SECTIONS[2]} ${Number(panel.slice("experience-".length)) + 1}`;
    if (panel.startsWith("education-")) return `${SECTIONS[3]} ${Number(panel.slice("education-".length)) + 1}`;
    if (panel === "certifications") return SECTIONS[4];
    if (panel === "skills") return SECTIONS[5];
    return SECTIONS[6];
  };

  const renderPanelContent = (panel: string) => {
    if (panel === "personal") return renderPersonalFields();
    if (panel === "summary") return renderSummaryFields();
    if (panel.startsWith("experience-")) {
      const i = Math.min(Number(panel.slice("experience-".length)) || 0, cv.experience.length - 1);
      return <div>{renderExpItem(i)}{renderAddExpBtn(n => setActivePanel(`experience-${n}`))}</div>;
    }
    if (panel.startsWith("education-")) {
      const i = Math.min(Number(panel.slice("education-".length)) || 0, cv.education.length - 1);
      return <div>{renderEduItem(i)}{renderAddEduBtn(n => setActivePanel(`education-${n}`))}</div>;
    }
    if (panel === "certifications") return renderCertFields();
    if (panel === "skills") return renderSkillsFields();
    return renderLanguagesFields();
  };

  // Free-tier watermark grid overlaid on the on-screen preview (both edit modes)
  const renderWatermarkGrid = () => (
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
  );

  const handleSectionSelect = useCallback((id: string) => {
    if (isMobile && mobileTourStep !== null) {
      try { sessionStorage.setItem(MOBILE_TOUR_STORAGE_KEY, "1"); } catch { /* ignore */ }
      setMobileTourStep(null);
    }
    if (!isMobile && editMode === "sidebar") {
      let sectionIdx: Section = 0;
      if (id === "personal") sectionIdx = 0;
      else if (id === "summary") sectionIdx = 1;
      else if (id.startsWith("experience")) sectionIdx = 2;
      else if (id.startsWith("education")) sectionIdx = 3;
      else if (id === "certifications") sectionIdx = 4;
      else if (id === "skills") sectionIdx = 5;
      else if (id === "languages") sectionIdx = 6;
      else return;
      setActiveSection(sectionIdx);
      return;
    }
    if (isMobile) setMobileTab("preview");
    setActivePanel(id);
  }, [isMobile, editMode, mobileTourStep]);

  const renderScaledCvPreview = (interactive: boolean) => {
    const scaledW = Math.round(CV_PAPER_WIDTH * previewScale);
    const scaledH = Math.round(scaledCvHeight * previewScale);
    const paperStyle: React.CSSProperties = {
      width: CV_PAPER_WIDTH,
      transform: `scale(${previewScale})`,
      transformOrigin: isMobile ? "top center" : "top left",
    };
    const inner = interactive ? (
      <EditableCVPreview
        cv={cv}
        cvIsAr={activeCvLang === "ar"}
        activePanel={activePanel}
        onSelect={handleSectionSelect}
        templateId={cvTemplate}
      />
    ) : (
      <CVPreview cv={cv} lang={lang} cvLanguage={activeCvLang} userTier={userTier} templateId={cvTemplate} />
    );
    return (
      <div className="cv-preview-stage" data-tour="cv-preview">
        <div
          className={`cv-preview-scaler-wrap${isMobile ? " is-mobile-a4-scale" : ""}`}
          style={isMobile ? { width: "100%", height: scaledH } : { width: scaledW, height: scaledH }}
        >
          <div
            className={`cv-preview-scaler-clip${isMobile ? " is-mobile-a4-scale" : ""}`}
            style={
              isMobile
                ? { width: scaledW, height: scaledH }
                : { width: scaledW, height: scaledH, overflow: "hidden" }
            }
          >
            <div
              ref={scaledCvRef}
              className={`cv-preview-paper-inner${isMobile ? " is-mobile-a4-scale" : ""}`}
              style={paperStyle}
            >
              {inner}
              {!isPaid && renderWatermarkGrid()}
            </div>
          </div>
        </div>
        {interactive && isMobile && !activePanel && mobileTourStep === null && (
          <div className="cv-tap-hint">
            <span style={{ fontSize: 22 }}>👆</span>
            <span>{isAr ? "انقر على أي قسم للتعديل" : "Tap any section to edit"}</span>
          </div>
        )}
      </div>
    );
  };

  // ── Start-choice screen (before builder) ──────────────────────────────
  if (startMode === "choose") {
    return (
      <div style={{ minHeight: "100vh", background: P.bg, direction: isAr ? "rtl" : "ltr", fontFamily: ff, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* hidden inputs so refs work */}
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.json,application/json,image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}/>
        <input ref={jsonImportRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ""; }}/>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", boxShadow: `0 6px 24px ${P.violet}44` }}>N</div>
          <span style={{ color: P.text, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>{t.brand}</span>
        </div>

        <h1 style={{ color: P.text, fontSize: 28, fontWeight: 900, marginBottom: 10, textAlign: "center", letterSpacing: "-0.02em" }}>
          {isAr ? "كيف تريد البدء؟" : "How would you like to start?"}
        </h1>
        <p style={{ color: P.muted, fontSize: 14, marginBottom: hasStoredDraft() ? 16 : 40, textAlign: "center" }}>
          {isAr ? "ابدأ سيرة جديدة من الصفر، أو استورد سيرتك الحالية" : "Start fresh or import your existing resume"}
        </p>

        {hasStoredDraft() && (
          <button
            onClick={continueDraft}
            style={{ width: "100%", maxWidth: 560, marginBottom: 24, background: P.card, border: `1.5px solid ${P.violet}44`, borderRadius: 14, padding: "16px 20px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = P.violet; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${P.violet}44`; }}
          >
            <div style={{ color: P.text, fontWeight: 800, fontSize: 15, marginBottom: 4, fontFamily: ff }}>
              {isAr ? "↩ متابعة المسودة المحفوظة" : "↩ Continue saved draft"}
            </div>
            <div style={{ color: P.muted, fontSize: 12 }}>
              {isAr ? "استئناف آخر سيرة كنت تعمل عليها" : "Pick up where you left off"}
            </div>
          </button>
        )}

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 560, width: "100%" }}>
          {/* New Resume */}
          <button
            onClick={startFreshResume}
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
              {importing ? (isAr ? "جارٍ التحليل…" : "Analysing…") : (isAr ? "استيراد PDF / صورة / JSON" : "Import PDF / Photo / JSON")}
            </div>
            <div style={{ color: P.muted, fontSize: 13, lineHeight: 1.5 }}>
              {isAr ? "PDF من نشمي (نص ATS)، صورة، TXT، أو JSON" : "Nashmi ATS PDF, photo, TXT, or JSON"}
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
      <style>{`
        .tb-row1 { display: flex; align-items: center; padding: 0 16px; gap: 10; height: 52px; background: ${P.surface}; border-bottom: 1px solid ${P.border}; }
        .tb-row2 { display: none; }
        .tb-ats  { display: flex; }
        .tb-jd   { display: flex; }
        @media (max-width: 768px) {
          .tb-row1 { height: 48px; }
          .tb-row2 { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${P.surface}; border-bottom: 1px solid ${P.border}; flex-wrap: wrap; }
          .tb-ats  { display: none; }
          .tb-jd   { display: none; }
          .tb-copilot-label { display: none; }
          .tb-copilot-btn { display: none !important; }
          .tb-export-btn { display: none !important; }
        }
        .builder-canvas,
        .builder-canvas-mobile,
        .builder-workspace {
          background: ${P.bg};
          background-image: none;
        }
      `}</style>

      {/* صف 1: شعار + رجوع + ATS + تصدير */}
      <div className="tb-row1" style={{ display: "flex", alignItems: "center", padding: "0 16px", gap: 10, height: 52, background: P.surface, borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
        <button onClick={() => onNav("landing")} style={{ background: "none", border: `1px solid ${P.border}`, color: P.muted, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontFamily: ff, whiteSpace: "nowrap", flexShrink: 0 }}>
          {isAr ? "→" : "←"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>N</div>
          <span style={{ color: P.text, fontWeight: 700, fontSize: 14 }}>{t.brand}</span>
        </div>

        <div style={{ flex: 1 }}/>

        {/* ATS — desktop only */}
        <div className="tb-ats" style={{ alignItems: "center", gap: 6, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 10px" }}>
          <span style={{ color: P.muted, fontSize: 11, whiteSpace: "nowrap" }}>{t.atsScore}</span>
          <span style={{ color: atsScore >= 80 ? P.green : atsScore >= 60 ? P.gold : P.red, fontWeight: 800, fontSize: 13 }}>{atsScore}%</span>
        </div>

        {/* JD Match — desktop only */}
        <button className="tb-jd" onClick={() => setShowATSMatch(true)} style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, whiteSpace: "nowrap" }}>
          {isAr ? "◈ مطابقة JD" : "◈ JD Match"}
        </button>

        {/* Edit mode toggle: click-on-CV canvas vs sidebar accordion (desktop only) */}
        <div className="tb-editmode" style={{ display: "flex", alignItems: "center", border: `1px solid ${P.border}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {([["canvas", isAr ? "✎ على السيرة" : "✎ Click-on-CV"], ["sidebar", isAr ? "☰ القائمة" : "☰ Sidebar"]] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => { setEditMode(mode); if (mode === "sidebar") setActivePanel(null); }}
              style={{ background: editMode === mode ? `${P.violet}33` : "transparent", border: "none", color: editMode === mode ? P.violetLight : P.muted, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: ff, whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Copilot */}
        <button className="tb-copilot-btn" onClick={() => { if (!requestCopilotAccess()) return; setShowCopilot(c => !c); }} style={{ background: showCopilot ? `${P.violet}33` : `${P.violet}18`, border: `1px solid ${P.violet}${showCopilot ? "66" : "33"}`, color: P.violetLight, borderRadius: 8, padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          {isPaid ? "✧" : "🔒"} <span className="tb-copilot-label">{t.aiCopilot}</span>
        </button>

        {/* Export */}
        <button className="tb-export-btn" onClick={requestExport} disabled={exportingPdf} style={{ background: canExport ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : P.surface, border: canExport ? "none" : `1px solid ${P.border}`, color: canExport ? "#fff" : P.muted, borderRadius: 8, padding: "7px 14px", cursor: exportingPdf ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, fontFamily: ff, display: "flex", alignItems: "center", gap: 5, boxShadow: canExport ? `0 4px 16px ${P.violet}44` : "none", whiteSpace: "nowrap", opacity: exportingPdf ? 0.75 : 1 }}>
          {exportingPdf ? "⏳" : canExport ? "⬇" : "🔒"} {exportingPdf ? (isAr ? "جارٍ..." : "…") : t.export}
        </button>
      </div>

      {/* صف 2: أدوات إضافية — جوال فقط */}
      <div className="tb-row2" style={{ display: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 10px" }}>
          <span style={{ color: P.muted, fontSize: 11 }}>{t.atsScore}</span>
          <span style={{ color: atsScore >= 80 ? P.green : atsScore >= 60 ? P.gold : P.red, fontWeight: 800, fontSize: 13 }}>{atsScore}%</span>
        </div>
        <button onClick={() => setShowATSMatch(true)} style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}44`, color: P.violetLight, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff, whiteSpace: "nowrap" }}>
          {isAr ? "◈ JD" : "◈ JD"}
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ background: P.card, border: `1px solid ${P.border}`, color: P.muted, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontFamily: ff, whiteSpace: "nowrap" }}>
          {importing ? "⏳" : "⬆"} PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.json,application/json,image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}/>
      </div>



      {importError && (
        <div style={{ background: `${P.red}1A`, borderBottom: `1px solid ${P.red}33`, color: P.red, padding: "8px 20px", fontSize: 13 }}>
          {importError} <button onClick={() => setImportError("")} style={{ background: "none", border: "none", color: P.red, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────── */}
      <style>{`
        .mobile-bottomnav { display: none; }
        .mobile-tab-view { display: none; }
        .cv-preview-stage {
          direction: ltr;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 12px 0 8px;
          flex: 1;
        }
        .cv-preview-scaler-wrap {
          overflow: hidden;
          border-radius: 2px;
          box-shadow: ${CANVAS.paperShadow};
          flex-shrink: 0;
        }
        .cv-preview-scaler-clip {
          overflow: hidden;
          position: relative;
        }
        .cv-preview-paper-inner.is-mobile-a4-scale {
          position: absolute;
          top: 0;
          left: 50%;
          margin-left: -${CV_PAPER_WIDTH / 2}px;
        }
        .cv-preview-paper-inner [data-cv-section] {
          touch-action: manipulation;
          -webkit-tap-highlight-color: rgba(124, 92, 255, 0.25);
        }
        @media (min-width: 769px) {
          .builder-preview {
            overflow-y: hidden !important;
            min-height: 0;
          }
          .builder-preview .cv-preview-stage {
            width: 100%;
            max-width: 100%;
            flex: 1;
            justify-content: center;
            min-height: 0;
          }
          .builder-preview .cv-preview-scaler-wrap {
            margin: 0 auto;
          }
        }
        .cv-tap-hint {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: ${P.surface};
          border: 1px solid ${P.border};
          border-radius: 999px;
          padding: 10px 16px;
          color: ${P.muted};
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        }
        @keyframes mobileTabIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sheetUpSmooth {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .builder-main { flex-direction: column !important; overflow: hidden !important; }
          .builder-sidebar { display: none !important; }
          .builder-preview {
            padding: 0 0 calc(68px + env(safe-area-inset-bottom)) !important;
            align-items: center !important;
            background: ${P.bg} !important;
          }
          .builder-preview .cv-preview-stage {
            width: 100%;
            max-width: 100%;
            padding: 4px 8px 8px;
            box-sizing: border-box;
          }
          .builder-preview .cv-preview-scaler-wrap.is-mobile-a4-scale {
            width: 100% !important;
            max-width: 100%;
            box-shadow: none;
            overflow: visible;
          }
          .builder-preview .cv-preview-scaler-clip.is-mobile-a4-scale {
            margin: 0 auto;
            box-shadow: ${CANVAS.paperShadow};
            border-radius: 2px;
          }
          .builder-topbar { flex-wrap: wrap; gap: 8px !important; height: auto !important; padding: 10px 12px !important; }
          .builder-topbar-btn { font-size: 11px !important; padding: 6px 8px !important; }
          .tb-editmode { display: none !important; }
          .tb-row1 { height: 46px !important; gap: 6px !important; padding: 0 10px !important; }
          .mobile-tab-view {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            animation: mobileTabIn 0.38s cubic-bezier(0.32, 0.72, 0, 1);
          }
          .mobile-bottomnav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            z-index: 2500;
            background: rgba(17, 17, 24, 0.97);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid ${P.border};
            box-shadow: 0 -4px 24px rgba(0,0,0,0.35);
            padding: 4px 6px calc(6px + env(safe-area-inset-bottom));
            gap: 2px;
          }
          .mobile-bottomnav.is-hidden { display: none !important; }
          .mobile-tab-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            border: none;
            border-radius: 12px;
            padding: 7px 2px;
            cursor: pointer;
            font-family: inherit;
            background: transparent;
            transition: background 0.25s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s ease;
            -webkit-tap-highlight-color: transparent;
          }
          .mobile-tab-btn:active { transform: scale(0.94); }
          .mobile-tab-btn.is-active { background: ${P.violet}28; }
          .mobile-tab-btn.is-tour-highlight {
            background: ${P.violet}40 !important;
            box-shadow: 0 0 0 2px ${P.violet}88;
          }
          .before-after-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
            z-index: 10000 !important;
          }
          .before-after-card {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 20px 20px 0 0 !important;
            max-height: 88vh !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 20px 16px calc(12px + env(safe-area-inset-bottom)) !important;
            animation: sheetUpSmooth 0.42s cubic-bezier(0.32, 0.72, 0, 1);
          }
          .before-after-grid {
            grid-template-columns: 1fr !important;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
          }
          .before-after-actions {
            flex-direction: column !important;
            gap: 8px !important;
            padding-top: 12px;
            flex-shrink: 0;
          }
          .before-after-actions button { width: 100% !important; }
          .editor-sheet-backdrop {
            position: fixed;
            inset: 0;
            z-index: 2999;
            background: rgba(10,10,11,0.55);
            backdrop-filter: blur(2px);
            animation: fadeIn 0.25s ease;
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .editor-panel-handle-zone {
            touch-action: none;
            cursor: grab;
            padding: 10px 0 4px;
            flex-shrink: 0;
          }
          .editor-panel-handle-zone:active { cursor: grabbing; }
          .editor-panel-handle {
            width: 40px;
            height: 4px;
            border-radius: 99px;
            background: ${P.borderLight};
            margin: 0 auto;
          }
        }
      `}</style>
      <style>{`
        .cv-canvas-inner { padding: 40px; }
        @media (max-width: 768px) {
          .cv-canvas-inner { padding: 28px !important; }
        }
      `}</style>
      <div className="builder-main" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Form sidebar — Accordion (fallback edit mode) */}
        {editMode === "sidebar" && (
        <div className="builder-sidebar" style={{ width: 300, background: P.surface, borderRight: isAr ? "none" : `1px solid ${P.border}`, borderLeft: isAr ? `1px solid ${P.border}` : "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {SECTIONS.map((label, i) => {
              const icons = ["👤","📝","💼","🎓","🏅","📁","⚡","🌐"];
              const isOpen = activeSection === i;
              return (
                <div key={i} style={{ borderBottom: `1px solid ${P.border}` }}>
                  {/* Accordion header */}
                  <button
                    onClick={() => setActiveSection(isOpen ? -1 as Section : i as Section)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      justifyContent: "space-between", padding: "14px 16px",
                      background: isOpen ? `${P.violet}18` : "transparent",
                      border: "none", cursor: "pointer", direction: isAr ? "rtl" : "ltr",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{icons[i]}</span>
                      <span style={{ color: isOpen ? P.violetLight : P.text, fontSize: 14, fontWeight: isOpen ? 700 : 500, fontFamily: ff }}>
                        {label}
                      </span>
                    </div>
                    <span style={{ color: isOpen ? P.violetLight : P.muted, fontSize: 18, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", lineHeight: 1 }}>
                      ‹
                    </span>
                  </button>
                  {/* Accordion content */}
                  {isOpen && (
                    <div style={{ padding: "16px 14px", background: P.bg }}>
                      {renderFormSection()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* CV Preview — desktop always; mobile only on Preview tab */}
        {(!isMobile || mobileTab === "preview") && (
        <div ref={previewAreaRef} className="builder-preview builder-workspace" style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {!isMobile && (
            <div style={{ width: "100%", maxWidth: desktopPreviewMaxW }}>
            <EliteImportFeature
              userSubscriptionTier={currentPlan}
              uiLang={isAr ? "ar" : "en"}
              currentResumeData={cv}
              activeLang={activeCvLang}
              onSwitchLang={switchEliteCvLang}
              busy={eliteSwitchBusy}
            />
            </div>
          )}
          {!isMobile && (
            <div style={{ width: "100%", maxWidth: desktopPreviewMaxW }}>
            <TemplatePicker isAr={isAr} value={cvTemplate} onChange={setCvTemplate} variant="desktop" />
            </div>
          )}
          {isPaid && !isMobile && (
            <div style={{ width: "100%", maxWidth: desktopPreviewMaxW, background: `${P.green}12`, border: `1px solid ${P.green}33`, borderRadius: 10, padding: "8px 14px", marginBottom: 12, fontSize: 12, color: P.green }}>
              {isAr
                ? "✓ جلسة مدفوعة — بناء وتصدير سيرة واحدة. بعد التصدير تنتهي الجلسة."
                : "✓ Paid session — build and export one resume. Session ends after export."}
            </div>
          )}
          {!isPaid && !isMobile && (
            <div style={{ width: "100%", maxWidth: desktopPreviewMaxW, background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: P.gold, fontWeight: 700, fontSize: 13 }}>🔒 {isAr ? "الباقة المجانية — المعاينة كاملة" : "Free Plan — Full Preview"}</span>
                <span style={{ color: P.muted, fontSize: 12, marginLeft: isAr ? 0 : 8, marginRight: isAr ? 8 : 0 }}>  {isAr ? "· AI والتصدير للباقات المدفوعة" : "· AI & export on paid plans"}</span>
              </div>
              <button onClick={openUpgradeModal} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: ff }}>
                {isAr ? "ترقية" : "Upgrade"}
              </button>
            </div>
          )}
          {isMobile && (
            <div style={{ width: "100%", maxWidth: Math.round(CV_PAPER_WIDTH * previewScale), marginBottom: 10, padding: "0 4px", boxSizing: "border-box" }}>
              <TemplatePicker isAr={isAr} value={cvTemplate} onChange={setCvTemplate} variant="mobile" />
            </div>
          )}
          {isMobile && isElite && (
            <div style={{ width: "100%", maxWidth: 794, marginBottom: 12, padding: "0 12px", boxSizing: "border-box" }}>
              <EliteImportFeature
                userSubscriptionTier={currentPlan}
                uiLang={isAr ? "ar" : "en"}
                currentResumeData={cv}
                activeLang={activeCvLang}
                onSwitchLang={switchEliteCvLang}
                busy={eliteSwitchBusy}
              />
            </div>
          )}
          {renderScaledCvPreview(true)}
          {isMobile && startMode === "ready" && (
            <div
              aria-hidden
              style={{
                position: "fixed",
                bottom: "calc(72px + env(safe-area-inset-bottom))",
                right: 8,
                zIndex: 2400,
                fontSize: 9,
                color: P.muted,
                opacity: 0.55,
                fontFamily: FF,
                pointerEvents: "none",
              }}
            >
              v{NASHMI_BUILD_ID}
            </div>
          )}

        </div>
        )}

        {isElite && (
          <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: -10000, width: 794, pointerEvents: "none", opacity: 0 }}>
            <div ref={hiddenCvPreviewRef} style={{ width: 794 }}>
              <CVPreview cv={otherLangCv || cv} lang={lang} cvLanguage={otherLang} userTier={userTier} templateId={cvTemplate}/>
            </div>
          </div>
        )}

        {/* Mobile: Sections tab */}
        {isMobile && mobileTab === "sections" && (
          <div key="sections" className="mobile-tab-view builder-workspace" style={{ padding: "16px 14px calc(80px + env(safe-area-inset-bottom))", overflowY: "auto" }}>
            <h2 style={{ color: P.text, fontSize: 17, fontWeight: 800, margin: "0 0 14px", fontFamily: ff }}>
              {isAr ? "اختر قسم للتعديل" : "Choose a section to edit"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {MOBILE_SECTION_IDS.map((id, i) => {
                const icons = ["👤", "📝", "💼", "🎓", "🏅", "⚡", "🌐"];
                return (
                  <button
                    key={id}
                    onClick={() => setActivePanel(id)}
                    style={{
                      background: P.card,
                      border: `1px solid ${P.border}`,
                      borderRadius: 14,
                      padding: "16px 12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: ff,
                      transition: "transform 0.2s ease, border-color 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{icons[i]}</span>
                    <span style={{ color: P.text, fontSize: 13, fontWeight: 700 }}>{SECTIONS[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isMobile && mobileTab === "export" && (
          <div key="export" className="mobile-tab-view builder-workspace" style={{ padding: "24px 16px calc(80px + env(safe-area-inset-bottom))", overflowY: "auto", alignItems: "center" }}>
            <div style={{ width: "100%", maxWidth: 360, background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{canExport ? "⬇" : "🔒"}</div>
              <h2 style={{ color: P.text, fontSize: 18, fontWeight: 800, marginBottom: 8, fontFamily: ff }}>{t.export}</h2>
              <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                {canExport
                  ? (isAr ? "حمّل سيرتك بصيغة PDF عالية الجودة." : "Download your resume as a high-quality PDF.")
                  : (isAr ? "التصدير متاح للباقات المدفوعة فقط." : "Export is available on paid plans only.")}
              </p>
              <button
                onClick={requestExport}
                disabled={exportingPdf}
                style={{ width: "100%", background: canExport ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : P.surface, border: canExport ? "none" : `1px solid ${P.border}`, color: canExport ? "#fff" : P.muted, borderRadius: 12, padding: "12px 20px", cursor: exportingPdf ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800, fontFamily: ff }}
              >
                {exportingPdf ? (isAr ? "جارٍ التصدير…" : "Exporting…") : (canExport ? (isAr ? "تحميل PDF" : "Download PDF") : (isAr ? "ترقية للتصدير" : "Upgrade to Export"))}
              </button>
              {!canExport && (
                <button onClick={openUpgradeModal} style={{ marginTop: 10, background: "none", border: "none", color: P.violetLight, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: ff }}>
                  {isAr ? "عرض الباقات" : "View plans"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile: AI Copilot tab */}
        {isMobile && mobileTab === "copilot" && isPaid && (
          <div key="copilot" className="mobile-tab-view builder-workspace" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${P.border}`, background: P.surface }}>
              <span style={{ color: P.text, fontWeight: 800, fontSize: 16 }}>✧ {t.copilotTitle}</span>
            </div>
            {renderCopilotPanel(true, false)}
          </div>
        )}


        {/* Copilot panel — desktop only */}
        {showCopilot && !isMobile && isPaid && renderCopilotPanel(false, false)}

        {/* Mobile PDF export source — always mounted */}
        {isMobile && (
          <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: -10000, width: 794, pointerEvents: "none", opacity: 0 }}>
            <div ref={cvPreviewRef} style={{ width: 794 }}>
              <CVPreview cv={cv} lang={lang} cvLanguage={activeCvLang} userTier={userTier} templateId={cvTemplate}/>
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
        <div className="before-after-overlay" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,10,11,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="before-after-card" style={{ width: "100%", maxWidth: 680, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexShrink: 0 }}>
              <h3 style={{ color: P.text, fontWeight: 800, fontSize: 18, fontFamily: ff }}>
                ✦ {isAr ? "اختر النص المناسب" : "Choose the Version You Want"}
              </h3>
              <button onClick={() => setBeforeAfter(null)} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            <div className="before-after-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ color: P.red, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>✕ {isAr ? "النص الحالي" : "Current Text"}</div>
                <div style={{ background: P.surface, border: `1px solid ${P.red}33`, borderRadius: 10, padding: "12px 14px", color: P.muted, fontSize: 13, lineHeight: 1.7, minHeight: 80, direction: isAr ? "rtl" : "ltr" }}>
                  {beforeAfter.before}
                </div>
              </div>
              <div>
                <div style={{ color: P.green, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>✦ {isAr ? "تحسين AI" : "AI Improvement"}</div>
                <div style={{ background: P.surface, border: `1px solid ${P.green}33`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 13, lineHeight: 1.7, minHeight: 80, direction: isAr ? "rtl" : "ltr" }}>
                  {beforeAfter.after}
                </div>
              </div>
            </div>

            <div className="before-after-actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setBeforeAfter(null)} style={{ background: "transparent", border: `1px solid ${P.border}`, color: P.muted, borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontFamily: ff }}>
                {isAr ? "استخدام النص الحالي" : "Use Current Text"}
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
                ✓ {isAr ? "استخدام تحسين AI" : "Use AI Improvement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade modal ───────────────────────────────────── */}
      {showUpgrade && (
        <div style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(10,10,11,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 520, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "32px 28px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setShowUpgrade(false)} style={{ position: "absolute", top: 20, [isAr ? "left" : "right"]: 20, background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 20 }}>×</button>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h3 style={{ color: P.text, fontSize: 22, fontWeight: 900, fontFamily: ff, marginBottom: 10 }}>{isAr ? "قم بالترقية للمتابعة" : "Upgrade to Continue"}</h3>
              <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.7 }}>
                {isAr ? "تحسين AI والمساعد الذكي والتصدير متاحان للباقات المدفوعة فقط. اختر باقتك للمتابعة." : "AI Improve, AI assistant, and export are available on paid plans only. Choose a plan to continue."}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              {([
                { tier: "premium" as const, name: t.plans[1].name, price: t.plans[1].price, cur: t.plans[1].cur, cta: t.plans[1].cta, url: SALLA_PREMIUM_URL },
                { tier: "elite" as const, name: t.plans[2].name, price: t.plans[2].price, cur: t.plans[2].cur, cta: t.plans[2].cta, url: SALLA_ELITE_URL },
              ]).map(p => (
                <div key={p.tier} style={{ background: P.surface, border: `1px solid ${p.tier === "elite" ? P.violet : P.border}`, borderRadius: 14, padding: "14px 14px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: P.text }}>{p.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: p.tier === "elite" ? P.violetLight : P.text }}>
                      {p.price} <span style={{ fontSize: 12, fontWeight: 600 }}>{p.cur}</span>
                    </div>
                  </div>
                  <PlanActivationPanel
                    plan={p.tier}
                    sallaUrl={p.url}
                    ctaLabel={p.cta}
                    isAr={isAr}
                    highlight={p.tier === "elite"}
                    compact
                    onBeforeSalla={() => {
                      try { window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(cv)); } catch { /* ignore */ }
                    }}
                    onActivated={tier => {
                      setCurrentPlan(tier);
                      onPlanActivated?.(tier);
                      setShowUpgrade(false);
                    }}
                  />
                </div>
              ))}
            </div>
            <button onClick={() => setShowUpgrade(false)} style={{ width: "100%", background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 13, padding: "8px 0", fontFamily: ff }}>
              {isAr ? "البقاء على المعاينة المجانية" : "Stay on free preview"}
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar: Preview | Sections | AI ── */}
      <div className={`mobile-bottomnav${beforeAfter || (isMobile && activePanel) ? " is-hidden" : ""}`} style={{ direction: isAr ? "rtl" : "ltr", fontFamily: ff }}>
        {([
          { id: "preview" as const, icon: "📄", label: MOBILE_TAB_LABELS.preview, tour: null },
          { id: "sections" as const, icon: "✎", label: MOBILE_TAB_LABELS.sections, tour: "tab-sections" as const },
          { id: "copilot" as const, icon: "✧", label: MOBILE_TAB_LABELS.copilot, tour: "tab-copilot" as const },
          { id: "export" as const, icon: "⬇", label: MOBILE_TAB_LABELS.export, tour: "tab-export" as const },
        ]).map(tab => {
          const isActive = mobileTab === tab.id;
          const tourTarget = mobileTourStep !== null ? MOBILE_TOUR_STEPS[mobileTourStep]?.target : null;
          const tourHighlight = tab.tour && tourTarget === tab.tour;
          return (
            <button
              key={tab.id}
              data-tour={tab.tour ?? undefined}
              className={`mobile-tab-btn${isActive ? " is-active" : ""}${tourHighlight ? " is-tour-highlight" : ""}`}
              onClick={() => {
                if (mobileTourStep !== null) return;
                if (tab.id === "export") {
                  setMobileTab("export");
                  setActivePanel(null);
                  return;
                }
                if (tab.id === "copilot") {
                  if (!requestCopilotAccess()) return;
                }
                setMobileTab(tab.id);
                if (tab.id !== "sections") setActivePanel(null);
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, color: isActive ? P.violetLight : P.muted }}>
                {tab.id === "copilot" && !isPaid ? "🔒" : tab.icon}
              </span>
              <span style={{ color: isActive ? P.violetLight : P.muted, fontSize: 9.5, fontWeight: isActive ? 800 : 600, whiteSpace: "nowrap" }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {mobileTourStep !== null && (
        <MobileBuilderTutorial
          step={mobileTourStep}
          isAr={isAr}
          onNext={handleMobileTourNext}
          onPrev={handleMobileTourPrev}
          onClose={finishMobileTour}
          layoutKey={previewScale}
        />
      )}

      {/* ── Click-to-edit editor panel: bottom sheet (mobile) / side panel (desktop) ── */}
      {activePanel && isMobile && (
        <div className="editor-sheet-backdrop" onClick={() => setActivePanel(null)} aria-hidden="true" />
      )}

      {activePanel && (
        <>
          <style>{`
            @keyframes sheetUp { from { transform: translateY(100%); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
            @keyframes panelIn { from { transform: translateX(100%); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
            .editor-panel {
              position: fixed; z-index: 3000;
              display: flex; flex-direction: column;
              box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
            }
            @media (max-width: 767px) {
              .editor-panel {
                bottom: 0; left: 0; right: 0; width: 100%;
                max-height: 88vh;
                background: ${P.surface};
                border-radius: 20px 20px 0 0;
                border-top: 1px solid ${P.border};
                animation: sheetUp 0.42s cubic-bezier(0.32, 0.72, 0, 1);
                will-change: transform;
              }
            }
            @media (min-width: 768px) {
              .editor-panel {
                top: 52px; right: 0; width: 380px;
                height: calc(100vh - 52px);
                background: ${P.surface};
                border-left: 1px solid ${P.border};
                animation: panelIn 0.3s ease;
              }
              .editor-panel-handle-zone { display: none; }
            }
          `}</style>
          <div
            ref={editorPanelRef}
            className="editor-panel"
            style={{
              direction: isAr ? "rtl" : "ltr",
              fontFamily: ff,
              transform: isMobile && sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined,
              transition: isSheetDragging ? "none" : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <div
              className="editor-panel-handle-zone"
              onTouchStart={e => onSheetDragStart(e.touches[0].clientY)}
              onMouseDown={e => { e.preventDefault(); onSheetDragStart(e.clientY); }}
            >
              <div className="editor-panel-handle" />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 16px 14px", borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
              <span style={{ color: P.text, fontWeight: 800, fontSize: 15 }}>✎ {panelTitle(activePanel)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setActivePanel(null)} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: ff, boxShadow: `0 4px 16px ${P.violet}33` }}>
                  {isAr ? "حفظ" : "Save"}
                </button>
                <button onClick={() => setActivePanel(null)} aria-label={isAr ? "إغلاق" : "Close"} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", background: P.bg }}>
              {renderPanelContent(activePanel)}
              <div style={{ color: P.muted, fontSize: 11, textAlign: "center", marginTop: 10 }}>
                {isAr ? "يتم الحفظ تلقائياً أثناء الكتابة" : "Changes are saved automatically as you type"}
              </div>
            </div>
          </div>
        </>
      )}

      <ExportLangWarningModal
        lang={lang}
        open={showExportLangWarning}
        missingLang={missingExportLang}
        onClose={() => setShowExportLangWarning(false)}
        onViewOther={() => {
          void viewOtherLangBeforeExport();
        }}
        onContinue={proceedExportAfterWarning}
      />

      {/* ── Export confirmation + Nashmi rating ── */}
      <ExportConfirmModal
        lang={lang}
        open={showExportConfirm}
        defaultName={cv.personal?.name}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={() => {
          setShowExportConfirm(false);
          exportPDF();
        }}
      />

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
