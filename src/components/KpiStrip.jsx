import { COLORS } from "../lib/constants";
import { fmtMoney } from "../lib/utils";

export default function KpiStrip({ kpis }) {
  const items = [
    { label: "Total projects", value: kpis.total, sub: fmtMoney(kpis.totalValue), color: COLORS.text },
    { label: "Delivered", value: kpis.deliveredCount, sub: fmtMoney(kpis.deliveredValue), color: COLORS.delivered },
    { label: "WIP", value: kpis.wipCount, sub: fmtMoney(kpis.wipValue), color: COLORS.wip },
    {
      label: "Delivery rate",
      value: kpis.total ? Math.round((kpis.deliveredCount / kpis.total) * 100) + "%" : "0%",
      sub: "of all orders",
      color: COLORS.accent,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
      {items.map((k, i) => (
        <div key={i} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ color: COLORS.muted, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {k.label}
          </div>
          <div className="disp" style={{ fontSize: 26, fontWeight: 700, color: k.color, marginTop: 4 }}>
            {k.value}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
