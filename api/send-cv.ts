const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vercel body limit is ~4.5MB; keep a safety margin for the JSON envelope.
const MAX_TOTAL_ATTACHMENT_CHARS = 4_000_000;

function buildHtml(name: string, isAr: boolean): string {
  const greeting = isAr
    ? `مرحباً${name ? ` ${name}` : ""} 👋`
    : `Hi${name ? ` ${name}` : ""} 👋`;
  const body = isAr
    ? "سيرتك الذاتية الجديدة جاهزة! تجدها مرفقة بهذا البريد بصيغة PDF متوافقة مع أنظمة التوظيف (ATS)."
    : "Your new resume is ready! You'll find it attached to this email as an ATS-friendly PDF.";
  const tip = isAr
    ? "نتمنى لك التوفيق في مسيرتك المهنية ✦"
    : "We wish you the best of luck in your career ✦";
  const footer = isAr
    ? "تم إنشاء هذه السيرة عبر منصة نشمي لبناء السير الذاتية بالذكاء الاصطناعي."
    : "This resume was created with Nashmi, the AI resume builder.";

  return `
  <div dir="${isAr ? "rtl" : "ltr"}" style="font-family: Tahoma, Arial, sans-serif; background: #F4F2FF; padding: 32px 16px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E4E0F5;">
      <div style="background: linear-gradient(135deg, #7C5CFF, #9B82FF); padding: 28px 24px; text-align: center;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: rgba(255,255,255,0.18); color: #fff; font-size: 24px; font-weight: 900;">N</div>
        <div style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 10px;">${isAr ? "نشمي | Nashmi" : "Nashmi | نشمي"}</div>
      </div>
      <div style="padding: 28px 24px; color: #2A2440;">
        <p style="font-size: 16px; font-weight: 700; margin: 0 0 12px;">${greeting}</p>
        <p style="font-size: 14px; line-height: 1.8; margin: 0 0 12px;">${body}</p>
        <p style="font-size: 14px; line-height: 1.8; margin: 0; color: #7C5CFF; font-weight: 700;">${tip}</p>
      </div>
      <div style="padding: 16px 24px; background: #FAF9FF; border-top: 1px solid #E4E0F5; color: #8B86A8; font-size: 11px; text-align: center;">
        ${footer}
      </div>
    </div>
  </div>`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "RESEND_API_KEY is not set on Vercel" });
  }

  const { to, name, lang, attachments } = req.body || {};

  if (!to || typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    return res.status(400).json({ error: "Invalid recipient email" });
  }
  if (!Array.isArray(attachments) || attachments.length < 1 || attachments.length > 2) {
    return res.status(400).json({ error: "Expected 1-2 PDF attachments" });
  }

  let totalChars = 0;
  for (const a of attachments) {
    if (!a || typeof a.filename !== "string" || !a.filename.toLowerCase().endsWith(".pdf") || typeof a.content !== "string" || !a.content.length) {
      return res.status(400).json({ error: "Invalid attachment" });
    }
    totalChars += a.content.length;
  }
  if (totalChars > MAX_TOTAL_ATTACHMENT_CHARS) {
    return res.status(413).json({ error: "Attachments too large to email" });
  }

  const isAr = lang === "ar";
  const safeName = typeof name === "string" ? name.trim().slice(0, 80) : "";
  const subject = isAr ? "سيرتك الذاتية من نشمي جاهزة ✦" : "Your resume from Nashmi is ready ✦";
  const from = process.env.EMAIL_FROM || "Nashmi <onboarding@resend.dev>";

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to.trim()],
        subject,
        html: buildHtml(safeName, isAr),
        attachments: attachments.map((a: { filename: string; content: string }) => ({
          filename: a.filename,
          content: a.content,
        })),
      }),
    });

    const data = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      return res.status(resendRes.status).json({
        error: data?.message || data?.error || `Email service error ${resendRes.status}`,
      });
    }

    return res.status(200).json({ ok: true, id: data?.id || null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to send email" });
  }
}
