import type { BlogPost } from "../types";

export const aiResumeWriting: BlogPost = {
  slug: "ai-resume-writing",
  title: {
    en: "How AI Is Transforming Resume Writing in 2025",
    ar: "كيف يغيّر الذكاء الاصطناعي كتابة السير الذاتية في 2025",
  },
  excerpt: {
    en: "AI tools are revolutionizing the way professionals write, optimize, and tailor their resumes for specific roles.",
    ar: "أدوات الذكاء الاصطناعي تُحدث ثورة في الطريقة التي يكتب بها المحترفون سيرهم الذاتية ويُحسّنونها.",
  },
  date: { en: "Oct 2024", ar: "أكتوبر 2024" },
  readMinutes: 10,
  tag: { en: "AI", ar: "ذكاء اصطناعي" },
  color: "#E8B84B",
  cover: "/blog/ai-resume-writing.svg",
  blocks: [
    {
      type: "paragraph",
      text: {
        en: "Artificial intelligence has moved from novelty to everyday tool for job seekers. In 2025, AI can draft bullet points, suggest keywords, translate CVs, and score ATS compatibility — but it cannot replace your judgment, honesty, or personal story.",
        ar: "انتقل الذكاء الاصطناعي من كونه تجربة إلى أداة يومية للباحثين عن عمل. في 2025، يستطيع AI صياغة نقاط، اقتراح كلمات مفتاحية، ترجمة السير، وتقييم توافق ATS — لكنه لا يغني عن حكمك وصدقك وقصتك المهنية.",
      },
    },
    {
      type: "image",
      src: "/blog/ai-resume-writing.svg",
      alt: { en: "AI-assisted resume writing", ar: "كتابة سيرة بمساعدة الذكاء الاصطناعي" },
    },
    {
      type: "heading",
      text: { en: "What AI does well", ar: "ما يجيده الذكاء الاصطناعي" },
    },
    {
      type: "list",
      items: [
        { en: "Turning rough notes into polished bullet points", ar: "تحويل ملاحظات خام إلى نقاط مصقولة" },
        { en: "Matching language to a job description", ar: "مواءمة اللغة مع وصف الوظيفة" },
        { en: "Fixing grammar and tone in Arabic and English", ar: "تصحيح القواعد والنبرة بالعربية والإنجليزية" },
        { en: "Suggesting skills you may have undersold", ar: "اقتراح مهارات ربما لم تبرزها" },
        { en: "Speeding up first drafts dramatically", ar: "تسريع المسودة الأولى بشكل كبير" },
      ],
    },
    {
      type: "heading",
      text: { en: "Where AI falls short", ar: "أين يقصر AI" },
    },
    {
      type: "paragraph",
      text: {
        en: "Models can invent employers, inflate titles, or produce generic phrases every candidate shares. They may miss context — visa status, local licensing, or industry nuance in Saudi Arabia. Always verify every fact against your real history.",
        ar: "قد يختلق النماذج جهات عمل أو يبالغ في المسميات أو يُنتج عبارات عامة يكررها الجميع. قد يفوت السياق — الإقامة، التراخيص المحلية، أو تفاصيل السوق السعودي. تحقق دائماً من كل حقيقة.",
      },
    },
    {
      type: "tip",
      text: {
        en: "Never submit AI output without reading every line aloud. If it sounds unlike you, rewrite it.",
        ar: "لا ترسل مخرجات AI دون قراءة كل سطر بصوت عالٍ. إن لم يبدُ كأنك أنت، أعد الصياغة.",
      },
    },
    {
      type: "heading",
      text: { en: "The human-in-the-loop workflow", ar: "سير العمل: الإنسان في الحلقة" },
    },
    {
      type: "paragraph",
      text: {
        en: "The best results follow a simple loop: you provide raw facts → AI structures and improves → you edit for truth and voice → you tailor per job. Treat AI as a co-writer, not an autopilot.",
        ar: "أفضل النتائج تتبع حلقة بسيطة: تقدّم الحقائق → AI ينظم ويحسّن → أنت تعدّل للصدق والأسلوب → تخصّص لكل وظيفة. عامل AI كمساعد كتابة لا كطيار آلي.",
      },
    },
    {
      type: "heading",
      text: { en: "Tailoring with AI responsibly", ar: "التخصيص بمسؤولية" },
    },
    {
      type: "list",
      items: [
        { en: "Paste the job description and ask for keyword alignment — not fabrication", ar: "الصق الوصف واطلب مواءمة كلمات — لا اختلاقاً" },
        { en: "Reorder bullets to lead with relevant experience", ar: "رتّب النقاط لتبدأ بالخبرة الأكثر صلة" },
        { en: "Adjust summary to mirror the role level (junior vs senior)", ar: "عدّل الملخص ليتماشى مع مستوى الدور" },
        { en: "Keep one master CV; save tailored versions per application", ar: "احتفظ بسيرة رئيسية ونسخ مخصصة لكل تقديم" },
      ],
    },
    {
      type: "heading",
      text: { en: "Ethics and employer expectations", ar: "الأخلاقيات وتوقعات أصحاب العمل" },
    },
    {
      type: "paragraph",
      text: {
        en: "Using AI to write your resume is widely accepted — lying on it is not. Employers care about accurate skills and outcomes. Transparency about AI assistance is rarely required; accuracy is always required.",
        ar: "استخدام AI لكتابة السيرة مقبول على نطاق واسع — الكذب غير مقبول. أصحاب العمل يهتمون بالمهارات والنتائج الدقيقة. الشفافية عن AI نادراً ما تُطلب؛ الدقة مطلوبة دائماً.",
      },
    },
    {
      type: "heading",
      text: { en: "ATS + AI: the winning combination", ar: "ATS + AI: المزيج الفائز" },
    },
    {
      type: "paragraph",
      text: {
        en: "AI can optimize wording, but only a clean ATS layout ensures parsing succeeds. Combine AI-improved content with single-column PDFs, standard headings, and real text — the approach platforms like Nashmi are built around.",
        ar: "AI يحسّن الصياغة، لكن تنسيق ATS نظيف يضمن نجاح التحليل. اجمع محتوى محسّناً بـ AI مع PDF عمود واحد وعناوين قياسية ونص حقيقي — وهذا ما تبني عليه منصات مثل نشمي.",
      },
    },
    {
      type: "heading",
      text: { en: "2025 trends to watch", ar: "اتجاهات 2025" },
    },
    {
      type: "list",
      items: [
        { en: "Real-time JD matching scores during editing", ar: "درجات مطابقة فورية أثناء التحرير" },
        { en: "Bilingual AI translation with human polish", ar: "ترجمة AI ثنائية اللغة مع مراجعة بشرية" },
        { en: "Voice-to-CV input for faster drafting", ar: "إدخال صوتي للسيرة لتسريع المسودة" },
        { en: "Stricter detection of inflated AI claims", ar: "كشف أدق للادعاءات المبالغ فيها" },
      ],
    },
    {
      type: "tip",
      text: {
        en: "Your competitive edge in 2025: AI speed + your authentic achievements + ATS-safe formatting.",
        ar: "ميزتك التنافسية في 2025: سرعة AI + إنجازاتك الحقيقية + تنسيق ATS آمن.",
      },
    },
  ],
};
