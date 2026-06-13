import type { BlogPost } from "../types";

export const quantifyAchievements: BlogPost = {
  slug: "quantify-achievements",
  title: {
    en: "How to Quantify Your Achievements (With Examples)",
    ar: "كيف تُحوّل إنجازاتك إلى أرقام (مع أمثلة)",
  },
  excerpt: {
    en: "Recruiters want numbers. Here's how to turn your work experience into measurable, compelling bullet points.",
    ar: "مسؤولون التوظيف يريدون أرقاماً. تعلّم كيف تحوّل خبراتك إلى نقاط قابلة للقياس ومقنعة.",
  },
  date: { en: "Sep 2024", ar: "سبتمبر 2024" },
  readMinutes: 7,
  tag: { en: "Tips", ar: "نصائح" },
  color: "#60A5FA",
  cover: "/blog/quantify-achievements.svg",
  blocks: [
    {
      type: "paragraph",
      text: {
        en: "\"Managed social media\" tells recruiters almost nothing. \"Grew Instagram followers by 47% in six months, driving 120 qualified leads\" tells a story. Numbers create credibility, context, and memory — three things interviews are built on.",
        ar: "«أدرت وسائل التواصل» لا تقول شيئاً تقريباً. «نمّيت متابعي إنستغرام 47% في ستة أشهر، مما ولّد 120 عميلاً محتملاً» تحكي قصة. الأرقام تبني المصداقية والسياق والتذكّر.",
      },
    },
    {
      type: "image",
      src: "/blog/quantify-achievements.svg",
      alt: { en: "Chart showing measurable growth", ar: "رسم يوضح نمواً قابلاً للقياس" },
    },
    {
      type: "heading",
      text: { en: "Why metrics matter", ar: "لماذا الأرقام مهمة" },
    },
    {
      type: "paragraph",
      text: {
        en: "Hiring managers scan hundreds of resumes. Metrics help them compare candidates fairly and imagine your impact in their organization. Even small teams and fresh graduates can quantify results.",
        ar: "مديرو التوظيف يمرّون على مئات السير. الأرقام تساعدهم على المقارنة العادلة وتخيّل أثرك في مؤسستهم. حتى الفرق الصغيرة والخريجين الجدد يمكنهم قياس النتائج.",
      },
    },
    {
      type: "heading",
      text: { en: "The STAR shortcut", ar: "اختصار STAR" },
    },
    {
      type: "list",
      items: [
        { en: "Situation — brief context (one clause)", ar: "Situation — سياق مختصر" },
        { en: "Task — what you were responsible for", ar: "Task — ما كنت مسؤولاً عنه" },
        { en: "Action — what you did specifically", ar: "Action — ما فعلته تحديداً" },
        { en: "Result — measurable outcome with a number", ar: "Result — نتيجة قابلة للقياس برقم" },
      ],
    },
    {
      type: "heading",
      text: { en: "Before and after examples", ar: "أمثلة قبل وبعد" },
    },
    {
      type: "paragraph",
      text: {
        en: "Before: \"Improved customer service.\" After: \"Raised CSAT from 82% to 91% within one quarter by redesigning ticket routing.\" Before: \"Handled sales.\" After: \"Closed SAR 1.2M in new business across 18 enterprise accounts in FY2024.\"",
        ar: "قبل: «حسّنت خدمة العملاء.» بعد: «رفعت CSAT من 82% إلى 91% في ربع واحد بإعادة توجيه التذاكر.» قبل: «توليت المبيعات.» بعد: «أغلقت 1.2 مليون ريال أعمال جديدة عبر 18 حساب enterprise في 2024.»",
      },
    },
    {
      type: "tip",
      text: {
        en: "No exact number? Use ranges or frequency: \"weekly reports for 12 stakeholders\" or \"processed 200+ invoices/month.\"",
        ar: "لا رقم دقيق؟ استخدم نطاقاً أو تكراراً: «تقارير أسبوعية لـ 12 stakeholder» أو «200+ فاتورة/شهر».",
      },
    },
    {
      type: "heading",
      text: { en: "Metrics by function", ar: "مقاييس حسب الوظيفة" },
    },
    {
      type: "list",
      items: [
        { en: "Sales: revenue, quota %, deal size, pipeline", ar: "المبيعات: إيراد، نسبة target، حجم صفقة" },
        { en: "Marketing: CTR, ROAS, leads, conversion rate", ar: "التسويق: CTR، ROAS، leads، conversion" },
        { en: "Operations: time saved, error reduction, throughput", ar: "العمليات: وقت موفر، تقليل أخطاء، throughput" },
        { en: "Tech: uptime, latency, bugs closed, users served", ar: "التقنية: uptime، latency، bugs، مستخدمين" },
        { en: "HR: time-to-hire, retention, training completion", ar: "الموارد البشرية: time-to-hire، retention، تدريب" },
      ],
    },
    {
      type: "heading",
      text: { en: "Saudi market examples", ar: "أمثلة من السوق السعودي" },
    },
    {
      type: "paragraph",
      text: {
        en: "Reference Vision 2030-aligned projects, government digitization, or regional expansion where true. Use SAR for monetary values. Mention scale: stores, branches, users across KSA and GCC when accurate.",
        ar: "اذكر مشاريع مرتبطة برؤية 2030 أو التحول الرقمي أو التوسع الإقليمي حيث صحيح. استخدم الريال للقيم. اذكر الحجم: فروع، مستخدمين في السعودية والخليج عند الدقة.",
      },
    },
    {
      type: "heading",
      text: { en: "What not to do", ar: "ما لا تفعله" },
    },
    {
      type: "list",
      items: [
        { en: "Do not invent numbers — interviews will probe them", ar: "لا تختلق أرقاماً — سيسأل عنها في المقابلة" },
        { en: "Avoid vague superlatives: \"best\", \"leading\", \"world-class\"", ar: "تجنّب «الأفضل» و«رائد» دون دليل" },
        { en: "Do not repeat the same metric in every bullet", ar: "لا تكرر نفس الرقم في كل نقطة" },
      ],
    },
  ],
};
