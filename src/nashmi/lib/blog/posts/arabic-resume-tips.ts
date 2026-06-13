import type { BlogPost } from "../types";

export const arabicResumeTips: BlogPost = {
  slug: "arabic-resume-tips",
  title: {
    en: "Writing an Arabic CV That Gets Noticed",
    ar: "كيف تكتب سيرة ذاتية عربية تلفت الانتباه",
  },
  excerpt: {
    en: "A step-by-step guide to crafting a professional Arabic resume that stands out to Saudi and GCC employers.",
    ar: "دليل خطوة بخطوة لصياغة سيرة ذاتية عربية احترافية تلفت انتباه أصحاب العمل في السعودية ودول الخليج.",
  },
  date: { en: "Nov 2024", ar: "نوفمبر 2024" },
  readMinutes: 6,
  tag: { en: "Arabic", ar: "عربي" },
  color: "#22C55E",
  cover: "/blog/arabic-resume-tips.svg",
  blocks: [
    {
      type: "paragraph",
      text: {
        en: "An Arabic resume is not just a translation of an English one. Saudi and GCC employers expect clear formal Arabic, correct RTL layout, and content that reflects local business culture. A well-written Arabic CV shows professionalism before the first interview.",
        ar: "السيرة العربية ليست ترجمة حرفية للإنجليزية. أصحاب العمل في السعودية والخليج يتوقعون عربية فصيحة واضحة، وتنسيق RTL صحيح، ومحتوى يعكس ثقافة العمل المحلية. سيرة عربية جيدة تُظهر الاحتراف قبل المقابلة الأولى.",
      },
    },
    {
      type: "image",
      src: "/blog/arabic-resume-tips.svg",
      alt: { en: "Arabic resume layout example", ar: "مثال تخطيط سيرة عربية" },
    },
    {
      type: "heading",
      text: { en: "Choose the right language strategy", ar: "اختر استراتيجية اللغة المناسبة" },
    },
    {
      type: "paragraph",
      text: {
        en: "Apply with the language the job posting uses. For bilingual roles, a single Arabic CV or separate Arabic and English versions both work — but never mix random English headings inside an Arabic document.",
        ar: "قدّم بلغة إعلان الوظيفة. للأدوار ثنائية اللغة، سيرة عربية واحدة أو نسختان منفصلتان — لكن لا تخلط عناوين إنجليزية عشوائية داخل مستند عربي.",
      },
    },
    {
      type: "heading",
      text: { en: "RTL layout essentials", ar: "أساسيات تنسيق RTL" },
    },
    {
      type: "list",
      items: [
        { en: "Set document direction to right-to-left", ar: "اضبط اتجاه المستند من اليمين لليسار" },
        { en: "Align body text to the right; keep numbers and emails LTR", ar: "محاذاة النص لليمين؛ الأرقام والإيميلات LTR" },
        { en: "Use Arabic punctuation and date formats (YYYY/MM or شهر/سنة)", ar: "استخدم علامات ترقيم وتواريخ عربية مناسبة" },
        { en: "Avoid justified text that creates awkward spacing", ar: "تجنّب ضبط النص على كامل السطر" },
      ],
    },
    {
      type: "heading",
      text: { en: "Formal Arabic tone", ar: "الأسلوب العربي الرسمي" },
    },
    {
      type: "paragraph",
      text: {
        en: "Use Modern Standard Arabic for headings and summaries. Write in third person or neutral first person (\"أدير\"، \"أساهم في\"). Avoid dialect, slang, and overly flowery phrases that obscure your actual skills.",
        ar: "استخدم الفصحى في العناوين والملخص. اكتب بضمير متوسط أو أول شخص محايد («أدير»، «أساهم في»). تجنّب العامية والتكلف الذي يحجب مهاراتك الحقيقية.",
      },
    },
    {
      type: "tip",
      text: {
        en: "Replace weak openings like \"أنا شخص طموح\" with concrete value: years of experience, industry, and one measurable result.",
        ar: "استبدل «أنا شخص طموح» بقيمة ملموسة: سنوات الخبرة، المجال، ونتيجة قابلة للقياس.",
      },
    },
    {
      type: "heading",
      text: { en: "Sections Saudi employers look for", ar: "أقسام يبحث عنها أصحاب العمل السعوديون" },
    },
    {
      type: "list",
      items: [
        { en: "Personal info: name, city, phone, email, LinkedIn", ar: "البيانات: الاسم، المدينة، الجوال، الإيميل، لينكدإن" },
        { en: "Nationality and visa status only if relevant", ar: "الجنسية والإقامة فقط إن كان ذلك مطلوباً" },
        { en: "Education with institution names in Arabic or official transliteration", ar: "التعليم بأسماء الجامعات بالعربية أو تهجئة رسمية" },
        { en: "Professional licenses (هيئة، SOCPA, etc.) when applicable", ar: "التراخيص المهنية (هيئة، SOCPA...) عند الانطباق" },
      ],
    },
    {
      type: "heading",
      text: { en: "Bilingual CV best practice", ar: "أفضل ممارسة للسيرة ثنائية اللغة" },
    },
    {
      type: "paragraph",
      text: {
        en: "If you need both languages, keep two complete versions with matching facts — not half-translated sections. Recruiters compare dates and titles; inconsistencies raise red flags.",
        ar: "إن احتجت اللغتين، احتفظ بنسختين كاملتين بنفس الحقائق — لا أقساماً مترجمة جزئياً. مسؤولو التوظيف يقارنون التواريخ والمسميات؛ التناقض يُثير الشك.",
      },
    },
  ],
};
