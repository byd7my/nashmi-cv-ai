import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell, LegalSection, legalUlStyle } from "@/nashmi/components/LegalPageShell";
import { P } from "@/nashmi/lib/tokens";
import { NASHMI_CONTACT_EMAIL, NASHMI_WHATSAPP_URL, NASHMI_WHATSAPP_DISPLAY_EN } from "@/nashmi/lib/site-contact";

export const Route = createFileRoute("/en/about")({
  head: () => ({
    meta: [
      { title: "About Us — Nashmi" },
      { name: "description", content: "Learn about Nashmi, the AI resume builder for Arabic and English." },
      { property: "og:title", content: "About Us — Nashmi" },
    ],
    links: [{ rel: "canonical", href: "/en/about" }],
  }),
  component: AboutPageEn,
});

function AboutPageEn() {
  return (
    <LegalPageShell lang="en" page="about" title="About Us" updated="Last updated: 13 June 2026">
      <LegalSection title="Who we are">
        <strong>Nashmi</strong> is a Saudi digital platform for building resumes with AI assistance,
        with full Arabic and English support and ATS-compatible PDF export.
      </LegalSection>

      <LegalSection title="What we offer">
        <ul style={legalUlStyle}>
          <li>Professional resume builder (Classic ATS template).</li>
          <li>Real-time ATS scoring and job-description matching.</li>
          <li>AI assistant to improve summary, experience, and skills.</li>
          <li>Import an existing resume (PDF, JSON, TXT, or photo).</li>
          <li>High-quality ATS PDF export after purchasing a plan.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Pricing">
        <ul style={legalUlStyle}>
          <li><strong>Starter (SAR 0):</strong> Free preview and ATS score — no PDF export.</li>
          <li><strong>Premium (SAR 19.99):</strong> One-time payment — one CV (Arabic OR English) + AI + PDF export.</li>
          <li><strong>Elite (SAR 34.99):</strong> One-time payment — two CVs (Arabic + English) + AI + PDF export.</li>
        </ul>
        <p style={{ marginTop: 12, color: P.muted, fontSize: 14 }}>
          All prices in Saudi Riyals. One-time payment — no monthly subscription.{" "}
          <a href="/#pricing" style={{ color: P.violetLight }}>View pricing on the site</a>
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        Payments are processed by a licensed provider (Tap Payments). We do not store card details on our servers.
      </LegalSection>

      <LegalSection title="Contact">
        <ul style={legalUlStyle}>
          <li>Website: <a href="https://www.nashmi.club" style={{ color: P.violetLight }}>www.nashmi.club</a></li>
          <li>WhatsApp: <a href={NASHMI_WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: P.violetLight }}>{NASHMI_WHATSAPP_DISPLAY_EN}</a></li>
          <li>Email: <a href={`mailto:${NASHMI_CONTACT_EMAIL}`} style={{ color: P.violetLight }}>{NASHMI_CONTACT_EMAIL}</a></li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
