import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import {
  formatDaysLeft,
  formatDaysSinceIntake,
  formatDisplayDate,
  getCurrentDeliveryDate,
  getDaysLeft,
  getDaysSinceIntake,
  hasAdminSchedule,
  hasTakenExtension,
  isDueSoon,
  isNewArrival,
} from "../lib/utils";
import { useTheme } from "../lib/theme";

const COLLAPSED_COUNT = 4;

function AlertCard({ tone, icon: Icon, title, children }) {
  const { colors, card } = useTheme();
  const tones = {
    new: {
      border: "rgba(232, 185, 35, 0.45)",
      background: "rgba(232, 185, 35, 0.12)",
      icon: colors.accentSoft,
    },
    due: {
      border: "rgba(226, 75, 74, 0.4)",
      background: "rgba(226, 75, 74, 0.1)",
      icon: colors.late,
    },
  };
  const t = tones[tone] || tones.new;

  return (
    <div
      style={{
        ...card,
        width: "100%",
        flexShrink: 0,
        padding: "14px 16px",
        border: `1px solid ${t.border}`,
        background: t.background,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={16} style={{ color: t.icon, flexShrink: 0 }} />
        <div style={{ fontWeight: 750, fontSize: 13.5, color: colors.text }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function AlertRow({ href, title, meta }) {
  const { colors } = useTheme();
  return (
    <a
      href={href}
      className="project-link"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 10px",
        borderRadius: 10,
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        textDecoration: "none",
        color: colors.text,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontWeight: 750, color: colors.text }}>{title}</span>
      <span style={{ color: colors.muted, fontSize: 12.5, fontWeight: 500 }}>{meta}</span>
    </a>
  );
}

function ExpandableAlertList({ items, renderRow }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const canToggle = items.length > COLLAPSED_COUNT;
  const visible = canToggle && !expanded ? items.slice(0, COLLAPSED_COUNT) : items;
  const hiddenCount = items.length - COLLAPSED_COUNT;

  return (
    <>
      {visible.map(renderRow)}
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 2,
            padding: "7px 10px",
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            color: colors.text,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Show {hiddenCount} more
            </>
          )}
        </button>
      ) : null}
    </>
  );
}

export default function DashboardAlerts({ projects }) {
  const list = Array.isArray(projects) ? projects : [];

  const arrivals = list
    .filter((p) => isNewArrival(p))
    .map((p) => ({
      project: p,
      daysSince: getDaysSinceIntake(p),
    }))
    .sort((a, b) => a.daysSince - b.daysSince);

  const dueSoon = list
    .filter((p) => isDueSoon(p))
    .map((p) => ({
      project: p,
      daysLeft: getDaysLeft(p),
      due: getCurrentDeliveryDate(p),
      admin: hasAdminSchedule(p),
      extended: hasTakenExtension(p),
    }))
    .sort((a, b) => {
      if (a.daysLeft == null && b.daysLeft == null) return 0;
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    });

  if (!arrivals.length && !dueSoon.length) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        marginBottom: 16,
      }}
    >
      {arrivals.length ? (
        <AlertCard
          tone="new"
          icon={Sparkles}
          title={`New arrivals · ${arrivals.length} project${arrivals.length === 1 ? "" : "s"} intake within 3 days`}
        >
          <ExpandableAlertList
            items={arrivals}
            renderRow={({ project: p, daysSince }) => (
              <AlertRow
                key={p.id}
                href={`#/project/${p.id}`}
                title={p.projectName || "Untitled"}
                meta={[
                  formatDaysSinceIntake(daysSince),
                  p.date ? `intake ${formatDisplayDate(p.date)}` : null,
                  p.phase || null,
                  p.profile || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
          />
        </AlertCard>
      ) : null}

      {dueSoon.length ? (
        <AlertCard
          tone="due"
          icon={AlertTriangle}
          title={`Extension warning · ${dueSoon.length} project${dueSoon.length === 1 ? "" : "s"} with 7 days or less`}
        >
          <ExpandableAlertList
            items={dueSoon}
            renderRow={({ project: p, daysLeft, due, admin, extended }) => (
              <AlertRow
                key={p.id}
                href={`#/project/${p.id}`}
                title={p.projectName || "Untitled"}
                meta={[
                  daysLeft != null ? formatDaysLeft(daysLeft) : null,
                  due
                    ? extended
                      ? `extended to ${formatDisplayDate(due)}`
                      : `due ${formatDisplayDate(due)}`
                    : null,
                  admin ? "admin schedule" : p.dateline ? `sheet “${p.dateline}”` : null,
                  extended ? "new delivery date" : "take extension or deliver",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
          />
        </AlertCard>
      ) : null}
    </div>
  );
}
