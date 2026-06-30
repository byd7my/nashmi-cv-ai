import { useEffect, useRef, useState } from "react";
import { P, FF, KEYFRAMES } from "@/nashmi/lib/tokens";
import { VioletBadge } from "@/nashmi/components/VioletBadge";
import { PageShell } from "@/nashmi/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

export const JOBS_BOT_TELEGRAM_URL = "https://t.me/Nashmi_Jobsbot";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
  onLangToggle: () => void;
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function RevealSection({ id, children }: { id?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  return (
    <section
      id={id}
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: "opacity 0.65s ease, transform 0.65s ease",
      }}
    >
      {children}
    </section>
  );
}

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.93 3.821c.321-1.496-.541-2.081-1.527-1.725L1.114 9.939c-1.453.564-1.431 1.374-.247 1.741l5.763 1.798L18.932 5.78c.609-.402 1.164-.179.707.231L9.417 15.18z" />
    </svg>
  );
}

function TelegramCta({
  children,
  large = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  large?: boolean;
  variant?: "primary" | "outline";
}) {
  const isPrimary = variant === "primary";
  return (
    <Button
      asChild
      size={large ? "lg" : "default"}
      variant={isPrimary ? "default" : "outline"}
      className="font-extrabold"
      style={{
        fontFamily: FF,
        borderRadius: 12,
        padding: large ? "16px 32px" : "12px 22px",
        fontSize: large ? 17 : 15,
        background: isPrimary ? `linear-gradient(135deg, ${P.violet}, ${P.violetLight})` : "transparent",
        border: isPrimary ? "none" : `1px solid ${P.borderLight}`,
        color: isPrimary ? "#fff" : P.text,
        boxShadow: isPrimary ? `0 6px 28px ${P.violet}55` : "none",
        height: "auto",
      }}
    >
      <a href={JOBS_BOT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
        <TelegramIcon size={large ? 22 : 18} />
        {children}
      </a>
    </Button>
  );
}

const STEPS = [
  {
    icon: "📝",
    title: "سجّل بياناتك",
    desc: "سجّل تخصصك ومنطقتك ومؤهلك وارفع سيرتك الذاتية مرة واحدة فقط",
  },
  {
    icon: "⚡",
    title: "فعّل التقديم التلقائي",
    desc: "اختر الباقة المناسبة لك وفعّل البوت ليبدأ العمل نيابة عنك",
  },
  {
    icon: "🔔",
    title: "استرخِ وتابع النتائج",
    desc: "البوت يقدّم على الوظائف المناسبة تلقائياً ويرسل لك إشعاراً بكل تقديم",
  },
] as const;

const FEATURES = [
  { icon: "📧", title: "يقدّم من بريدك الإلكتروني أنت مباشرة", desc: "طلب رسمي حقيقي وليس مجرد زر" },
  { icon: "✨", title: "خطاب تقديم مخصص لكل وظيفة", desc: "بالذكاء الاصطناعي وفق سيرتك وتخصصك" },
  { icon: "🔎", title: "يبحث في عدة مصادر وظائف", desc: "ليس مصدراً واحداً — تغطية أوسع لفرصك" },
  { icon: "🎯", title: "مطابقة ذكية", desc: "بين الوظيفة وتخصصك ومنطقتك ومؤهلك وخبرتك" },
  { icon: "🌙", title: "يعمل على مدار الساعة", desc: "بدون أي متابعة منك — حتى وأنت نايم" },
  { icon: "🔒", title: "بياناتك مشفّرة وآمنة", desc: "خصوصيتك أولوية — تخزين آمن بالكامل" },
] as const;

const PLANS = [
  { emoji: "🚀", name: "انطلاق", duration: "7 أيام", price: "15", highlight: false },
  { emoji: "💼", name: "احترافية", duration: "30 يوم", price: "39", highlight: true, popular: true },
  { emoji: "👑", name: "النخبة", duration: "90 يوم", price: "99", highlight: false },
] as const;

const pageStyles = `
  ${KEYFRAMES}
  .jobs-bot-page { direction: rtl; }
  .jobs-steps-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
  .jobs-features-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .jobs-pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    align-items: center;
  }
  @media (max-width: 900px) {
    .jobs-features-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 768px) {
    .jobs-steps-grid,
    .jobs-pricing-grid { grid-template-columns: 1fr; }
    .jobs-pricing-popular { transform: none !important; }
  }
  @media (max-width: 560px) {
    .jobs-features-grid { grid-template-columns: 1fr; }
  }
`;

export function JobsBotPage({ lang, t, onNav, onLangToggle }: Props) {
  const ff = FF;

  return (
    <PageShell lang={lang} t={t} onNav={onNav} onLangToggle={onLangToggle} page="jobs-bot">
      <style>{pageStyles}</style>
      <div className="jobs-bot-page" style={{ fontFamily: ff, color: P.text }}>

        {/* Hero */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            paddingTop: "clamp(88px, 14vw, 128px)",
            paddingBottom: "clamp(48px, 10vw, 88px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(165deg, ${P.bg} 0%, ${P.violetDim}55 45%, ${P.bg} 100%)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "8%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(720px, 90vw)",
              height: 320,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${P.violet}28 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "20%",
              right: "8%",
              width: 120,
              height: 120,
              borderRadius: 20,
              border: `1px dashed ${P.violet}44`,
              animation: "spinSlow 18s linear infinite",
              opacity: 0.35,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "18%",
              left: "10%",
              fontSize: 28,
              opacity: 0.5,
              animation: "bounce3 2.4s ease-in-out infinite",
              pointerEvents: "none",
            }}
          >
            ⚡
          </div>

          <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "0 20px" }}>
            <div style={{ marginBottom: 18, animation: "fadeUp 0.6s ease both" }}>
              <VioletBadge>بوت تيليجرام · تقديم تلقائي على الوظائف</VioletBadge>
            </div>
            <h1
              style={{
                fontSize: "clamp(30px, 6vw, 56px)",
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: 18,
                animation: "fadeUp 0.6s ease 0.08s both",
              }}
            >
              وأنت نايم…{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                نشمي يقدّم عنك
              </span>
            </h1>
            <p
              style={{
                color: P.textSub,
                fontSize: "clamp(15px, 2.5vw, 18px)",
                lineHeight: 1.85,
                maxWidth: 640,
                margin: "0 auto 28px",
                animation: "fadeUp 0.6s ease 0.16s both",
              }}
            >
              بوت تيليجرام يقدّم على الوظائف المناسبة تلقائياً من بريدك الإلكتروني — مع خطاب تقديم مخصص
              لكل وظيفة بالذكاء الاصطناعي. لا متابعة يدوية، لا تعب.
            </p>
            <div style={{ animation: "fadeUp 0.6s ease 0.24s both" }}>
              <TelegramCta large>ابدأ الآن على تيليجرام</TelegramCta>
            </div>
          </div>
        </section>

        {/* How it works */}
        <RevealSection id="how-it-works">
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(32px, 6vw, 72px) 20px" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <VioletBadge>كيف يعمل البوت</VioletBadge>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 900, marginTop: 14 }}>ثلاث خطوات وتبدأ</h2>
            </div>
            <div className="jobs-steps-grid">
              {STEPS.map((step, i) => (
                <Card
                  key={step.title}
                  style={{
                    background: P.card,
                    border: `1px solid ${P.border}`,
                    borderRadius: 18,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
                  }}
                >
                  <CardContent style={{ padding: "24px 20px" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: `${P.violet}22`,
                        border: `1px solid ${P.violet}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        marginBottom: 14,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div style={{ color: P.violetLight, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                      الخطوة {i + 1}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: P.text }}>{step.title}</h3>
                    <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Features */}
        <RevealSection id="features">
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "clamp(32px, 6vw, 64px) 20px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900 }}>لماذا بوت نشمي؟</h2>
              <p style={{ color: P.muted, fontSize: 15, marginTop: 10 }}>مميزات تجعل التقديم أذكى وأسرع</p>
            </div>
            <div className="jobs-features-grid">
              {FEATURES.map((f) => (
                <Card
                  key={f.title}
                  style={{
                    background: P.surface,
                    border: `1px solid ${P.border}`,
                    borderRadius: 16,
                    height: "100%",
                  }}
                >
                  <CardContent style={{ padding: "20px 18px" }}>
                    <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: P.text, marginBottom: 8, lineHeight: 1.5 }}>
                      {f.title}
                    </h3>
                    <p style={{ color: P.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Pricing */}
        <RevealSection id="pricing">
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(40px, 7vw, 80px) 20px" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <VioletBadge>خطط الاشتراك</VioletBadge>
              <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 900, marginTop: 14 }}>اختر باقتك</h2>
              <p style={{ color: P.muted, fontSize: 15, marginTop: 10 }}>ادفع مرة واحدة وفعّل البوت على تيليجرام</p>
            </div>
            <div className="jobs-pricing-grid">
              {PLANS.map((plan) => (
                <Card
                  key={plan.name}
                  className={plan.highlight ? "jobs-pricing-popular" : undefined}
                  style={{
                    background: plan.highlight
                      ? `linear-gradient(160deg, ${P.violet}1A, ${P.card} 60%)`
                      : P.card,
                    border: `1px solid ${plan.highlight ? P.violet : P.border}`,
                    borderRadius: 20,
                    padding: "28px 22px",
                    position: "relative",
                    boxShadow: plan.highlight
                      ? `0 0 40px ${P.violet}2A, 0 16px 48px rgba(0,0,0,0.3)`
                      : "0 4px 16px rgba(0,0,0,0.2)",
                    transform: plan.highlight ? "translateY(-6px) scale(1.03)" : "none",
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "4px 14px",
                        borderRadius: 99,
                        whiteSpace: "nowrap",
                      }}
                    >
                      الأكثر طلباً
                    </div>
                  )}
                  <CardContent style={{ padding: 0, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{plan.emoji}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{plan.name}</div>
                    <div style={{ color: P.muted, fontSize: 14, marginBottom: 16 }}>المدة: {plan.duration}</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, marginBottom: 22 }}>
                      <span
                        style={{
                          fontSize: plan.highlight ? 40 : 34,
                          fontWeight: 900,
                          color: plan.highlight ? P.violetLight : P.text,
                        }}
                      >
                        {plan.price}
                      </span>
                      <span style={{ color: P.muted, fontSize: 15, fontWeight: 700 }}>ر.س</span>
                    </div>
                    <TelegramCta variant={plan.highlight ? "primary" : "outline"}>اشترك الآن</TelegramCta>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Trust */}
        <RevealSection>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              padding: "clamp(36px, 6vw, 56px) 24px",
              textAlign: "center",
              background: P.surface,
              borderTop: `1px solid ${P.border}`,
              borderBottom: `1px solid ${P.border}`,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 14 }}>✦</div>
            <p style={{ color: P.textSub, fontSize: "clamp(16px, 2.5vw, 19px)", lineHeight: 2, margin: 0 }}>
              الرزق بيد الله — ونحن نوفّر لك السبب والجهد. بوت نشمي يسعى ليفتح لك الأبواب، وأنت تتوكل وتتابع
              بقلب مطمئن.
            </p>
          </div>
        </RevealSection>

        {/* Final CTA */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 20px",
            textAlign: "center",
            background: `linear-gradient(135deg, ${P.violetDim}, ${P.violet} 50%, ${P.violetLight})`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 30% 50%, ${P.violetLight}33 0%, transparent 55%)`,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 900, color: "#fff", marginBottom: 22 }}>
              جاهز تبدأ؟
            </h2>
            <TelegramCta large>ابدأ الآن على تيليجرام</TelegramCta>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
