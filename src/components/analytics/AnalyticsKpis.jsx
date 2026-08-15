import { AlertTriangle, BadgeDollarSign, CheckCircle2, Clock3, FolderKanban, TrendingUp } from "lucide-react";
import { fmtMoney } from "../../lib/utils";
import { useTheme } from "../../lib/theme";

export default function AnalyticsKpis({ kpis }) {
  const { colors, card } = useTheme();
  const items = [
    { label: "Project value", value: fmtMoney(kpis.totalValue), sub: `${kpis.total} projects`, Icon: BadgeDollarSign, color: colors.accent },
    { label: "Average project", value: fmtMoney(kpis.averageValue), sub: "per order", Icon: TrendingUp, color: "#4F7CFF" },
    { label: "Delivered", value: `${kpis.deliveryRate}%`, sub: `${kpis.delivered} projects`, Icon: CheckCircle2, color: colors.delivered },
    { label: "Work in progress", value: fmtMoney(kpis.wipValue), sub: "current WIP value", Icon: Clock3, color: colors.wip },
    { label: "Late projects", value: kpis.lateCount, sub: fmtMoney(kpis.lateValue), Icon: AlertTriangle, color: colors.late },
    { label: "Portfolio", value: kpis.total, sub: "all recorded projects", Icon: FolderKanban, color: colors.text },
  ];

  return <div className="analytics-kpis">{items.map(({ label, value, sub, Icon, color }) => (
    <div key={label} style={{ ...card, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: colors.muted, fontSize: 12, fontWeight: 700 }}>
        {label}<Icon size={17} color={color} />
      </div>
      <div className="disp" style={{ marginTop: 8, color, fontWeight: 800, fontSize: 24, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ marginTop: 3, color: colors.muted, fontSize: 11.5 }}>{sub}</div>
    </div>
  ))}</div>;
}
