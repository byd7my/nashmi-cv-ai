import type { BlogPost } from "./types";
import { atsGuide2025 } from "./posts/ats-guide-2025";
import { arabicResumeTips } from "./posts/arabic-resume-tips";
import { aiResumeWriting } from "./posts/ai-resume-writing";
import { quantifyAchievements } from "./posts/quantify-achievements";
import { linkedinVsResume } from "./posts/linkedin-vs-resume";
import { coverLetterTips } from "./posts/cover-letter-tips";

export type { BlogBlock, BlogPost } from "./types";

export const BLOG_POSTS: BlogPost[] = [
  atsGuide2025,
  arabicResumeTips,
  aiResumeWriting,
  quantifyAchievements,
  linkedinVsResume,
  coverLetterTips,
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug.toLowerCase());
}

export function formatReadTime(post: BlogPost, isAr: boolean): string {
  return isAr ? `${post.readMinutes} دقائق قراءة` : `${post.readMinutes} min read`;
}

export function blogPostHash(slug: string): string {
  return `#/blog/${slug}`;
}

export function blogListHash(): string {
  return "#/blog";
}

export function parseBlogSlugFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "blog" || !parts[1]) return null;
  return parts[1].toLowerCase();
}
