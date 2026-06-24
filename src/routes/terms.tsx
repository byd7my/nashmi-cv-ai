import { createFileRoute, Link } from "@tanstack/react-router";
import { P, FF } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_AR } from "@/nashmi/lib/site-contact";

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
        <p style={{ color: P.muted, fontSize: 13, marginBottom: 32 }}>آخر تحديث: 13 يونيو 2026</p>

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
            <li>تتم معالجة المدفوعات عبر مزود دفع مرخّص (مثل Tap Payments) ولا نخزّن بيانات بطاقتك على خوادمنا.</li>
          </ul>
        </Section>

        <Section title="سياسة الاسترجاع (منتج رقمي)">
          <ul style={ulStyle}>
            <li>نشمي يبيع خدمة رقمية (إنشاء وتصدير سيرة ذاتية بصيغة PDF متوافقة مع ATS).</li>
            <li>بعد تحميل أو تصدير ملف PDF بنجاح، تُعتبر الخدمة مُقدَّمة بالكامل و<strong>لا يحق الاسترجاع</strong> وفق طبيعة المنتجات الرقمية.</li>
            <li>استثناءات قد نقبل فيها مراجعة الطلب: خطأ تقني يمنع التصدير رغم الدفع، أو خصم مكرر لنفس العملية — تواصل معنا خلال 7 أيام مع رقم العملية.</li>
            <li>المعاينة المجانية متاحة قبل الدفع؛ يرجى التأكد من مناسبة الباقة قبل إتمام الشراء.</li>
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
          لأي استفسار أو طلب متعلق بالدفع أو الاسترجاع، تواصل معنا عبر:
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
