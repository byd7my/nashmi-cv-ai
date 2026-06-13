import type { BlogPost } from "../types";

export const linkedinVsResume: BlogPost = {
  slug: "linkedin-vs-resume",
  title: {
    en: "LinkedIn vs Resume: What's the Difference?",
    ar: "لينكدإن مقابل السيرة الذاتية: ما الفرق؟",
  },
  excerpt: {
    en: "Your LinkedIn profile and resume serve different purposes. Here's how to optimize both for maximum impact.",
    ar: "ملفك على لينكدإن وسيرتك الذاتية يخدمان أغراضاً مختلفة. تعرّف على كيفية تحسين كليهما.",
  },
  date: { en: "Aug 2024", ar: "أغسطس 2024" },
  readMinutes: 5,
  tag: { en: "Career", ar: "مسار مهني" },
  color: "#A78BFA",
  cover: "/blog/linkedin-vs-resume.svg",
  blocks: [
    {
      type: "paragraph",
      text: {
        en: "LinkedIn and your resume are not duplicates — they are complementary tools in your job search. One is a living public profile; the other is a tailored, private pitch for a specific role. Confusing the two weakens both.",
        ar: "لينكدإن وسيرتك ليسا نسختين متطابقتين — بل أداتان متكاملتان. الأول ملف عام حي؛ الثاني عرض مخصص لدور محدد. الخلط بينهما يضعف كليهما.",
      },
    },
    {
      type: "image",
      src: "/blog/linkedin-vs-resume.svg",
      alt: { en: "LinkedIn profile versus resume document", ar: "ملف لينكدإن مقابل مستند السيرة" },
    },
    {
      type: "heading",
      text: { en: "Purpose: discovery vs decision", ar: "الغرض: الاكتشاف مقابل القرار" },
    },
    {
      type: "paragraph",
      text: {
        en: "LinkedIn helps recruiters find you, learn your network, and see social proof (recommendations, activity). Your resume is submitted when you apply — optimized to pass ATS and convince a hiring manager in two pages or less.",
        ar: "لينكدإن يساعد recruiters على إيجادك ورؤية شبكتك وSocial proof. سيرتك تُرفع عند التقديم — مُحسّنة لـ ATS وإقناع مدير التوظيف في صفحتين أو أقل.",
      },
    },
    {
      type: "heading",
      text: { en: "Key differences at a glance", ar: "الفروقات في لمحة" },
    },
    {
      type: "list",
      items: [
        { en: "LinkedIn: conversational About section; Resume: tight professional summary", ar: "لينكدإن: About محادثي؛ السيرة: ملخص مهني م condensed" },
        { en: "LinkedIn: full career history; Resume: relevant roles only", ar: "لينكدإن: تاريخ كامل؛ السيرة: الأدوار ذات الصلة فقط" },
        { en: "LinkedIn: photo expected; Resume: photo optional (region-dependent)", ar: "لينكدإن: صورة متوقعة؛ السيرة: صورة اختيارية" },
        { en: "LinkedIn: skills endorsements; Resume: skills you can defend in interview", ar: "لينكدإن: endorsements؛ السيرة: مهارات تدافع عنها" },
      ],
    },
    {
      type: "heading",
      text: { en: "Headline vs summary", ar: "العنوان مقابل الملخص" },
    },
    {
      type: "paragraph",
      text: {
        en: "Your LinkedIn headline can include personality and keywords: \"Product Manager | FinTech | Riyadh.\" Your resume summary should lead with value and metrics for the target role — no hashtags, no emoji.",
        ar: "عنوان لينكدإن يمكن أن يضم شخصية وكلمات مفتاحية: «Product Manager | FinTech | Riyadh». ملخص السيرة يبدأ بالقيمة والأرقام للدور — بلا hashtags أو emoji.",
      },
    },
    {
      type: "tip",
      text: {
        en: "Keep dates, job titles, and company names identical on both — discrepancies trigger trust issues.",
        ar: "اجعل التواريخ والمسميات وأسماء الشركات متطابقة — التناقض يُربك الثقة.",
      },
    },
    {
      type: "heading",
      text: { en: "When to prioritize which", ar: "متى تركز على أيهما" },
    },
    {
      type: "list",
      items: [
        { en: "Active applications → polish resume first for each job", ar: "تقديم نشط → حسّن السيرة لكل وظيفة أولاً" },
        { en: "Passive job market → invest in LinkedIn visibility", ar: "سوق عمل passive → استثمر في ظهور لينكدإن" },
        { en: "Referrals → both should tell the same story", ar: "إحالات → كلاهما يحكي نفس القصة" },
      ],
    },
    {
      type: "heading",
      text: { en: "One brand, two formats", ar: "علامة واحدة، تنسيقان" },
    },
    {
      type: "paragraph",
      text: {
        en: "Align your narrative across platforms: same seniority level, same core skills, same career direction. Customize depth — not facts — per channel. That consistency is what senior recruiters notice immediately.",
        ar: "وائم سردك عبر المنصات: نفس المستوى، نفس المهارات الأساسية، نفس الاتجاه. خصّص العمق — لا الحقائق — لكل قناة. هذا التناسق ما يلاحظه recruiters كبار فوراً.",
      },
    },
  ],
};
