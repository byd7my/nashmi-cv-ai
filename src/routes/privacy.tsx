import { createFileRoute, Link } from "@tanstack/react-router";
import { P, FF } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_AR } from "@/nashmi/lib/site-contact";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — نشمي" },
      { name: "description", content: "سياسة الخصوصية الخاصة بمنصة نشمي لبناء السير الذاتية." },
      { property: "og:title", content: "سياسة الخصوصية — نشمي" },
      { property: "og:description", content: "تعرف على كيفية حماية بياناتك في منصة نشمي." },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div dir="rtl" style={{ background: P.bg, color: P.text, minHeight: "100vh", fontFamily: FF }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px" }}>
        <Link to="/" style={{ color: P.violetLight, fontSize: 13, textDecoration: "none" }}>← العودة للرئيسية</Link>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: "20px 0 24px" }}>سياسة الخصوصية</h1>
        <p style={{ color: P.muted, fontSize: 13, marginBottom: 32 }}>آخر تحديث: 13 يونيو 2026</p>

        <Section title="مقدمة">
          نلتزم في منصة <strong>نشمي</strong> بحماية خصوصية مستخدمينا. توضح هذه السياسة كيفية جمع واستخدام وحماية المعلومات التي تقدمها لنا عند استخدامك للمنصة.
        </Section>

        <Section title="المعلومات التي نجمعها">
          <ul style={ulStyle}>
            <li>المعلومات الشخصية التي تدخلها في سيرتك الذاتية (الاسم، البريد الإلكتروني، الخبرات، التعليم).</li>
            <li>معلومات الدفع عند شراء إحدى الباقات (يتم معالجتها عبر مزودي دفع موثوقين).</li>
            <li>بيانات الاستخدام التحليلية لتحسين تجربتك.</li>
          </ul>
        </Section>

        <Section title="كيف نستخدم معلوماتك">
          <ul style={ulStyle}>
            <li>تقديم خدمات إنشاء السيرة الذاتية وتصديرها.</li>
            <li>معالجة المدفوعات (دفعة واحدة لكل باقة) عبر مزود دفع مرخّص — لا نخزّن بيانات البطاقة.</li>
            <li>تحسين المنصة وتطوير ميزات جديدة.</li>
            <li>التواصل معك بشأن الدعم الفني والتحديثات.</li>
          </ul>
        </Section>

        <Section title="حماية البيانات">
          نستخدم تقنيات تشفير حديثة لحماية بياناتك. لا نقوم ببيع أو تأجير معلوماتك الشخصية لأي طرف ثالث.
        </Section>

        <Section title="حقوقك">
          يحق لك الوصول إلى بياناتك أو تعديلها أو طلب حذفها في أي وقت من خلال التواصل معنا.
        </Section>

        <Section title="التواصل معنا">
          لأي استفسار يخص الخصوصية:
          <ul style={{ ...ulStyle, marginTop: 12 }}>
            <li>واتساب: <a href={NASHMI_WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: P.violetLight }}>{NASHMI_WHATSAPP_DISPLAY_AR}</a></li>
            <li>البريد: <a href="mailto:nashmicv@outlook.com" style={{ color: P.violetLight }}>nashmicv@outlook.com</a></li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

const ulStyle: React.CSSProperties = { paddingInlineStart: 20, color: P.textSub, lineHeight: 2, fontSize: 15 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: P.text }}>{title}</h2>
      <div style={{ color: P.textSub, lineHeight: 2, fontSize: 15 }}>{children}</div>
    </section>
  );
}
