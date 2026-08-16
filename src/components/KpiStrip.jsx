import { FolderKanban, CheckCircle2, Clock3, Percent, CircleCheck } from "lucide-react";
import { fmtMoney } from "../lib/utils";
import { useTheme } from "../lib/theme";

export default function KpiStrip({ kpis }) {
  const { colors, card } = useTheme();
  const items = [
    {
      label: "Total projects",
      value: kpis.total,
      sub: fmtMoney(kpis.totalValue),
      color: colors.text,
      Icon: FolderKanban,
      tint: "rgba(28, 34, 48, 0.08)",
    },
    {
      label: "Delivered",
      value: kpis.deliveredCount,
      sub: fmtMoney(kpis.deliveredValue),
      color: colors.delivered,
      Icon: CheckCircle2,
      tint: "rgba(31, 157, 99, 0.12)",
    },
    {
      label: "WIP",
      value: kpis.wipCount,
      sub: fmtMoney(kpis.wipValue),
      color: colors.wip,
      Icon: Clock3,
      tint: "rgba(217, 161, 23, 0.14)",
    },
    {
      label: "Possible",
      value: fmtMoney(kpis.possibleValue ?? 0),
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
      tint: "rgba(232, 185, 35, 0.18)",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
      {items.map((k, i) => (
        <div key={i} style={{ ...card, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: colors.muted, fontSize: 12, fontWeight: 650 }}>{k.label}</div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: k.tint,
                color: k.color,
                display: "grid",
                placeItems: "center",
              }}
            >
              <k.Icon size={15} strokeWidth={2.25} />
            </div>
          </div>
          <div className="disp" style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 8, letterSpacing: -0.5 }}>
            {k.value}
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 3, fontWeight: 500 }}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
