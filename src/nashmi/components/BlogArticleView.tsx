import { P, FF } from "@/nashmi/lib/tokens";
import type { BlogBlock, BlogPost } from "@/nashmi/lib/blog";
import type { TrLang } from "@/nashmi/lib/translations";

const ARTICLE_CSS = `
  .blog-article-wrap { max-width: 760px; margin: 0 auto; padding: 32px 24px 64px; }
  .blog-article-hero { width: 100%; border-radius: 16px; overflow: hidden; margin-bottom: 28px; border: 1px solid ${P.border}; }
  .blog-article-hero img { width: 100%; height: auto; display: block; aspect-ratio: 16/9; object-fit: cover; }
  .blog-article-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
  .blog-article-title { font-size: clamp(24px, 5vw, 36px); font-weight: 900; line-height: 1.3; margin-bottom: 20px; color: ${P.text}; }
  .blog-article-body h2 { font-size: 20px; font-weight: 800; color: ${P.text}; margin: 28px 0 12px; line-height: 1.35; }
  .blog-article-body p { color: ${P.textSub}; font-size: 16px; line-height: 1.85; margin-bottom: 16px; }
  .blog-article-body ul { margin: 0 0 18px; padding-inline-start: 22px; color: ${P.textSub}; line-height: 1.85; font-size: 15px; }
  .blog-article-body li { margin-bottom: 8px; }
  .blog-article-body img { width: 100%; border-radius: 12px; margin: 20px 0; border: 1px solid ${P.border}; }
  .blog-tip { background: ${P.violet}14; border: 1px solid ${P.violet}44; border-radius: 12px; padding: 14px 16px; margin: 20px 0; color: ${P.textSub}; font-size: 15px; line-height: 1.75; }
  .blog-tip strong { color: ${P.violetLight}; }
  .blog-article-cta { margin-top: 40px; padding: 24px; background: ${P.card}; border: 1px solid ${P.border}; border-radius: 16px; text-align: center; }
  .blog-back { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: ${P.muted}; cursor: pointer; font-size: 13px; font-family: inherit; margin-bottom: 20px; padding: 0; }
  .blog-back:hover { color: ${P.violetLight}; }
  @media (max-width: 768px) {
    .blog-article-wrap { padding: 20px 16px 48px; }
    .blog-article-body p { font-size: 15px; }
    .blog-article-body h2 { font-size: 18px; margin-top: 22px; }
  }
`;

interface Props {
  post: BlogPost;
  lang: TrLang;
  isAr: boolean;
  readTimeLabel: string;
  onBack: () => void;
  onBuild: () => void;
}

function renderBlock(block: BlogBlock, isAr: boolean, key: number) {
  switch (block.type) {
    case "heading":
      return <h2 key={key}>{isAr ? block.text.ar : block.text.en}</h2>;
    case "paragraph":
      return <p key={key}>{isAr ? block.text.ar : block.text.en}</p>;
    case "list":
      return (
        <ul key={key}>
          {block.items.map((item, i) => (
            <li key={i}>{isAr ? item.ar : item.en}</li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <div key={key} className="blog-tip">
          <strong>{isAr ? "💡 نصيحة: " : "💡 Tip: "}</strong>
          {isAr ? block.text.ar : block.text.en}
        </div>
      );
    case "image":
      return (
        <img
          key={key}
          src={block.src}
          alt={isAr ? block.alt.ar : block.alt.en}
          loading="lazy"
        />
      );
    default:
      return null;
  }
}

export function BlogArticleView({ post, lang, isAr, readTimeLabel, onBack, onBuild }: Props) {
  const ff = FF;

  return (
    <>
      <style>{ARTICLE_CSS}</style>
      <div className="blog-article-wrap" style={{ direction: isAr ? "rtl" : "ltr", fontFamily: ff }}>
        <button type="button" className="blog-back" onClick={onBack}>
          {isAr ? "→ العودة للمدونة" : "← Back to blog"}
        </button>

        <div className="blog-article-meta">
          <span style={{ background: `${post.color}22`, color: post.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: `1px solid ${post.color}44` }}>
            {isAr ? post.tag.ar : post.tag.en}
          </span>
          <span style={{ color: P.muted, fontSize: 12 }}>{isAr ? post.date.ar : post.date.en}</span>
          <span style={{ color: P.muted, fontSize: 12 }}>{readTimeLabel}</span>
        </div>

        <h1 className="blog-article-title">{isAr ? post.title.ar : post.title.en}</h1>

        <div className="blog-article-hero">
          <img src={post.cover} alt={isAr ? post.title.ar : post.title.en} />
        </div>

        <div className="blog-article-body">
          {post.blocks.map((block, i) => renderBlock(block, isAr, i))}
        </div>

        <div className="blog-article-cta">
          <p style={{ color: P.muted, fontSize: 14, marginBottom: 16, lineHeight: 1.7 }}>
            {isAr ? "طبّق ما تعلّمته — ابنِ سيرتك الآن على نشمي." : "Apply what you learned — build your resume on Nashmi now."}
          </p>
          <button
            type="button"
            onClick={onBuild}
            style={{
              background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
              border: "none",
              color: "#fff",
              borderRadius: 12,
              padding: "12px 28px",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 800,
              fontFamily: ff,
              boxShadow: `0 6px 24px ${P.violet}44`,
            }}
          >
            {isAr ? "ابدأ بناء سيرتي →" : "Start building →"}
          </button>
        </div>
      </div>
    </>
  );
}
