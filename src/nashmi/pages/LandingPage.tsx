import { useState, useEffect, useRef } from "react";
import { WHATSAPP_SALES_URL, SALLA_PREMIUM_URL, SALLA_ELITE_URL } from "@/nashmi/lib/constants";
import { PlanActivationPanel } from "@/nashmi/components/PlanActivationPanel";
import { P, FF } from "@/nashmi/lib/tokens";
import { VioletBadge } from "@/nashmi/components/VioletBadge";
import { ATSRing } from "@/nashmi/components/ATSRing";
import { PageShell } from "@/nashmi/components/PageShell";
import { track } from "@/nashmi/lib/analytics";
import type { TrLang, Translation } from "@/nashmi/lib/translations";
import { getReviews, loadReviews, subscribeToReviews, type UserReview } from "@/nashmi/lib/reviews";
import { ReviewsSection } from "@/nashmi/components/ReviewsSection";
import { extractTextFromFile, localParseCV, normalizeParsedCV, smartCategorize, isResumeJsonFile, parseResumeJsonFile, persistBilingualImport, describeImportError, isPdfFile } from "@/nashmi/lib/cv-parser";
import type { CVData } from "@/nashmi/lib/ats";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string, cv?: CVData) => void;
  onLangToggle: () => void;
  page: string;
  onPlanActivated?: (plan: string) => void;
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  return (
    <section id={id} ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)", transition: "opacity 0.7s ease, transform 0.7s ease" }}>
      {children}
    </section>
  );
}

export function LandingPage({ lang, t, onNav, onLangToggle, page, onPlanActivated }: Props) {
  const isAr = lang === "ar";
  const ff = FF;
  const [demoScore, setDemoScore] = useState(34);
  const [atsAnimated, setAtsAnimated] = useState(false);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [importingCv, setImportingCv] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserReviews(getReviews());
    void loadReviews().then(setUserReviews);
    return subscribeToReviews(() => {
      void loadReviews().then(setUserReviews);
    });
  }, []);

  // Client-side only import: read + parse the file in the browser, then open the builder pre-filled.
  async function handleHeroImport(file: File) {
    setImportingCv(true);
    track("pdf_imported", { source: "landing_hero" });
    try {
      if (isResumeJsonFile(file)) {
        const imported = await parseResumeJsonFile(file);
        persistBilingualImport(imported.bilingual);
        onNav("builder", smartCategorize(imported.cv));
        return;
      }

      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        throw new Error(isPdfFile(file) ? "PDF_IMAGE_ONLY" : "EMPTY_FILE");
      }
      const parsed = smartCategorize(normalizeParsedCV(localParseCV(text)));
      onNav("builder", parsed);
    } catch (err) {
      alert(isAr ? `فشل الاستيراد: ${describeImportError(err, isAr)}` : `Import failed: ${describeImportError(err, false)}`);
    } finally {
      setImportingCv(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setAtsAnimated(true);
      let current = 34;
      const target = 97;
      const step = () => {
        current = Math.min(current + Math.ceil((target - current) / 8) + 1, target);
        setDemoScore(current);
        if (current < target) setTimeout(step, 80);
      };
      setTimeout(step, 400);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const plans = t.plans;
  const ff2 = ff;

  return (
    <PageShell lang={lang} t={t} onNav={onNav} onLangToggle={onLangToggle} page={page}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(80px, 15vw, 120px)", paddingBottom: "clamp(40px, 8vw, 80px)", textAlign: "center", direction: isAr ? "rtl" : "ltr", position: "relative", overflow: "hidden" }}>
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${P.violet}18 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }}/>
        <div style={{ position: "absolute", top: "30%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${P.violetLight}10 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }}/>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: 20, animation: "fadeUp 0.6s ease both" }}>
            <VioletBadge>{isAr ? "مدعوم بالذكاء الاصطناعي · متوافق مع ATS" : "AI-Powered · ATS-Compatible"}</VioletBadge>
          </div>

          <h1 style={{ fontSize: "clamp(32px, 6vw, 68px)", fontWeight: 900, color: P.text, lineHeight: 1.1, marginBottom: 20, fontFamily: ff, animation: "fadeUp 0.6s ease 0.1s both" }}>
            {isAr ? (<>منصة <span style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>الذكاء الاصطناعي</span> لسيرتك الذاتية</>) : (<>Your <span style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI-Powered</span> Resume Builder</>)}
          </h1>

          <p style={{ fontSize: 18, color: P.textSub, lineHeight: 1.75, maxWidth: 660, margin: "0 auto 36px", fontFamily: ff, animation: "fadeUp 0.6s ease 0.2s both" }}>
            {t.heroBody}
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 16, animation: "fadeUp 0.6s ease 0.3s both" }}>
            <button onClick={() => { track("resume_created"); onNav("builder"); }} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "15px 32px", cursor: "pointer", fontSize: 16, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 32px ${P.violet}55`, transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform="translateY(-3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 10px 40px ${P.violet}66`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform=""; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 6px 32px ${P.violet}55`; }}
            >{t.cta}</button>
            <button onClick={() => importFileRef.current?.click()} disabled={importingCv} style={{ background: "transparent", border: `1px solid ${P.borderLight}`, color: P.text, borderRadius: 12, padding: "15px 32px", cursor: importingCv ? "wait" : "pointer", fontSize: 16, fontWeight: 600, fontFamily: ff, transition: "border-color 0.2s", display: "inline-flex", alignItems: "center", gap: 8, opacity: importingCv ? 0.7 : 1 }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = P.violet}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = P.borderLight}
            >
              <span aria-hidden="true">{importingCv ? "⏳" : "📄"}</span>
              {importingCv
                ? (isAr ? "جارٍ الاستيراد..." : "Importing...")
                : (isAr ? "استيراد سيرة (PDF / JSON)" : "Import CV (PDF / JSON)")}
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.json,application/json,image/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroImport(f); e.target.value = ""; }}
            />
          </div>
          <p style={{ color: P.muted, fontSize: 12, animation: "fadeUp 0.6s ease 0.35s both" }}>{t.ctaSub}</p>

          {/* ATS Demo Card */}
          <div style={{ marginTop: 60, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", animation: "fadeUp 0.6s ease 0.45s both" }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "24px 32px", display: "flex", alignItems: "center", gap: 24, maxWidth: 420, boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${P.violet}22`, animation: "glowPulse 3s ease infinite" }}>
              <ATSRing score={atsAnimated ? demoScore : 34} size={80}/>
              <div style={{ textAlign: isAr ? "right" : "left" }}>
                <div style={{ color: P.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{t.atsScore}</div>
                <div style={{ color: P.text, fontSize: 22, fontWeight: 800, fontFamily: ff }}>
                  {demoScore}% → {atsAnimated ? "97%" : "…"}
                </div>
                <div style={{ color: P.muted, fontSize: 12, marginTop: 4 }}>
                  {isAr ? "بعد تحسين AI ✦" : "After AI optimization ✦"}
                </div>
              </div>
            </div>

            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "24px 28px", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }}>
              {[
                { label: isAr ? "كلمات مفتاحية مفقودة" : "Missing keywords", val: isAr ? "محددة ومضافة" : "detected & added", color: P.green },
                { label: isAr ? "الملخص المهني" : "Professional summary", val: isAr ? "محسّن بالذكاء الاصطناعي" : "AI-enhanced", color: P.violet },
                { label: isAr ? "الإنجازات القابلة للقياس" : "Quantified achievements", val: isAr ? "3 نقاط مضافة" : "3 bullets added", color: P.gold },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ color: P.muted, fontSize: 12 }}>{item.label}</span>
                  <span style={{ color: item.color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>✓ {item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <Section id="features">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ marginBottom: 12 }}><VioletBadge>{isAr ? "المميزات" : "Features"}</VioletBadge></div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 900, color: P.text, fontFamily: ff, marginBottom: 14 }}>{t.featuresTitle}</h2>
            <p style={{ color: P.muted, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>{t.featuresSub}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {t.features.map((f, i) => (
              <div key={i} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: "28px 24px", transition: "border-color 0.25s, transform 0.25s", cursor: "default" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=P.violet; el.style.transform="translateY(-4px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=P.border; el.style.transform=""; }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${P.violet}1A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16, color: P.violetLight }}>{f.icon}</div>
                <h3 style={{ color: P.text, fontSize: 17, fontWeight: 700, fontFamily: ff, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ATS MATCH SCORE DEMO ──────────────────────────────── */}
      <Section>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", minHeight: 320}}>
            <div style={{ padding: "48px 40px", background: `linear-gradient(135deg, ${P.violet}14, transparent)`, borderRight: isAr ? "none" : `1px solid ${P.border}`, borderLeft: isAr ? `1px solid ${P.border}` : "none" }}>
              <div style={{ marginBottom: 12 }}><VioletBadge>{isAr ? "جديد" : "New"}</VioletBadge></div>
              <h2 style={{ color: P.text, fontSize: "clamp(20px,3vw,32px)", fontWeight: 900, fontFamily: ff, marginBottom: 14 }}>
                {isAr ? "مطابقة نشمي مع وصف الوظيفة" : "ATS Job Description Matching"}
              </h2>
              <p style={{ color: P.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 360, marginBottom: 24 }}>
                {isAr
                  ? "الصق وصف الوظيفة وانظر كيف تتطابق سيرتك الذاتية مع متطلباتها — مع الكلمات المفتاحية الناقصة."
                  : "Paste any job description and see exactly how well your resume matches — with missing keywords highlighted."}
              </p>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <ATSRing score={78} size={72}/>
                <div>
                  <div style={{ color: P.text, fontWeight: 700, fontSize: 18, fontFamily: ff }}>78% {isAr ? "تطابق" : "match"}</div>
                  <div style={{ color: P.muted, fontSize: 13 }}>{isAr ? "4 كلمات مفتاحية مفقودة" : "4 missing keywords"}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: "48px 40px" }}>
              <div style={{ marginBottom: 14, color: P.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {isAr ? "الكلمات المفتاحية المفقودة" : "Missing Keywords"}
              </div>
              {(isAr
                ? ["التعلم الآلي", "Python", "بنية البيانات", "SQL", "نموذج اللغة الكبير"]
                : ["Machine Learning", "Data Pipeline", "Model Training", "SQL", "LLM"]
              ).map((kw, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: P.red }}/>
                  <span style={{ color: P.text, fontSize: 14 }}>{kw}</span>
                  <span style={{ marginLeft: "auto", color: P.muted, fontSize: 11 }}>
                    {isAr ? "مفقود" : "missing"}
                  </span>
                </div>
              ))}
              <button onClick={() => onNav("builder")} style={{ marginTop: 20, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "11px 22px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: ff, boxShadow: `0 4px 20px ${P.violet}44` }}>
                {isAr ? "حسّن سيرتي الآن →" : "Improve Mine Now →"}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── BEFORE / AFTER ───────────────────────────────────── */}
      <Section>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ marginBottom: 12 }}><VioletBadge>{isAr ? "التحويل بالذكاء الاصطناعي" : "AI Transformation"}</VioletBadge></div>
            <h2 style={{ color: P.text, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 900, fontFamily: ff, marginBottom: 12 }}>
              {isAr ? "قبل وبعد تحسين AI" : "Before & After AI Improvement"}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {/* Before */}
            <div style={{ background: P.card, border: `1px solid ${P.red}44`, borderRadius: 16, padding: "24px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ color: P.red, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>✕ {isAr ? "قبل" : "Before"}</span>
                <ATSRing score={34} size={40}/>
              </div>
              <div style={{ background: P.surface, borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>
                  {isAr
                    ? "أعمل في مجال التقنية منذ سنوات. لديّ خبرة في تطوير البرامج وأعمل على بعض المشاريع. أحب العمل الجماعي."
                    : '"Worked in tech for a few years. Have experience with software. Did some projects. Good team player."'}
                </p>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(isAr ? ["غامض", "بدون أرقام", "لا كلمات مفتاحية"] : ["Vague", "No metrics", "No keywords"]).map(x => (
                  <span key={x} style={{ background: `${P.red}15`, color: P.red, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: `1px solid ${P.red}33` }}>✕ {x}</span>
                ))}
              </div>
            </div>
            {/* After */}
            <div style={{ background: P.card, border: `1px solid ${P.green}44`, borderRadius: 16, padding: "24px 22px", boxShadow: `0 0 30px ${P.green}10` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ color: P.green, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>✦ {isAr ? "بعد AI" : "After AI"}</span>
                <ATSRing score={97} size={40}/>
              </div>
              <div style={{ background: P.surface, borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ color: P.text, fontSize: 13, lineHeight: 1.7 }}>
                  {isAr
                    ? "مهندس برمجيات أول بخبرة 6 سنوات في تطوير تطبيقات الويب باستخدام React وNode.js وAWS. أدرت فريقاً من 7 مطورين وزادت سرعة التطبيق بنسبة 40%. تخرجت بمرتبة الشرف الأولى."
                    : '"Senior Software Engineer with 6+ years building scalable React/Node.js applications at Series B startups. Led a team of 7, reduced load time by 40%, and shipped features used by 500K+ users."'}
                </p>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(isAr ? ["أرقام واضحة", "كلمات مفتاحية", "قابل للقياس"] : ["Quantified", "Keywords", "Measurable"]).map(x => (
                  <span key={x} style={{ background: `${P.green}15`, color: P.green, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: `1px solid ${P.green}33` }}>✓ {x}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── TESTIMONIALS / تقييم أصدقاء نشمي ───────────────────── */}
      <Section id="testimonials">
        <ReviewsSection lang={lang} reviews={userReviews} />
      </Section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <Section id="pricing">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ marginBottom: 12 }}><VioletBadge>{isAr ? "الأسعار" : "Pricing"}</VioletBadge></div>
            <h2 style={{ color: P.text, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 900, fontFamily: ff, marginBottom: 12 }}>{t.pricingTitle}</h2>
            <p style={{ color: P.muted, fontSize: 15, maxWidth: 480, margin: "0 auto" }}>{t.pricingSub}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, alignItems: "start" }}>
            {plans.map((plan, i) => (
              <div key={i} style={{
                background: plan.highlight ? `linear-gradient(160deg, ${P.violet}1A, ${P.card} 60%)` : P.card,
                border: `1px solid ${plan.highlight ? P.violet : P.border}`,
                borderRadius: 20, padding: "28px 22px", position: "relative",
                boxShadow: plan.highlight ? `0 0 40px ${P.violet}2A, 0 16px 48px rgba(0,0,0,0.3)` : "0 4px 16px rgba(0,0,0,0.2)",
                transform: plan.highlight ? "translateY(-4px)" : "none",
              }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 99, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {isAr ? "★ الأكثر شعبية" : "★ Most Popular"}
                  </div>
                )}

                <div style={{ color: P.text, fontSize: 18, fontWeight: 800, fontFamily: ff2, marginBottom: 6 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  <span style={{ color: plan.highlight ? P.violetLight : P.text, fontSize: 36, fontWeight: 900 }}>{plan.price}</span>
                  {plan.cur && <span style={{ color: P.muted, fontSize: 14, fontWeight: 700 }}>{plan.cur}</span>}
                </div>
                <p style={{ color: P.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>{plan.desc}</p>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: f.included ? P.textSub : `${P.muted}88` }}>
                      <span style={{ flexShrink: 0, color: f.included ? P.green : P.muted, fontWeight: 700 }}>{f.included ? "✓" : "✕"}</span>
                      <span style={{ textDecoration: f.included ? "none" : "line-through", opacity: f.included ? 1 : 0.5 }}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                {(plan.tier === "premium" || plan.tier === "elite") ? (
                  <PlanActivationPanel
                    plan={plan.tier}
                    sallaUrl={plan.tier === "premium" ? SALLA_PREMIUM_URL : SALLA_ELITE_URL}
                    ctaLabel={plan.cta}
                    isAr={isAr}
                    highlight={plan.highlight}
                    onActivated={tier => {
                      onPlanActivated?.(tier);
                      void onNav("builder");
                    }}
                  />
                ) : (
                  <button onClick={() => {
                    if (plan.tier === "enterprise" || plan.ctaNav === "whatsapp") {
                      window.open(WHATSAPP_SALES_URL, "_blank", "noopener,noreferrer");
                      return;
                    }
                    if (plan.ctaNav === "builder") onNav("builder");
                  }} style={{
                    width: "100%", borderRadius: 12, padding: "12px 18px", cursor: "pointer",
                    fontSize: 15, fontWeight: 800, fontFamily: ff,
                    background: plan.highlight ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : "transparent",
                    border: plan.highlight ? "none" : `1px solid ${P.borderLight}`,
                    color: plan.highlight ? "#fff" : P.text,
                    boxShadow: plan.highlight ? `0 6px 24px ${P.violet}44` : "none",
                    transition: "opacity 0.2s, transform 0.2s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.88"; (e.currentTarget as HTMLButtonElement).style.transform="translateY(-1px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; (e.currentTarget as HTMLButtonElement).style.transform=""; }}
                  >{plan.cta}</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 22, color: P.muted, fontSize: 12 }}>
            {isAr ? "شراء من متجر سلة · كود تفعيل · جلسة سيرة واحدة لكل شراء" : "Buy on Salla · activation code · one resume session per purchase"}
          </div>
        </div>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <Section id="faq">
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ marginBottom: 12 }}><VioletBadge>FAQ</VioletBadge></div>
            <h2 style={{ color: P.text, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 900, fontFamily: ff }}>
              {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
            </h2>
          </div>
          {t.faq.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} ff={ff} isAr={isAr}/>
          ))}
        </div>
      </Section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <Section>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 80px", textAlign: "center", direction: isAr ? "rtl" : "ltr" }}>
          <div style={{ background: `linear-gradient(135deg, ${P.violet}22, ${P.card})`, border: `1px solid ${P.violet}44`, borderRadius: 24, padding: "52px 36px", boxShadow: `0 0 60px ${P.violet}1A` }}>
            <h2 style={{ color: P.text, fontSize: "clamp(22px,4vw,40px)", fontWeight: 900, fontFamily: ff, marginBottom: 14 }}>
              {isAr ? "ابدأ رحلتك المهنية اليوم" : "Start Your Career Journey Today"}
            </h2>
            <p style={{ color: P.muted, fontSize: 15, marginBottom: 28, lineHeight: 1.7, maxWidth: 500, margin: "0 auto 28px" }}>
              {isAr ? "أنشئ سيرة ذاتية احترافية متوافقة مع ATS في دقائق — مجاناً للمعاينة." : "Build a professional ATS-ready resume in minutes — preview free."}
            </p>
            <button onClick={() => onNav("builder")} style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 12, padding: "16px 36px", cursor: "pointer", fontSize: 17, fontWeight: 800, fontFamily: ff, boxShadow: `0 6px 32px ${P.violet}55`, transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform=""}
            >{t.cta}</button>
            <p style={{ color: P.muted, fontSize: 12, marginTop: 14 }}>{t.ctaSub}</p>
          </div>
        </div>
      </Section>
    </PageShell>
  );
}

function FAQItem({ q, a, ff, isAr }: { q: string; a: string; ff: string; isAr: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${P.border}`, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none", color: P.text, cursor: "pointer", padding: "18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontFamily: ff, fontSize: 15, fontWeight: 600, textAlign: isAr ? "right" : "left", transition: "color 0.2s" }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color=P.violetLight}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color=P.text}
      >
        <span>{q}</span>
        <span style={{ color: P.violet, fontSize: 20, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.75, paddingBottom: 16, paddingTop: 4, animation: "fadeUp 0.2s ease" }}>{a}</p>
      )}
    </div>
  );
}
