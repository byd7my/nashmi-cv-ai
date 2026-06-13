import { P, FF } from "@/nashmi/lib/tokens";
import { PageShell } from "@/nashmi/components/PageShell";
import { BlogArticleView } from "@/nashmi/components/BlogArticleView";
import { BLOG_POSTS, formatReadTime, getBlogPost, blogListHash, blogPostHash } from "@/nashmi/lib/blog";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  onLangToggle: () => void;
  page: string;
  blogSlug: string | null;
}

const PAGE_CSS = `
  .blog-page-inner { max-width: 1200px; margin: 0 auto; padding: 60px 24px; }
  .blog-featured { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .blog-featured-visual { min-height: 200px; }
  .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
  @media (max-width: 768px) {
    .blog-page-inner { padding: 28px 16px 40px; }
    .blog-header { margin-bottom: 32px !important; }
    .blog-header h1 { font-size: clamp(22px, 6vw, 32px) !important; }
    .blog-featured { grid-template-columns: 1fr !important; }
    .blog-featured-text { padding: 24px 20px !important; }
    .blog-featured-visual { min-height: 160px; }
    .blog-grid { grid-template-columns: 1fr; gap: 14px; }
    .blog-newsletter { padding: 24px 16px !important; margin-top: 32px !important; }
  }
`;

function openPost(slug: string) {
  window.location.hash = blogPostHash(slug);
}

function openBlogList() {
  window.location.hash = blogListHash();
}

export function BlogPage({ lang, t, onNav, onLangToggle, page, blogSlug }: Props) {
  const isAr = lang === "ar";
  const ff = FF;

  if (blogSlug) {
    const post = getBlogPost(blogSlug);
    if (!post) {
      openBlogList();
      return null;
    }
    return (
      <PageShell lang={lang} t={t} onNav={onNav} onLangToggle={onLangToggle} page={page}>
        <div style={{ paddingTop: 90, minHeight: "100vh" }}>
          <BlogArticleView
            post={post}
            lang={lang}
            isAr={isAr}
            readTimeLabel={formatReadTime(post, isAr)}
            onBack={openBlogList}
            onBuild={() => onNav("builder")}
          />
        </div>
      </PageShell>
    );
  }

  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <PageShell lang={lang} t={t} onNav={onNav} onLangToggle={onLangToggle} page={page}>
      <style>{PAGE_CSS}</style>
      <div style={{ paddingTop: 90, minHeight: "100vh" }}>
        <div className="blog-page-inner" style={{ direction: isAr ? "rtl" : "ltr" }}>
          <div className="blog-header" style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ background: `${P.violet}22`, border: `1px solid ${P.violet}55`, color: P.violetLight, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20 }}>
                {isAr ? "المدونة" : "Blog"}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(26px,4.5vw,48px)", fontWeight: 900, color: P.text, fontFamily: ff, marginBottom: 14 }}>
              {isAr ? "مقالات ونصائح مهنية" : "Career Articles & Guides"}
            </h1>
            <p style={{ color: P.muted, fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              {isAr ? "أدلة عملية لكتابة السيرة، تجاوز ATS، وتطوير مسيرتك." : "Practical guides on resumes, ATS, and career growth."}
            </p>
          </div>

          <div className="blog-featured" style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 22, overflow: "hidden", marginBottom: 32 }}>
            <div className="blog-featured-text" style={{ padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ background: `${featured.color}1A`, color: featured.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: `1px solid ${featured.color}33` }}>
                    {isAr ? "مميّز" : "Featured"} · {isAr ? featured.tag.ar : featured.tag.en}
                  </span>
                </div>
                <h2 style={{ color: P.text, fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, fontFamily: ff, lineHeight: 1.3, marginBottom: 14 }}>
                  {isAr ? featured.title.ar : featured.title.en}
                </h2>
                <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>
                  {isAr ? featured.excerpt.ar : featured.excerpt.en}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => openPost(featured.slug)}
                  style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: ff }}
                >
                  {isAr ? "اقرأ المقال" : "Read Article"}
                </button>
                <span style={{ color: P.muted, fontSize: 12 }}>{formatReadTime(featured, isAr)}</span>
              </div>
            </div>
            <button
              type="button"
              className="blog-featured-visual"
              onClick={() => openPost(featured.slug)}
              style={{ background: `linear-gradient(135deg, ${featured.color}18, ${P.surface})`, border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <img src={featured.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 280 }} />
            </button>
          </div>

          <div className="blog-grid">
            {rest.map((post) => (
              <article
                key={post.slug}
                role="button"
                tabIndex={0}
                onClick={() => openPost(post.slug)}
                onKeyDown={(e) => { if (e.key === "Enter") openPost(post.slug); }}
                style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, overflow: "hidden", cursor: "pointer", transition: "border-color 0.25s, transform 0.25s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = post.color; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = ""; }}
              >
                <div style={{ height: 140, overflow: "hidden", background: `linear-gradient(135deg, ${post.color}15, ${P.surface})` }}>
                  <img src={post.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "16px 16px 18px" }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ background: `${post.color}1A`, color: post.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, border: `1px solid ${post.color}33` }}>
                      {isAr ? post.tag.ar : post.tag.en}
                    </span>
                  </div>
                  <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, fontFamily: ff, lineHeight: 1.45, marginBottom: 8 }}>
                    {isAr ? post.title.ar : post.title.en}
                  </h3>
                  <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>
                    {isAr ? post.excerpt.ar : post.excerpt.en}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: P.muted, fontSize: 11 }}>{isAr ? post.date.ar : post.date.en}</span>
                    <span style={{ color: P.muted, fontSize: 11 }}>{formatReadTime(post, isAr)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="blog-newsletter" style={{ marginTop: 52, background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "32px 28px", textAlign: "center" }}>
            <h3 style={{ color: P.text, fontSize: 20, fontWeight: 800, fontFamily: ff, marginBottom: 8 }}>
              {isAr ? "تحتاج مساعدة في سيرتك؟" : "Need help with your resume?"}
            </h3>
            <p style={{ color: P.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
              {isAr ? "ابنِ سيرة ATS احترافية بالذكاء الاصطناعي — مجاناً للمعاينة." : "Build an ATS-ready resume with AI — free preview included."}
            </p>
            <button
              type="button"
              onClick={() => onNav("builder")}
              style={{ background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, border: "none", color: "#fff", borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: ff }}
            >
              {isAr ? "ابدأ الآن →" : "Get started →"}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
