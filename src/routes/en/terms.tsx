import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell, LegalSection, legalUlStyle } from "@/nashmi/components/LegalPageShell";
import { P } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_EN } from "@/nashmi/lib/site-contact";

export const Route = createFileRoute("/en/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Nashmi" },
      { name: "description", content: "Terms and conditions for using Nashmi resume builder." },
      { property: "og:title", content: "Terms & Conditions — Nashmi" },
    ],
    links: [{ rel: "canonical", href: "/en/terms" }],
  }),
  component: TermsPageEn,
});

function TermsPageEn() {
  return (
    <LegalPageShell lang="en" page="terms" title="Terms & Conditions" updated="Last updated: 13 June 2026">
      <LegalSection title="Acceptance of terms">
        By using <strong>Nashmi</strong>, you agree to these Terms & Conditions in full. If you do not agree, please stop using the platform.
      </LegalSection>

      <LegalSection title="Use of the service">
        <ul style={legalUlStyle}>
          <li>The platform may be used for personal and professional purposes only.</li>
          <li>Illegal or harmful use is prohibited.</li>
          <li>You are responsible for the accuracy of information entered in your resume.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Plans and payments">
        <ul style={legalUlStyle}>
          <li>All prices are in Saudi Riyals and include applicable taxes where required.</li>
          <li>Each one-time payment grants the selected plan features as described — one resume session per purchase.</li>
          <li>Payments are processed by a licensed provider (Tap Payments). We do not store your card details on our servers.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Refund policy (digital product)" id="refund">
        <ul style={legalUlStyle}>
          <li>Nashmi sells a digital service (creating and exporting an ATS-compatible PDF resume).</li>
          <li>After a successful PDF download or export, the service is considered fully delivered and <strong>no refund</strong> applies, in line with digital goods policy.</li>
          <li>Exceptions we may review: a technical error preventing export despite payment, or a duplicate charge for the same transaction — contact us within 7 days with the transaction reference.</li>
          <li>A free preview is available before payment; please confirm the plan suits your needs before checkout.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Intellectual property">
        Design, templates, and branding rights belong to Nashmi. Your resume content remains fully yours.
      </LegalSection>

      <LegalSection title="Limitation of liability">
        Services are provided "as is" with no guarantee of employment. Nashmi is not responsible for hiring decisions by third parties.
      </LegalSection>

      <LegalSection title="Changes to terms">
        We may update these terms at any time and will notify users of material changes.
      </LegalSection>

      <LegalSection title="Contact and support">
        For payment or refund inquiries, contact us:
        <ul style={{ ...legalUlStyle, marginTop: 12 }}>
          <li>WhatsApp: <a href={NASHMI_WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: P.violetLight }}>{NASHMI_WHATSAPP_DISPLAY_EN}</a></li>
          <li>Email: <a href={`mailto:${NASHMI_CONTACT_EMAIL}`} style={{ color: P.violetLight }}>{NASHMI_CONTACT_EMAIL}</a></li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
