import { P, FF } from "@/nashmi/lib/tokens";
import { VioletBadge } from "@/nashmi/components/VioletBadge";
import type { UserReview } from "@/nashmi/lib/reviews";
import type { TrLang } from "@/nashmi/lib/translations";

interface ReviewsSectionProps {
  lang: TrLang;
  reviews: UserReview[];
}

export function ReviewsSection({ lang, reviews }: ReviewsSectionProps) {
  const isAr = lang === "ar";
  const ff = FF;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px", direction: isAr ? "rtl" : "ltr" }}>
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{ marginBottom: 12 }}>
          <VioletBadge>{isAr ? "آراء العملاء" : "Testimonials"}</VioletBadge>
        </div>
        <h2 style={{ color: P.text, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 900, fontFamily: ff }}>
          {isAr ? "تقييم أصدقاء نشمي" : "Reviews from Nashmi Friends"}
        </h2>
        {reviews.length > 0 && (
          <p style={{ color: P.muted, fontSize: 13, marginTop: 10 }}>
            {isAr
              ? `${reviews.length} ${reviews.length === 1 ? "تقييم" : "تقييماً"} من المستخدمين`
              : `${reviews.length} review${reviews.length === 1 ? "" : "s"} from real users`}
          </p>
        )}
      </div>

      {reviews.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: 20,
          }}
        >
          {reviews.map((r) => {
            const stars = Math.min(5, Math.max(1, r.rating));
            const displayName =
              r.name && r.name.trim() ? r.name : isAr ? "صديق نشمي" : "Nashmi Friend";
            const initials =
              displayName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase() || (isAr ? "نش" : "N");

            return (
              <div
                key={r.id}
                style={{
                  background: `linear-gradient(160deg, ${P.violet}1A, ${P.card} 70%)`,
                  border: `1px solid ${P.violet}55`,
                  borderRadius: 18,
                  padding: "26px 22px",
                  position: "relative",
                  boxShadow: `0 0 30px ${P.violet}1A`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    [isAr ? "left" : "right"]: 16,
                    background: `${P.violet}33`,
                    color: P.violetLight,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 99,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {isAr ? "جديد" : "New"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${P.violet}66, ${P.violetLight}44)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      color: P.violetLight,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ color: P.text, fontWeight: 700, fontSize: 14, fontFamily: ff }}>
                      {displayName}
                    </div>
                    <div style={{ color: P.muted, fontSize: 12 }}>
                      {isAr ? "تقييم بعد التصدير" : "Posted after export"}
                    </div>
                  </div>
                </div>
                <div style={{ color: P.gold, marginBottom: 8, letterSpacing: 2 }}>
                  {"★".repeat(stars)}
                  <span style={{ color: `${P.muted}66` }}>{"★".repeat(5 - stars)}</span>
                </div>
                <p style={{ color: P.textSub, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  "{r.text}"
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            textAlign: "center",
            background: `linear-gradient(160deg, ${P.violet}14, ${P.card} 70%)`,
            border: `1px dashed ${P.violet}55`,
            borderRadius: 18,
            padding: "40px 28px",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
          <div style={{ color: P.text, fontWeight: 800, fontSize: 17, fontFamily: ff, marginBottom: 8 }}>
            {isAr ? "كن أول من يقيّم نشمي" : "Be the first to review Nashmi"}
          </div>
          <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.7 }}>
            {isAr
              ? "أنشئ سيرتك الذاتية وقيّم تجربتك عند التصدير — سيظهر رأيك هنا مباشرة."
              : "Build your resume and rate your experience at export — your review will appear here instantly."}
          </p>
        </div>
      )}
    </div>
  );
}
