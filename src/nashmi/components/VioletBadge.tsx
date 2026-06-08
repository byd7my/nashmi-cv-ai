import { P } from "@/nashmi/lib/tokens";

export function VioletBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: `${P.violet}22`, border: `1px solid ${P.violet}55`,
      color: P.violetLight, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      padding: "5px 14px", borderRadius: 20, display: "inline-block",
    }}>{children}</span>
  );
}
