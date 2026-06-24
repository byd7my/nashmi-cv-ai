import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell, LegalSection, legalUlStyle } from "@/nashmi/components/LegalPageShell";
import { P } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_EN } from "@/nashmi/lib/site-contact";

export const Route = createFileRoute("/en/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Nashmi" },
      { name: "description", content: "Privacy policy for Nashmi AI resume builder." },
      { property: "og:title", content: "Privacy Policy — Nashmi" },
    ],
    links: [{ rel: "canonical", href: "/en/privacy" }],
  }),
  component: PrivacyPageEn,
});

function PrivacyPageEn() {
  return (
    <LegalPageShell lang="en" page="privacy" title="Privacy Policy" updated="Last updated: 13 June 2026">
      <LegalSection title="Introduction">
        At <strong>Nashmi</strong>, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard information you provide when using our platform.
      </LegalSection>

      <LegalSection title="Information we collect">
        <ul style={legalUlStyle}>
          <li>Personal information you enter in your resume (name, email, experience, education).</li>
          <li>Payment information when purchasing a plan (processed by Tap Payments — we do not store card details).</li>
          <li>Usage analytics to improve your experience.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use your information">
        <ul style={legalUlStyle}>
          <li>Providing resume creation and export services.</li>
          <li>Processing one-time payments via a licensed payment provider — we do not store card data.</li>
          <li>Improving the platform and developing new features.</li>
          <li>Contacting you regarding support and updates.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Data protection">
        We use modern encryption to protect your data. We do not sell or rent your personal information to third parties.
      </LegalSection>

      <LegalSection title="Your rights">
        You may access, update, or request deletion of your data at any time by contacting us.
      </LegalSection>

      <LegalSection title="Contact us">
        For privacy inquiries:
        <ul style={{ ...legalUlStyle, marginTop: 12 }}>
          <li>WhatsApp: <a href={NASHMI_WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: P.violetLight }}>{NASHMI_WHATSAPP_DISPLAY_EN}</a></li>
          <li>Email: <a href={`mailto:${NASHMI_CONTACT_EMAIL}`} style={{ color: P.violetLight }}>{NASHMI_CONTACT_EMAIL}</a></li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
