import { FolderKanban, CheckCircle2, Clock3, Percent, CircleCheck } from "lucide-react";
import { fmtMoney } from "../lib/utils";
import { useTheme } from "../lib/theme";

export default function KpiStrip({ kpis, canViewFinancials = true }) {
  const { colors, card } = useTheme();
  const items = [
    {
      label: "Total projects",
      value: kpis.total,
      sub: canViewFinancials ? fmtMoney(kpis.totalValue) : `${kpis.total} total deliverables`,
      color: colors.text,
      Icon: FolderKanban,
      tint: "rgba(28, 34, 48, 0.08)",
    },
    {
      label: "Delivered",
      value: kpis.deliveredCount,
      sub: canViewFinancials ? fmtMoney(kpis.deliveredValue) : `${kpis.deliveredCount} completed`,
      color: colors.delivered,
      Icon: CheckCircle2,
      tint: "rgba(31, 157, 99, 0.12)",
    },
    {
      label: "WIP",
      value: kpis.wipCount,
      sub: canViewFinancials ? fmtMoney(kpis.wipValue) : `${kpis.wipCount} in progress`,
      color: colors.wip,
      Icon: Clock3,
      tint: "rgba(217, 161, 23, 0.14)",
    },
    {
      label: "Possible",
      value: canViewFinancials ? fmtMoney(kpis.possibleValue ?? 0) : `${kpis.possibleCount ?? 0} phases`,
      sub: `${kpis.possibleCount ?? 0} phase${(kpis.possibleCount ?? 0) === 1 ? "" : "s"} flagged Yes`,
      color: colors.delivered,
      Icon: CircleCheck,
      tint: `${colors.delivered}22`,
    },
    {
      label: "Delivery rate",
      value: kpis.total ? Math.round((kpis.deliveredCount / kpis.total) * 100) + "%" : "0%",
      sub: "of all orders",
      color: colors.accent,
      Icon: Percent,
      tint: `${colors.accent}22`,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
      {items.map((k, i) => (
        <div key={i} style={{ ...card, padding: "16px 18px", borderRadius: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: colors.muted, fontSize: 12, fontWeight: 650 }}>{k.label}</div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: k.tint,
                color: k.color,
                display: "grid",
                placeItems: "center",
              }}
            >
              <k.Icon size={15} strokeWidth={2.25} />
            </div>
          </div>
          <div className="disp" style={{ fontSize: 26, fontWeight: 700, color: k.color, marginTop: 8, letterSpacing: -0.6 }}>
            {k.value}
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 3, fontWeight: 500 }}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
