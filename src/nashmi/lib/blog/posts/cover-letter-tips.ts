import type { BlogPost } from "../types";

export const coverLetterTips: BlogPost = {
  slug: "cover-letter-tips",
  title: {
    en: "Writing a Cover Letter That Gets Read (2025)",
    ar: "كتابة رسالة تغطية تُقرأ فعلاً في 2025",
  },
  excerpt: {
    en: "Most cover letters are ignored. Here's how to write one that makes hiring managers actually read your resume.",
    ar: "معظم رسائل التغطية يتم تجاهلها. تعرّف على كيفية كتابة رسالة تجعل مسؤولي التوظيف يقرؤون سيرتك.",
  },
  date: { en: "Jul 2024", ar: "يوليو 2024" },
  readMinutes: 6,
  tag: { en: "Tips", ar: "نصائح" },
  color: "#F472B6",
  cover: "/blog/cover-letter-tips.svg",
  blocks: [
    {
      type: "paragraph",
      text: {
        en: "Cover letters are not dead — boring cover letters are. In 2025, a sharp half-page letter still wins attention when it explains why you, why this company, and why now. The goal is not to repeat your resume; it is to connect the dots.",
        ar: "رسائل التغطية لم تمت — المملة منها مات. في 2025، رسالة نصف صفحة حادّة ما زالت تجذب الانتباه عندما تشرح لماذا أنت، لماذا هذه الشركة، ولماذا الآن. الهدف ليس تكرار السيرة بل ربط النقاط.",
      },
    },
    {
      type: "image",
      src: "/blog/cover-letter-tips.svg",
      alt: { en: "Cover letter document illustration", ar: "رسم رسالة تغطية" },
    },
    {
      type: "heading",
      text: { en: "Structure that works", ar: "هيكل ينجح" },
    },
    {
      type: "list",
      items: [
        { en: "Opening: hook + role title + one reason you fit", ar: "افتتاح: hook + المسمى + سبب واحد للملاءمة" },
        { en: "Middle: 2 achievements mapped to job requirements", ar: "الوسط: إنجازان مرتبطان بمتطلبات الوظيفة" },
        { en: "Closing: enthusiasm + clear call to action", ar: "الختام: حماس + call to action واضح" },
        { en: "Length: 250–350 words maximum", ar: "الطول: 250–350 كلمة كحد أقصى" },
      ],
    },
    {
      type: "heading",
      text: { en: "Opening lines that fail vs win", ar: "افتتاحيات فاشلة مقابل ناجحة" },
    },
    {
      type: "paragraph",
      text: {
        en: "Fail: \"I am writing to apply for the position advertised on your website.\" Win: \"When I reduced onboarding time by 30% at [Company], I saw the same operational challenge your team describes in the Project Manager role.\"",
        ar: "فاشل: «أكتب للتقديم على الوظيفة المعلن عنها.» ناجح: «عندما قلّلت وقت التأهيل 30% في [شركة]، رأيت نفس التحدي الذي يصفه فريقكم في دور مدير المشاريع.»",
      },
    },
    {
      type: "tip",
      text: {
        en: "Research one recent company news item or product launch and reference it genuinely — not flattery.",
        ar: "ابحث عن خبر أو منتج حديث للشركة واذكره بصدق — لا مجاملة فارغة.",
      },
    },
    {
      type: "heading",
      text: { en: "Customization checklist", ar: "قائمة التخصيص" },
    },
    {
      type: "list",
      items: [
        { en: "Address hiring manager by name when possible", ar: "خاطب مدير التوظيف بالاسم إن أمكن" },
        { en: "Mirror 3 keywords from the job description", ar: "عكس 3 كلمات من الوصف" },
        { en: "Explain employment gaps briefly if needed", ar: "فسّر فجوات التوظيف باختصار إن لزم" },
        { en: "Match tone to company culture (formal vs startup)", ar: "وائم النبرة مع ثقافة الشركة" },
      ],
    },
    {
      type: "heading",
      text: { en: "Arabic cover letters", ar: "رسائل التغطية العربية" },
    },
    {
      type: "paragraph",
      text: {
        en: "For Arabic applications, use formal openings (\"السلام عليكم\" or \"تحية طيبة\") and clear RTL formatting. Keep paragraphs short. Many Saudi employers appreciate bilingual candidates — mention language ability only if the role requires it.",
        ar: "للتقديم العربي، استخدم افتتاحية رسمية («تحية طيبة») وتنسيق RTL واضح. فقرات قصيرة. كثير من أصحاب العمل السعوديين يقدّرون ثنائيي اللغة — اذكر اللغة فقط إن كان الدور يتطلبها.",
      },
    },
    {
      type: "heading",
      text: { en: "Mistakes to avoid", ar: "أخطاء تتجنبها" },
    },
    {
      type: "list",
      items: [
        { en: "Sending the same letter to every employer", ar: "إرسال نفس الرسالة للجميع" },
        { en: "Apologizing for missing qualifications", ar: "الاعتذار عن نقص مؤهلات" },
        { en: "Repeating your entire resume in paragraph form", ar: "تكرار السيرة كاملة فقرة" },
        { en: "Typos in the company name — instant delete", ar: "أخطاء في اسم الشركة — حذف فوري" },
      ],
    },
    {
      type: "tip",
      text: {
        en: "If the application says cover letter optional, write a short one anyway — many hiring managers read only candidates who bother.",
        ar: "إن قالوا «اختياري»، اكتب رسالة قصيرة — كثير من مديري التوظيف يقرأون من يبذل جهداً إضافياً.",
      },
    },
  ],
};
