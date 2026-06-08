import { P } from "@/nashmi/lib/tokens";

export function ATSRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? P.green : score >= 60 ? P.gold : P.red;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P.border} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={size/2} y={size/2} fill={color} fontSize={size * 0.21} fontWeight={800}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg) translate(0,-${size}px)` }}>
        {score}%
      </text>
    </svg>
  );
}
