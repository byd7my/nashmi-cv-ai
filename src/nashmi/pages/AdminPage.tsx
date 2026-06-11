import { P, FF } from "@/nashmi/lib/tokens";
import { VioletBadge } from "@/nashmi/components/VioletBadge";
import type { TrLang, Translation } from "@/nashmi/lib/translations";

interface Props {
  lang: TrLang;
  t: Translation;
  onNav: (page: string) => void;
}

export function AdminPage({ lang, t, onNav }: Props) {
  const isAr = lang === "ar";
  const ff = FF;

  const stats = [
    { label: t.totalUsers,   value: "10,247", delta: "+12.3%", color: P.violet  },
    { label: t.revenue,      value: "192,431",delta: "+8.7%",  color: P.green   },
    { label: t.cvsGenerated, value: "34,891", delta: "+22.1%", color: P.gold    },
    { label: t.aiTokens,     value: "4.2M",   delta: "+31.4%", color: "#A78BFA" },
  ];

  const users = [
    { name: "Khalid Al-Rashidi",  email: "khalid@email.com", plan: "Premium",    date: "Jan 15" },
    { name: "سارة المطيري",       email: "sara@email.com",   plan: "Free",       date: "Jan 14" },
    { name: "Omar Zahrani",       email: "omar@email.com",   plan: "Premium",    date: "Jan 13" },
    { name: "Nora Al-Dosari",     email: "nora@email.com",   plan: "Enterprise", date: "Jan 12" },
  ];

  const payments = [
    { id: "#PAY-1091", user: "Khalid",        amount: "19.99 SAR", method: "Mada",       status: "Paid"     },
    { id: "#PAY-1090", user: "Omar Zahrani",  amount: "19.99 SAR", method: "Apple Pay",  status: "Paid"     },
    { id: "#PAY-1089", user: "Nora",          amount: "Custom",    method: "Transfer",   status: "Paid"     },
    { id: "#PAY-1088", user: "محمد القحطاني", amount: "19.99 SAR", method: "Mada",       status: "Refunded" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: P.bg, direction: isAr ? "rtl" : "ltr", fontFamily: ff }}>
      {/* Topbar */}
      <div style={{ background: P.surface, borderBottom: `1px solid ${P.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
        <button onClick={() => onNav("landing")} style={{ background: "none", border: `1px solid ${P.border}`, color: P.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: ff }}>
          {isAr ? "→ رجوع" : "← Back"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${P.violet}, ${P.violetLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>N</div>
          <span style={{ color: P.text, fontWeight: 700, fontSize: 16 }}>{t.adminTitle}</span>
        </div>
        <div style={{ flex: 1 }}/>
        <VioletBadge>{isAr ? "مدير" : "Admin"}</VioletBadge>
      </div>

      <div style={{ padding: 32, maxWidth: 1400, margin: "0 auto" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 28 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ color: P.muted, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{s.label}</div>
              <div style={{ color: P.text, fontSize: 30, fontWeight: 800, marginBottom: 6 }}>{s.value}</div>
              <div style={{ color: P.green, fontSize: 12, fontWeight: 600 }}>{s.delta} {isAr ? "هذا الشهر" : "this month"}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 28 }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{isAr ? "الإيرادات الشهرية" : "Monthly Revenue"}</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110 }}>
              {[45,62,58,78,88,92,85,95,88,102,115,120].map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: `${(v / 120) * 100}px`, background: `linear-gradient(180deg, ${P.violet}, ${P.violetDim || "#3D2E80"})`, borderRadius: "3px 3px 0 0" }}/>
                  <span style={{ color: P.muted, fontSize: 8 }}>{["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{isAr ? "توزيع درجات ATS" : "ATS Score Distribution"}</h3>
            {([["90-99%", 42, P.green], ["80-89%", 31, P.violet], ["70-79%", 18, P.gold], ["<70%", 9, P.red]] as const).map(([label, pct, color]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: P.muted, fontSize: 12 }}>{label}</span>
                  <span style={{ color: P.text, fontWeight: 700, fontSize: 12 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: P.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Users + Payments */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 22 }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{isAr ? "أحدث المستخدمين" : "Recent Users"}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${P.border}` }}>
                    <td style={{ padding: "11px 0" }}>
                      <div style={{ color: P.text, fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                      <div style={{ color: P.muted, fontSize: 11 }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "11px 0" }}>
                      <span style={{ background: u.plan === "Premium" ? `${P.violet}22` : u.plan === "Enterprise" ? `${P.green}22` : P.surface, color: u.plan === "Premium" ? P.violetLight : u.plan === "Enterprise" ? P.green : P.muted, border: `1px solid ${u.plan === "Premium" ? P.violet + "44" : P.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{u.plan}</span>
                    </td>
                    <td style={{ padding: "11px 0", color: P.muted, fontSize: 12 }}>{u.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{isAr ? "المدفوعات الأخيرة" : "Recent Payments"}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${P.border}` }}>
                    <td style={{ padding: "11px 0" }}>
                      <div style={{ color: P.muted, fontSize: 10, marginBottom: 1 }}>{p.id}</div>
                      <div style={{ color: P.text, fontSize: 12 }}>{p.user}</div>
                    </td>
                    <td style={{ padding: "11px 0", color: P.text, fontSize: 13, fontWeight: 700 }}>{p.amount}</td>
                    <td style={{ padding: "11px 0", color: P.muted, fontSize: 12 }}>{p.method}</td>
                    <td style={{ padding: "11px 0" }}>
                      <span style={{ background: p.status === "Paid" ? `${P.green}22` : `${P.red}22`, color: p.status === "Paid" ? P.green : P.red, border: `1px solid ${p.status === "Paid" ? P.green + "44" : P.red + "44"}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Usage */}
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22 }}>
          <h3 style={{ color: P.text, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{isAr ? "استخدام الذكاء الاصطناعي" : "AI Usage Breakdown"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { f: isAr ? "تحليل السير" : "CV Parse",     t: "1.2M", c: "$24", clr: P.violet },
              { f: isAr ? "مساعد الكتابة" : "Write Assist",t: "1.8M", c: "$36", clr: P.gold   },
              { f: isAr ? "المساعد الذكي" : "AI Assistant",    t: "0.9M", c: "$18", clr: "#A78BFA" },
              { f: isAr ? "درجة ATS" : "ATS Score",       t: "0.3M", c: "$6",  clr: P.green   },
            ].map((a, i) => (
              <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ color: P.muted, fontSize: 11, marginBottom: 6 }}>{a.f}</div>
                <div style={{ color: a.clr, fontSize: 20, fontWeight: 800 }}>{a.t}</div>
                <div style={{ color: P.muted, fontSize: 10, marginTop: 3 }}>{isAr ? "التكلفة" : "Cost"}: {a.c}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
