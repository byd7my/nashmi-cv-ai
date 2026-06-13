import type { BlogPost } from "../types";

export const atsGuide2025: BlogPost = {
  slug: "ats-guide-2025",
  title: {
    en: "The Complete ATS Resume Guide for 2025",
    ar: "الدليل الكامل لتجاوز أنظمة ATS في 2025",
  },
  excerpt: {
    en: "Everything you need to know about writing resumes that pass Applicant Tracking Systems in 2025.",
    ar: "كل ما تحتاج معرفته لكتابة سيرة ذاتية تتجاوز أنظمة الفرز الآلي في 2025.",
  },
  date: { en: "Dec 2024", ar: "ديسمبر 2024" },
  readMinutes: 8,
  tag: { en: "ATS", ar: "ATS" },
  color: "#7C5CFF",
  cover: "/blog/ats-guide-2025.svg",
  blocks: [
    {
      type: "paragraph",
      text: {
        en: "Before a recruiter ever sees your resume, an Applicant Tracking System (ATS) may have already decided whether you move forward. In 2025, most medium and large employers in Saudi Arabia and the GCC use ATS software to filter applications. Understanding how these systems work is the first step to getting more interviews.",
        ar: "قبل أن يرى مسؤول التوظيف سيرتك الذاتية، قد يكون نظام ATS قد حسم بالفعل إن كنت ستمر للمرحلة التالية. في 2025، تستخدم أغلب الشركات المتوسطة والكبيرة في السعودية ودول الخليج برامج فرز آلية. فهم آلية عمل هذه الأنظمة هو أول خطوة للحصول على مقابلات أكثر.",
      },
    },
    {
      type: "image",
      src: "/blog/ats-guide-2025.svg",
      alt: { en: "Illustration of an ATS-friendly resume", ar: "رسم توضيحي لسيرة متوافقة مع ATS" },
    },
    {
      type: "heading",
      text: { en: "What is an ATS?", ar: "ما هو نظام ATS؟" },
    },
    {
      type: "paragraph",
      text: {
        en: "An ATS is software that stores, parses, and ranks job applications. It extracts text from your resume, matches keywords against the job description, and scores candidates. Popular systems include Workday, Greenhouse, and Taleo. They do not \"read\" design — they read structure and text.",
        ar: "ATS هو برنامج يخزّن ويحلّل ويرتّب طلبات التوظيف. يستخرج النص من سيرتك، يطابق الكلمات المفتاحية مع وصف الوظيفة، ويمنحك درجة. أنظمة شائعة مثل Workday وGreenhouse وTaleo. لا «تقرأ» التصميم — بل تقرأ الهيكل والنص.",
      },
    },
    {
      type: "list",
      items: [
        { en: "Parses contact info, job titles, dates, and skills", ar: "يستخرج بيانات التواصل والمسميات والتواريخ والمهارات" },
        { en: "Matches keywords from the job posting", ar: "يطابق الكلمات المفتاحية من إعلان الوظيفة" },
        { en: "Filters candidates who miss required qualifications", ar: "يستبعد من يفتقد المؤهلات المطلوبة" },
        { en: "Ranks remaining applicants for human review", ar: "يرتّب المتقدمين المتبقين للمراجعة البشرية" },
      ],
    },
    {
      type: "heading",
      text: { en: "Formatting rules that always work", ar: "قواعد التنسيق التي تنجح دائماً" },
    },
    {
      type: "paragraph",
      text: {
        en: "The safest ATS format is a single-column layout with standard section headings, real text (not images of text), and simple bullet points. Avoid tables, text boxes, headers/footers with critical info, and multi-column designs that scramble parsing order.",
        ar: "أأمن تنسيق ATS هو عمود واحد مع عناوين أقسام قياسية، ونص حقيقي (وليس صورة نص)، ونقاط بسيطة. تجنّب الجداول ومربعات النص والرأس/التذييل الذي يحمل معلومات أساسية، والتصميم متعدد الأعمدة الذي يخلّط ترتيب القراءة.",
      },
    },
    {
      type: "list",
      items: [
        { en: "Use headings: Experience, Education, Skills — or Arabic equivalents", ar: "استخدم عناوين: الخبرة، التعليم، المهارات" },
        { en: "Save and send as PDF with selectable text", ar: "احفظ وأرسل PDF بنص قابل للتحديد" },
        { en: "Stick to common fonts: Arial, Calibri, or Tajawal for Arabic", ar: "التزم بخطوط شائعة: Arial أو Calibri أو Tajawal للعربية" },
        { en: "No graphics, icons, or skill bars replacing text", ar: "لا رسوماً أو أيقونات أو شرائط مهارات بدل النص" },
      ],
    },
    {
      type: "tip",
      text: {
        en: "Tip: Copy-paste your resume into Notepad. If the order looks wrong or text is missing, ATS will struggle too.",
        ar: "نصيحة: انسخ سيرتك إلى محرر نص بسيط. إذا بدا الترتيب خاطئاً أو نقص نص، فـ ATS سيعاني أيضاً.",
      },
    },
    {
      type: "heading",
      text: { en: "Keywords without keyword stuffing", ar: "الكلمات المفتاحية بدون حشو" },
    },
    {
      type: "paragraph",
      text: {
        en: "Read the job description carefully. Mirror important terms naturally in your summary and experience bullets — tools, certifications, industry language. Use both acronyms and full forms (e.g., \"KPI\" and \"Key Performance Indicators\") where relevant.",
        ar: "اقرأ وصف الوظيفة بعناية. استخدم المصطلحات المهمة بشكل طبيعي في الملخص ونقاط الخبرة — الأدوات، الشهادات، لغة المجال. اذكر الاختصارات والصيغ الكاملة (مثل KPI ومؤشرات الأداء) حيث يناسب.",
      },
    },
    {
      type: "heading",
      text: { en: "Section order recruiters expect", ar: "ترتيب الأقسام الذي يتوقعه مسؤولو التوظيف" },
    },
    {
      type: "list",
      items: [
        { en: "Name and contact details at the top", ar: "الاسم وبيانات التواصل في الأعلى" },
        { en: "Professional summary (3–4 lines)", ar: "ملخص مهني (3–4 أسطر)" },
        { en: "Work experience — reverse chronological", ar: "الخبرة العملية — من الأحدث للأقدم" },
        { en: "Education and certifications", ar: "التعليم والشهادات" },
        { en: "Skills and languages", ar: "المهارات واللغات" },
      ],
    },
    {
      type: "heading",
      text: { en: "Common mistakes in Saudi applications", ar: "أخطاء شائعة في طلبات السعودية" },
    },
    {
      type: "paragraph",
      text: {
        en: "Many candidates lose points by mixing languages inconsistently, hiding dates, or uploading image-only PDFs from design tools. National ID and photo are not required on ATS resumes unless the employer asks — keep the document professional and scannable.",
        ar: "كثير من المتقدمين يخسرون نقاطاً بخلط اللغات دون تناسق، أو إخفاء التواريخ، أو رفع PDF صورة فقط من برامج التصميم. الهوية والصورة غير مطلوبة في سيرة ATS إلا إذا طلب صاحب العمل — اجعل الملفاً مهنياً وقابلاً للمسح.",
      },
    },
    {
      type: "heading",
      text: { en: "Your 2025 action checklist", ar: "قائمة عملك لعام 2025" },
    },
    {
      type: "list",
      items: [
        { en: "Tailor each resume to the job posting", ar: "خصّص كل سيرة لإعلان الوظيفة" },
        { en: "Quantify achievements with numbers", ar: "كمّن إنجازاتك بأرقام" },
        { en: "Test PDF text selection before submitting", ar: "جرّب تحديد نص PDF قبل الإرسال" },
        { en: "Keep file name professional: FirstName_LastName_Role.pdf", ar: "سمّ الملف بشكل مهني: الاسم_الدور.pdf" },
      ],
    },
    {
      type: "tip",
      text: {
        en: "Nashmi exports every template as the same ATS-safe PDF layout — so your preview style never breaks parsing.",
        ar: "نشمي يصدّر كل القوالب بنفس تنسيق PDF الآمن لـ ATS — فاختيارك للمعاينة لا يكسر التحليل.",
      },
    },
  ],
};
