export function applySiteMeta(title: string, description: string) {
  if (typeof document === "undefined") return;
  document.title = title;
  const set = (attr: "name" | "property", key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.content = content;
  };
  set("name", "description", description);
  set("property", "og:title", title);
  set("property", "og:description", description);
  set("name", "twitter:title", title);
  set("name", "twitter:description", description);
}

export function applyHtmlLang(lang: "ar" | "en") {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
}
