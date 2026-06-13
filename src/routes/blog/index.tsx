import { createFileRoute } from "@tanstack/react-router";
import { BlogPage } from "@/nashmi/pages/BlogPage";
import { useLang } from "@/nashmi/hooks/useLang";
import { TR } from "@/nashmi/lib/translations";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "المدونة — نشمي | Nashmi Blog" },
      { name: "description", content: "مقالات ونصائح مهنية لكتابة السيرة الذاتية وتجاوز ATS." },
      { property: "og:title", content: "مدونة نشمي — Career Articles" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogIndexRoute,
});

function navFromBlog(dest: string) {
  if (dest === "landing") window.location.href = "/";
  else if (dest === "blog") window.location.href = "/blog";
  else if (dest === "builder") window.location.href = "/#/builder";
  else window.location.href = `/#/${dest}`;
}

function BlogIndexRoute() {
  const { lang, toggle } = useLang();
  const t = TR[lang];

  return (
    <BlogPage
      lang={lang}
      t={t}
      page="blog"
      blogSlug={null}
      onLangToggle={toggle}
      onNav={navFromBlog}
      onOpenBlogPost={(slug) => { window.location.href = `/blog/${slug}`; }}
      onOpenBlogList={() => { window.location.href = "/blog"; }}
    />
  );
}
