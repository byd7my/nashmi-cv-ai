import { NASHMI_CONTACT_EMAIL } from "@/nashmi/lib/site-contact";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

function buildText(name: string, isAr: boolean): string {
  const greeting = isAr
    ? `مرحباً${name ? ` ${name}` : ""}`
    : `Hi${name ? ` ${name}` : ""}`;
  const body = isAr
    ? "سيرتك الذاتية الجديدة جاهزة! تجدها مرفقة بهذا البريد بصيغة PDF."
    : "Your new resume is ready! You'll find it attached as a PDF.";
  const footer = isAr
    ? "نشمي — nashmi.club"
    : "Nashmi — nashmi.club";
  return `${greeting}\n\n${body}\n\n${footer}`;
}

function resolveFromAddress(): string {
  const defaultFrom = "Nashmi <no-reply@nashmi.club>";
  const configured = process.env.EMAIL_FROM?.trim();
  if (!configured) return defaultFrom;

  // Resend requires: "Name <email@domain.com>"
  const namedFormat = /^.+\s+<[^@\s]+@[^>\s]+>$/;
  if (namedFormat.test(configured)) return configured;

  const angleEmail = configured.match(/^<([^>\s]+@[^>\s]+)>$/);
  if (angleEmail) return `Nashmi <${angleEmail[1]}>`;

  if (EMAIL_RE.test(configured)) return `Nashmi <${configured}>`;

  console.warn("[api/send-cv] Invalid EMAIL_FROM format, using default:", configured);
  return defaultFrom;
}

export async function handleSendCvRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[api/send-cv] RESEND_API_KEY is not set");
    return Response.json({ error: "RESEND_API_KEY is not set on Vercel" }, { status: 500 });
  }

  let body: {
    to?: string;
    name?: string;
    lang?: string;
    attachments?: { filename: string; content: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, name, lang, attachments } = body;

  if (!to || typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    return Response.json({ error: "Invalid recipient email" }, { status: 400 });
  }
  if (!Array.isArray(attachments) || attachments.length < 1 || attachments.length > 2) {
    return Response.json({ error: "Expected 1-2 PDF attachments" }, { status: 400 });
  }

  let totalChars = 0;
  for (const a of attachments) {
    if (!a || typeof a.filename !== "string" || !a.filename.toLowerCase().endsWith(".pdf") || typeof a.content !== "string" || !a.content.length) {
      return Response.json({ error: "Invalid attachment" }, { status: 400 });
    }
    totalChars += a.content.length;
  }
  if (totalChars > MAX_TOTAL_ATTACHMENT_CHARS) {
    return Response.json({ error: "Attachments too large to email" }, { status: 413 });
  }

  const isAr = lang === "ar";
  const safeName = typeof name === "string" ? name.trim().slice(0, 80) : "";
  const subject = isAr ? "سيرتك الذاتية من نشمي جاهزة ✦" : "Your resume from Nashmi is ready ✦";
  const from = resolveFromAddress();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || NASHMI_CONTACT_EMAIL;

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
        reply_to: replyTo,
        subject,
        html: buildHtml(safeName, isAr),
        text: buildText(safeName, isAr),
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: a.content,
        })),
        tags: [{ name: "source", value: "nashmi-export" }],
      }),
    });

    const data = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      const errMsg = (data as { message?: string; error?: string })?.message || (data as { error?: string })?.error || `Email service error ${resendRes.status}`;
      console.error("[api/send-cv] Resend error", { status: resendRes.status, data, from, to: to.trim() });
      const friendly = /invalid.*from/i.test(errMsg)
        ? "Invalid sender address. Set EMAIL_FROM to: Nashmi <no-reply@nashmi.club>"
        : errMsg;
      return Response.json({ error: friendly }, { status: resendRes.status });
    }

    console.info("[api/send-cv] Sent", { id: (data as { id?: string })?.id, to: to.trim(), from });
    return Response.json({ ok: true, id: (data as { id?: string })?.id || null });
  } catch (err) {
    console.error("[api/send-cv] Unhandled error", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to send email" }, { status: 500 });
  }
}
