import { P, FF } from "@/nashmi/lib/tokens";
import { PageShell } from "@/nashmi/components/PageShell";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  onLangToggle: () => void;
  page: string;
}

const POSTS = [
  {
    slug: "ats-guide-2025",
    title: { en: "The Complete ATS Resume Guide for 2025", ar: "الدليل الكامل لتجاوز أنظمة ATS في 2025" },
    excerpt: { en: "Everything you need to know about writing resumes that pass Applicant Tracking Systems in 2025.", ar: "كل ما تحتاج معرفته لكتابة سيرة ذاتية تتجاوز أنظمة الفرز الآلي في 2025." },
    date: { en: "Dec 2024", ar: "ديسمبر 2024" },
    readTime: { en: "8 min read", ar: "8 دقائق قراءة" },
    tag: { en: "ATS", ar: "ATS" },
    color: "#7C5CFF",
  },
  {
    slug: "arabic-resume-tips",
    title: { en: "Writing an Arabic CV That Gets Noticed", ar: "كيف تكتب سيرة ذاتية عربية تلفت الانتباه" },
    excerpt: { en: "A step-by-step guide to crafting a professional Arabic resume that stands out to Saudi and GCC employers.", ar: "دليل خطوة بخطوة لصياغة سيرة ذاتية عربية احترافية تلفت انتباه أصحاب العمل في السعودية ودول الخليج." },
    date: { en: "Nov 2024", ar: "نوفمبر 2024" },
    readTime: { en: "6 min read", ar: "6 دقائق قراءة" },
    tag: { en: "Arabic", ar: "عربي" },
    color: "#22C55E",
  },
  {
    slug: "ai-resume-writing",
    title: { en: "How AI Is Transforming Resume Writing in 2025", ar: "كيف يغيّر الذكاء الاصطناعي كتابة السير الذاتية في 2025" },
    excerpt: { en: "AI tools are revolutionizing the way professionals write, optimize, and tailor their resumes for specific roles.", ar: "أدوات الذكاء الاصطناعي تُحدث ثورة في الطريقة التي يكتب بها المحترفون سيرهم الذاتية ويُحسّنونها." },
    date: { en: "Oct 2024", ar: "أكتوبر 2024" },
    readTime: { en: "10 min read", ar: "10 دقائق قراءة" },
    tag: { en: "AI", ar: "ذكاء اصطناعي" },
    color: "#E8B84B",
  },
  {
    slug: "quantify-achievements",
    title: { en: "How to Quantify Your Achievements (With Examples)", ar: "كيف تُحوّل إنجازاتك إلى أرقام (مع أمثلة)" },
    excerpt: { en: "Recruiters want numbers. Here's how to turn your work experience into measurable, compelling bullet points.", ar: "المسؤولون عن التوظيف يريدون أرقاماً. تعلّم كيف تحوّل خبراتك إلى نقاط قابلة للقياس ومقنعة." },
    date: { en: "Sep 2024", ar: "سبتمبر 2024" },
    readTime: { en: "7 min read", ar: "7 دقائق قراءة" },
    tag: { en: "Tips", ar: "نصائح" },
    color: "#60A5FA",
  },
  {
    slug: "linkedin-vs-resume",
    title: { en: "LinkedIn vs Resume: What's the Difference?", ar: "لينكدإن مقابل السيرة الذاتية: ما الفرق؟" },
    excerpt: { en: "Your LinkedIn profile and resume serve different purposes. Here's how to optimize both for maximum impact.", ar: "ملفك على لينكدإن وسيرتك الذاتية يخدمان أغراضاً مختلفة. تعرّف على كيفية تحسين كليهما." },
    date: { en: "Aug 2024", ar: "أغسطس 2024" },
    readTime: { en: "5 min read", ar: "5 دقائق قراءة" },
    tag: { en: "Career", ar: "مسار مهني" },
    color: "#A78BFA",
  },
  {
    slug: "cover-letter-tips",
    title: { en: "Writing a Cover Letter That Gets Read (2025)", ar: "كتابة رسالة تغطية تُقرأ فعلاً في 2025" },
    excerpt: { en: "Most cover letters are ignored. Here's how to write one that makes hiring managers actually read your resume.", ar: "معظم رسائل التغطية يتم تجاهلها. تعرّف على كيفية كتابة رسالة تجعل مسؤولي التوظيف يقرؤون سيرتك." },
    date: { en: "Jul 2024", ar: "يوليو 2024" },
    readTime: { en: "6 min read", ar: "6 دقائق قراءة" },
    tag: { en: "Tips", ar: "نصائح" },
    color: "#F472B6",
  },
];

export function BlogPage({ lang, t, onNav, onLangToggle, page }: Props) {
  const isAr = lang === "ar";
  const ff = FF;

  return (
    <PageShell lang={lang} t={t} onNav={onNav} onLangToggle={onLangToggle} page={page}>
      <div style={{ paddingTop: 90, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px", direction: isAr ? "rtl" : "ltr" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}55`, color: P.violetLight, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20 }}>
                {isAr ? "المدونة" : "Blog"}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(26px,4.5vw,48px)", fontWeight: 900, color: P.text, fontFamily: ff, marginBottom: 14 }}>
              {isAr ? "مقالات ونصائح مهنية" : "Career Articles & Guides"}
            </h1>
            <p style={{ color: P.muted, fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
              {isAr ? "نصائح الخبراء لكتابة السير الذاتية، وتحسين ATS، وتطوير مسيرتك المهنية." : "Expert tips on resume writing, ATS optimization, and career advancement."}
            </p>
          </div>

          {/* Featured */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 22, overflow: "hidden", marginBottom: 32, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: "40px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ background: `${POSTS[0].color}1A`, color: POSTS[0].color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: `1px solid ${POSTS[0].color}33` }}>
                    {isAr ? "مميّز" : "Featured"} · {isAr ? POSTS[0].tag.ar : POSTS[0].tag.en}
                  </span>
                </div>
                <h2 style={{ color: P.text, fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, fontFamily: ff, lineHeight: 1.3, marginBottom: 14 }}>
                  {isAr ? POSTS[0].title.ar : POSTS[0].title.en}
                </h2>
                <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>
                  {isAr ? POSTS[0].excerpt.ar : POSTS[0].excerpt.en}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: ff }}>
                  {isAr ? "اقرأ المقال" : "Read Article"}
                </button>
                <span style={{ color: P.muted, fontSize: 12 }}>{isAr ? POSTS[0].readTime.ar : POSTS[0].readTime.en}</span>
              </div>
            </div>
            <div style={{ background: `linear-gradient(135deg, ${POSTS[0].color}18, ${P.surface})`, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
              <div style={{ fontSize: 80, opacity: 0.6 }}>📄</div>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {POSTS.slice(1).map((post, i) => (
              <article key={i} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, overflow: "hidden", cursor: "pointer", transition: "border-color 0.25s, transform 0.25s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=post.color; el.style.transform="translateY(-4px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=P.border; el.style.transform=""; }}
              >
                <div style={{ height: 120, background: `linear-gradient(135deg, ${post.color}15, ${P.surface})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 44, opacity: 0.5 }}>✦</div>
                </div>
                <div style={{ padding: "18px 18px 20px" }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ background: `${post.color}1A`, color: post.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, border: `1px solid ${post.color}33` }}>
                      {isAr ? post.tag.ar : post.tag.en}
                    </span>
                  </div>
                  <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, fontFamily: ff, lineHeight: 1.4, marginBottom: 8 }}>{isAr ? post.title.ar : post.title.en}</h3>
                  <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>{isAr ? post.excerpt.ar : post.excerpt.en}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: P.muted, fontSize: 11 }}>{isAr ? post.date.ar : post.date.en}</span>
                    <span style={{ color: P.muted, fontSize: 11 }}>{isAr ? post.readTime.ar : post.readTime.en}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter */}
          <div style={{ marginTop: 52, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "36px 32px", textAlign: "center" }}>
            <h3 style={{ color: P.text, fontSize: 22, fontWeight: 800, fontFamily: ff, marginBottom: 8 }}>
              {isAr ? "اشترك في نشرتنا المهنية" : "Subscribe to Career Insights"}
            </h3>
            <p style={{ color: P.muted, fontSize: 14, marginBottom: 22 }}>
              {isAr ? "نصائح مهنية مباشرة إلى بريدك." : "Career tips delivered to your inbox."}
            </p>
            <div style={{ display: "flex", gap: 12, maxWidth: 420, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
              <input placeholder={isAr ? "بريدك الإلكتروني" : "Your email address"} style={{ flex: 1, minWidth: 200, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 16px", color: P.text, fontSize: 14, outline: "none", fontFamily: ff }}
                onFocus={e => e.currentTarget.style.borderColor = P.violet}
                onBlur={e => e.currentTarget.style.borderColor = P.border}
              />
              <button style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: ff }}>
                {isAr ? "اشترك" : "Subscribe"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
