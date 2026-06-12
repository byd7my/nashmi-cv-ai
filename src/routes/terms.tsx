import { createFileRoute, Link } from "@tanstack/react-router";
import { P, FF } from "@/nashmi/lib/tokens";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام — نشمي" },
      { name: "description", content: "الشروط والأحكام الخاصة باستخدام منصة نشمي." },
      { property: "og:title", content: "الشروط والأحكام — نشمي" },
      { property: "og:description", content: "اطلع على شروط استخدام منصة نشمي قبل البدء." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div dir="rtl" style={{ background: P.bg, color: P.text, minHeight: "100vh", fontFamily: FF }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px" }}>
        <Link to="/" style={{ color: P.violetLight, fontSize: 13, textDecoration: "none" }}>← العودة للرئيسية</Link>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: "20px 0 24px" }}>الشروط والأحكام</h1>
        <p style={{ color: P.muted, fontSize: 13, marginBottom: 32 }}>آخر تحديث: 9 يونيو 2026</p>

        <Section title="قبول الشروط">
          باستخدامك لمنصة <strong>نشمي</strong>، فإنك توافق على الالتزام بهذه الشروط والأحكام كاملةً. إذا لم توافق على أي بند، يُرجى التوقف عن استخدام المنصة.
        </Section>

        <Section title="استخدام الخدمة">
          <ul style={ulStyle}>
            <li>يُسمح باستخدام المنصة للأغراض الشخصية والمهنية فقط.</li>
            <li>يُمنع استخدام المنصة لأي نشاط غير قانوني أو ضار.</li>
            <li>أنت مسؤول عن دقة المعلومات التي تدخلها في سيرتك الذاتية.</li>
          </ul>
        </Section>

        <Section title="الباقات والمدفوعات">
          <ul style={ulStyle}>
            <li>جميع الأسعار بالريال السعودي وتشمل ما يلزم من ضرائب.</li>
            <li>الدفع لمرة واحدة يمنحك صلاحيات الباقة المختارة وفقًا للوصف المعلن — جلسة سيرة واحدة لكل عملية شراء.</li>
            <li>المبالغ المدفوعة غير قابلة للاسترداد بعد تفعيل التصدير.</li>
          </ul>
        </Section>

        <Section title="الملكية الفكرية">
          جميع حقوق التصميم والقوالب والشعارات مملوكة لمنصة نشمي. أما محتوى سيرتك الذاتية فهو ملكٌ لك بالكامل.
        </Section>

        <Section title="حدود المسؤولية">
          نقدم خدماتنا "كما هي" دون أي ضمانات بشأن الحصول على وظيفة. منصة نشمي ليست مسؤولة عن قرارات التوظيف الصادرة عن الجهات التي تتقدم إليها.
        </Section>

        <Section title="تعديل الشروط">
          نحتفظ بحق تعديل هذه الشروط في أي وقت، وسيتم إشعار المستخدمين بأي تغييرات جوهرية.
        </Section>

        <Section title="التواصل والدعم">
          لأي استفسار، تواصل معنا عبر واتساب: <a href="https://api.whatsapp.com/send?phone=966552967837" target="_blank" rel="noreferrer" style={{ color: P.violetLight }}>+966 55 296 7837</a>
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
