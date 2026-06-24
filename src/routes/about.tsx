import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell, LegalSection, legalUlStyle } from "@/nashmi/components/LegalPageShell";
import { P } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_AR } from "@/nashmi/lib/site-contact";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — نشمي" },
      { name: "description", content: "تعرف على منصة نشمي لبناء السيرة الذاتية بالذكاء الاصطناعي." },
      { property: "og:title", content: "من نحن — نشمي" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <LegalPageShell lang="ar" page="about" title="من نحن" updated="آخر تحديث: 13 يونيو 2026">
      <LegalSection title="من نحن">
        <strong>نشمي (Nashmi)</strong> منصة سعودية رقمية متخصصة في بناء السيرة الذاتية بمساعدة الذكاء الاصطناعي،
        مع دعم كامل للغة العربية والإنجليزية وتصدير PDF متوافق مع أنظمة ATS.
      </LegalSection>

      <LegalSection title="ماذا نقدّم">
        <ul style={legalUlStyle}>
          <li>منشئ سيرة ذاتية احترافي (قالب كلاسيك ATS).</li>
          <li>تحليل ATS فوري ومطابقة وصف الوظيفة.</li>
          <li>مساعد ذكي لتحسين الملخص والخبرات والمهارات.</li>
          <li>استيراد سيرة موجودة (PDF، JSON، TXT، أو صورة).</li>
          <li>تصدير PDF ATS بجودة عالية بعد شراء الباقة.</li>
        </ul>
      </LegalSection>

      <LegalSection title="الأسعار">
        <ul style={legalUlStyle}>
          <li><strong>مبتدئ (0 ريال):</strong> معاينة مجانية ودرجة ATS — بدون تصدير PDF.</li>
          <li><strong>مميز (19.99 ريال):</strong> دفعة واحدة — سيرة واحدة (عربي أو إنجليزي) + AI + تصدير PDF.</li>
          <li><strong>النخبة (34.99 ريال):</strong> دفعة واحدة — سيرتان (عربي + إنجليزي) + AI + تصدير PDF.</li>
        </ul>
        <p style={{ marginTop: 12, color: P.muted, fontSize: 14 }}>
          جميع الأسعار بالريال السعودي. الدفع لمرة واحدة — بدون اشتراك شهري.{" "}
          <a href="/#pricing" style={{ color: P.violetLight }}>عرض الأسعار على الموقع</a>
        </p>
      </LegalSection>

      <LegalSection title="الدفع">
        تتم معالجة المدفوعات عبر مزود دفع مرخّص (Tap Payments). لا نخزّن بيانات بطاقتك على خوادمنا.
      </LegalSection>

      <LegalSection title="التواصل">
        <ul style={legalUlStyle}>
          <li>الموقع: <a href="https://www.nashmi.club" style={{ color: P.violetLight }}>www.nashmi.club</a></li>
          <li>واتساب: <a href={NASHMI_WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: P.violetLight }}>{NASHMI_WHATSAPP_DISPLAY_AR}</a></li>
          <li>البريد: <a href={`mailto:${NASHMI_CONTACT_EMAIL}`} style={{ color: P.violetLight }}>{NASHMI_CONTACT_EMAIL}</a></li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
