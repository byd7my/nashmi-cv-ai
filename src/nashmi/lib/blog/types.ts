export type BlogBlock =
  | { type: "heading"; text: { ar: string; en: string } }
  | { type: "paragraph"; text: { ar: string; en: string } }
  | { type: "list"; items: { ar: string; en: string }[] }
  | { type: "tip"; text: { ar: string; en: string } }
  | { type: "image"; src: string; alt: { ar: string; en: string } };

export type BlogPost = {
  slug: string;
  title: { ar: string; en: string };
  excerpt: { ar: string; en: string };
  date: { ar: string; en: string };
  readMinutes: number;
  tag: { ar: string; en: string };
  color: string;
  cover: string;
  blocks: BlogBlock[];
};
