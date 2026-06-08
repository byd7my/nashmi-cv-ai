export const P = {
  bg:          "#0A0A0B",
  surface:     "#111118",
  card:        "#16161F",
  border:      "#1E1E2E",
  borderLight: "#2A2A3E",
  violet:      "#7C5CFF",
  violetLight: "#9B82FF",
  violetDim:   "#3D2E80",
  violetGlow:  "#7C5CFF33",
  text:        "#F4F2FF",
  textSub:     "#A89EC0",
  muted:       "#6B6490",
  green:       "#22C55E",
  red:         "#EF4444",
  gold:        "#E8B84B",
} as const;

export const FF = "'Thmanyah', 'Tajawal', 'Noto Sans Arabic', system-ui, sans-serif";

export const KEYFRAMES = `
@keyframes floatA {
  0%,100% { transform: perspective(1000px) rotateY(-6deg) rotateX(3deg) translateY(0px); }
  50%      { transform: perspective(1000px) rotateY(-6deg) rotateX(3deg) translateY(-14px); }
}
@keyframes floatB {
  0%,100% { transform: translateY(0px) rotate(-1deg); }
  50%      { transform: translateY(-10px) rotate(-1deg); }
}
@keyframes floatC {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-8px); }
}
@keyframes floatD {
  0%,100% { transform: translateY(0px) rotate(1deg); }
  50%      { transform: translateY(-12px) rotate(1deg); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes glowPulse {
  0%,100% { box-shadow: 0 0 40px ${P.violet}33; }
  50%      { box-shadow: 0 0 80px ${P.violet}55; }
}
@keyframes spinSlow { to { transform: rotate(360deg); } }
@keyframes bounce3 {
  0%,100%{ transform:translateY(0) }
  50%    { transform:translateY(-5px) }
}
`;
