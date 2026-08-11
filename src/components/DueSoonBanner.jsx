import { AlertTriangle } from "lucide-react";
import {
  formatDaysLeft,
  formatDisplayDate,
  getCurrentDeliveryDate,
  getDaysLeft,
  hasAdminSchedule,
  isDueSoon,
} from "../lib/utils";
import { useTheme } from "../lib/theme";

export default function DueSoonBanner({ projects }) {
  const { colors, card } = useTheme();
  const dueSoon = projects
    .filter((p) => isDueSoon(p))
    .map((p) => ({
      project: p,
      daysLeft: getDaysLeft(p),
      due: getCurrentDeliveryDate(p),
      admin: hasAdminSchedule(p),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (!dueSoon.length) return null;

  return (
    <div
      style={{
        ...card,
        padding: "14px 16px",
        marginBottom: 16,
        border: `1px solid rgba(226, 75, 74, 0.35)`,
        background: "rgba(226, 75, 74, 0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={16} style={{ color: colors.late }} />
        <div style={{ fontWeight: 750, fontSize: 13.5 }}>
          Extension needed · {dueSoon.length} project{dueSoon.length === 1 ? "" : "s"} with 4 days or less
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {dueSoon.slice(0, 8).map(({ project: p, daysLeft, due, admin }) => (
          <a
            key={p.id}
            href={`#/project/${p.id}`}
            className="project-link"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "baseline",
              padding: "8px 10px",
              borderRadius: 10,
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              textDecoration: "none",
              color: colors.text,
            }}
          >
            <span style={{ fontWeight: 750 }}>{p.projectName}</span>
            <span style={{ color: colors.muted, fontSize: 12.5 }}>
              {formatDaysLeft(daysLeft)}
              {due ? ` · due ${formatDisplayDate(due)}` : ""}
              {admin ? " · admin schedule" : p.dateline ? ` · sheet “${p.dateline}”` : ""}
              {" · take extension or deliver"}
            </span>
          </a>
        ))}
        {dueSoon.length > 8 ? (
          <div style={{ fontSize: 12, color: colors.muted, paddingLeft: 4 }}>
            +{dueSoon.length - 8} more
          </div>
        ) : null}
      </div>
    </div>
  );
}
