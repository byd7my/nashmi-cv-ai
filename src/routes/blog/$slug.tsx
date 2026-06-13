import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlogPage } from "@/nashmi/pages/BlogPage";
import { getBlogPost } from "@/nashmi/lib/blog";
import { useLang } from "@/nashmi/hooks/useLang";
import { TR } from "@/nashmi/lib/translations";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) return { meta: [{ title: "المقال غير موجود — نشمي" }] };
    return {
      meta: [
        { title: `${post.title.ar} — نشمي` },
        { name: "description", content: post.excerpt.ar },
        { property: "og:title", content: post.title.ar },
        { property: "og:description", content: post.excerpt.ar },
        { property: "og:image", content: post.cover },
      ],
      links: [{ rel: "canonical", href: `/blog/${post.slug}` }],
    };
  },
  component: BlogArticleRoute,
});

function navFromBlog(dest: string) {
  if (dest === "landing") window.location.href = "/";
  else if (dest === "blog") window.location.href = "/blog";
  else if (dest === "builder") window.location.href = "/#/builder";
  else window.location.href = `/#/${dest}`;
}

function BlogArticleRoute() {
  const { slug } = Route.useParams();
  if (!getBlogPost(slug)) throw notFound();
  const { lang, toggle } = useLang();
  const t = TR[lang];

  return (
    <BlogPage
      lang={lang}
      t={t}
      page="blog"
      blogSlug={slug}
      onLangToggle={toggle}
      onNav={navFromBlog}
      onOpenBlogPost={(s) => { window.location.href = `/blog/${s}`; }}
      onOpenBlogList={() => { window.location.href = "/blog"; }}
    />
  );
}
