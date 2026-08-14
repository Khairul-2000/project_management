import { AlertTriangle } from "lucide-react";
import { fmtMoney, getProjectStack } from "../../lib/utils";
import { useTheme } from "../../lib/theme";
import AnalyticsCard from "./AnalyticsCard";

export default function DeliveryRisk({ projects }) {
  const { colors } = useTheme();
  return <AnalyticsCard title="Late delivery watchlist" action={<AlertTriangle size={17} color={colors.late} />}>
    {projects.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: colors.muted, textAlign: "left" }}><th style={{ paddingBottom: 8 }}>Project</th><th style={{ paddingBottom: 8 }}>Team</th><th style={{ paddingBottom: 8 }}>Service</th><th style={{ paddingBottom: 8, textAlign: "right" }}>Value</th></tr></thead><tbody>{projects.slice(0, 8).map((project) => <tr key={project.id} style={{ borderTop: `1px solid ${colors.border}` }}><td style={{ padding: "10px 4px 10px 0", fontWeight: 700 }}>{project.projectName || "Untitled"}</td><td style={{ padding: "10px 4px" }}>{project.teamName || "Unassigned"}</td><td style={{ padding: "10px 4px", color: colors.muted }}>{getProjectStack(project)}</td><td style={{ padding: "10px 0 10px 4px", textAlign: "right", color: colors.late, fontWeight: 700 }}>{fmtMoney(project.price)}</td></tr>)}</tbody></table></div> : <div style={{ color: colors.muted, fontSize: 13, padding: "28px 0", textAlign: "center" }}>No late projects in this data.</div>}
  </AnalyticsCard>;
}
