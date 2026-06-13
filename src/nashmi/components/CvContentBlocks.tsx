import type { CSSProperties } from "react";

export function CvSkillTags({
  skills,
  accent,
  fontSize = 10,
}: {
  skills: string[];
  accent: string;
  fontSize?: number;
}) {
  if (!skills.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {skills.map((skill, i) => (
        <span
          key={`${skill}-${i}`}
          style={{
            fontSize,
            padding: "4px 10px",
            borderRadius: 999,
            background: `${accent}14`,
            border: `1px solid ${accent}40`,
            color: "#1a1a1a",
            lineHeight: 1.35,
            fontWeight: 500,
          }}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

export function CvLanguageTags({
  items,
  accent,
  fontSize = 10,
}: {
  items: { lang: string; level?: string }[];
  accent: string;
  fontSize?: number;
}) {
  const filtered = items.filter((l) => l.lang);
  if (!filtered.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {filtered.map((l, i) => (
        <span
          key={`${l.lang}-${i}`}
          style={{
            fontSize,
            padding: "4px 10px",
            borderRadius: 8,
            background: "#f4f6f8",
            border: "1px solid #dde3ea",
            color: "#222",
            lineHeight: 1.35,
          }}
        >
          {l.lang}
          {l.level ? ` · ${l.level}` : ""}
        </span>
      ))}
    </div>
  );
}

export function CvCertRow({
  title,
  issuer,
  date,
  fontSize = 10,
  smallSize = 9.5,
  stacked = false,
}: {
  title: string;
  issuer?: string;
  date?: string;
  fontSize?: number;
  smallSize?: number;
  stacked?: boolean;
}) {
  const metaStyle: CSSProperties = stacked
    ? {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
        marginTop: 3,
        fontSize: smallSize,
        color: "#666",
        flexWrap: "wrap",
      }
    : {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10,
        fontSize: smallSize,
        color: "#666",
        marginTop: 3,
      };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 700, fontSize, lineHeight: 1.45, color: "#111" }}>{title}</div>
      {(issuer || date) && (
        <div style={metaStyle}>
          {issuer ? <span style={{ flex: 1, minWidth: 0 }}>{issuer}</span> : <span />}
          {date ? <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{date}</span> : null}
        </div>
      )}
    </div>
  );
}

export function CvEntryHeader({
  primary,
  secondary,
  dateRange,
  fontSize = 10,
  smallSize = 9.5,
  stacked = false,
}: {
  primary: string;
  secondary?: string;
  dateRange?: string;
  fontSize?: number;
  smallSize?: number;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize, lineHeight: 1.45, color: "#111" }}>{primary}</div>
        {secondary ? (
          <div style={{ fontSize: smallSize, color: "#555", marginTop: 2 }}>{secondary}</div>
        ) : null}
        {dateRange ? (
          <div style={{ fontSize: smallSize, color: "#777", marginTop: 3 }}>{dateRange}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.4,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {primary}
        {secondary ? ` — ${secondary}` : ""}
      </span>
      {dateRange ? (
        <span style={{ color: "#666", fontSize: smallSize, whiteSpace: "nowrap", flexShrink: 0 }}>
          {dateRange}
        </span>
      ) : null}
    </div>
  );
}
