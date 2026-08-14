import { useMemo, useState } from "react";
import { BarChart3, CircleDollarSign, ShieldAlert } from "lucide-react";
import { buildAnalytics } from "../lib/analytics";
import AnalyticsKpis from "./analytics/AnalyticsKpis";
import DeliveryRisk from "./analytics/DeliveryRisk";
import { MonthlyPerformanceChart, RankedValueChart, StatusChart } from "./analytics/AnalyticsCharts";
import { useTheme } from "../lib/theme";

const tabs = [
  { id: "overview", label: "Overview", Icon: BarChart3 },
  { id: "revenue", label: "Revenue", Icon: CircleDollarSign },
  { id: "delivery", label: "Delivery risk", Icon: ShieldAlert },
];

export default function AnalyticsDashboard({ projects }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState("overview");
  const analytics = useMemo(() => buildAnalytics(projects), [projects]);
  return <main style={{ padding: "20px 16px 48px", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
    <div style={{ marginBottom: 18 }}><div className="disp" style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>Portfolio intelligence</div><p style={{ margin: "4px 0 0", color: colors.muted, fontSize: 13 }}>All-time performance across {analytics.kpis.total} recorded projects.</p></div>
    <AnalyticsKpis kpis={analytics.kpis} />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "20px 0 14px" }}>{tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setTab(id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${tab === id ? colors.accent : colors.border}`, borderRadius: 10, padding: "9px 13px", background: tab === id ? colors.accent : colors.panel, color: tab === id ? colors.onAccent : colors.muted, fontWeight: 700, fontSize: 12.5 }}><Icon size={15} />{label}</button>)}</div>
    {tab === "overview" ? <div className="analytics-grid"><MonthlyPerformanceChart data={analytics.monthly} /><StatusChart data={analytics.statuses} /><RankedValueChart title="Revenue by team" data={analytics.teams} /><RankedValueChart title="Revenue by service" data={analytics.stacks} /></div> : null}
    {tab === "revenue" ? <div className="analytics-grid"><RankedValueChart title="Top sales people by revenue" data={analytics.salesPeople} limit={10} /><RankedValueChart title="Revenue by service" data={analytics.stacks} /><RankedValueChart title="Revenue by team" data={analytics.teams} /><MonthlyPerformanceChart data={analytics.monthly} /></div> : null}
    {tab === "delivery" ? <div className="analytics-grid"><DeliveryRisk projects={analytics.lateProjects} /><RankedValueChart title="WIP value by team" data={buildAnalytics(analytics.wipProjects).teams} /><StatusChart data={analytics.statuses} /></div> : null}
  </main>;
}
