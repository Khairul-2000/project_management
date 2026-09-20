import { FolderKanban, CheckCircle2, Clock3, Percent, ArrowUpRight } from "lucide-react";
import { useTheme } from "../lib/theme";
import { fmtMoney } from "../lib/utils";

export default function HeroMetricStrip({ kpis, currentUser, canViewFinancials = true }) {
  const { colors, isDark } = useTheme();

  const total = kpis.total || 0;
  const delivered = kpis.deliveredCount || 0;
  const wip = kpis.wipCount || 0;
  const possible = kpis.possibleCount || 0;
  const late = kpis.lateCount || 0;

  const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const wipPct = total > 0 ? Math.round((wip / total) * 100) : 0;
  const possiblePct = total > 0 ? Math.round((possible / total) * 100) : 0;
  const latePct = total > 0 ? Math.max(0, 100 - deliveredPct - wipPct - possiblePct) : 0;

  const userName = currentUser?.name
    ? currentUser.name.split(" ")[0]
    : "Team";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 24,
        marginBottom: 24,
      }}
    >
      {/* Left: Welcoming greeting and segmented status bar */}
      <div style={{ flex: 1, minWidth: 290 }}>
        <h1
          className="disp"
          style={{
            fontSize: "clamp(26px, 3.2vw, 36px)",
            fontWeight: 700,
            margin: "0 0 14px 0",
            color: colors.text,
            letterSpacing: -0.6,
            lineHeight: 1.15,
          }}
        >
          Welcome in, {userName}
        </h1>

        {/* Multi-segment breakdown bar matching Crextio reference */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: colors.muted,
            }}
          >
            <span style={{ minWidth: 70 }}>WIP: {wipPct}%</span>
            <span style={{ minWidth: 70 }}>Delivered: {deliveredPct}%</span>
            <span style={{ minWidth: 70 }}>Possible: {possiblePct}%</span>
            <span>Output</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              height: 34,
              borderRadius: 9999,
              background: colors.panel2,
              padding: 3,
              gap: 4,
              maxWidth: 480,
              border: `1px solid ${colors.border}`,
              boxSizing: "border-box",
            }}
          >
            {/* Dark Charcoal Pill for Active/WIP */}
            <div
              title={`WIP: ${wip} projects (${wipPct}%)`}
              style={{
                flex: Math.max(wipPct, 12),
                background: isDark ? colors.panel2 : "#1A1B20",
                color: "white",
                borderRadius: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: -0.2,
                transition: "flex 0.4s ease",
              }}
            >
              {wipPct}%
            </div>

            {/* Vibrant Delivered Pill */}
            <div
              title={`Delivered: ${delivered} projects (${deliveredPct}%)`}
              style={{
                flex: Math.max(deliveredPct, 12),
                background: colors.accentSoft || "#00E599",
                color: colors.onAccent || "#041D14",
                borderRadius: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: -0.2,
                transition: "flex 0.4s ease",
              }}
            >
              {deliveredPct}%
            </div>

            {/* Diagonal Striped Capsule for Project Time / Possible */}
            <div
              title={`Possible: ${possible} projects (${possiblePct}%)`}
              style={{
                flex: Math.max(possiblePct, 16),
                background: `repeating-linear-gradient(45deg, ${colors.border}, ${colors.border} 4px, transparent 4px, transparent 8px)`,
                borderRadius: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 650,
                color: colors.muted,
                transition: "flex 0.4s ease",
              }}
            >
              {possiblePct}%
            </div>

            {/* Outlined Pill for Output / Balance */}
            <div
              title={`Delivery Rate: ${deliveredPct}%`}
              style={{
                width: 54,
                border: `1px solid ${colors.border}`,
                borderRadius: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 650,
                color: colors.muted,
                background: colors.panel,
              }}
            >
              {deliveredPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: 3 Big Iconic Stat Counters matching Crextio reference */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(16px, 2.5vw, 36px)",
          flexWrap: "wrap",
        }}
      >
        {/* Total Projects */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              display: "grid",
              placeItems: "center",
              color: colors.text,
            }}
          >
            <FolderKanban size={15} strokeWidth={2} />
          </div>
          <div>
            <div
              className="disp"
              style={{
                fontSize: "clamp(30px, 3vw, 42px)",
                fontWeight: 400,
                lineHeight: 1,
                color: colors.text,
                letterSpacing: -1,
              }}
            >
              {total}
            </div>
            <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500, marginTop: 2 }}>
              Projects
            </div>
          </div>
        </div>

        {/* Delivered */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(29, 191, 115, 0.12)",
              border: "1px solid rgba(29, 191, 115, 0.25)",
              display: "grid",
              placeItems: "center",
              color: colors.delivered,
            }}
          >
            <CheckCircle2 size={15} strokeWidth={2.2} />
          </div>
          <div>
            <div
              className="disp"
              style={{
                fontSize: "clamp(30px, 3vw, 42px)",
                fontWeight: 400,
                lineHeight: 1,
                color: colors.text,
                letterSpacing: -1,
              }}
            >
              {delivered}
            </div>
            <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500, marginTop: 2 }}>
              Delivered
            </div>
          </div>
        </div>

        {/* Active / WIP */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: `${colors.wip}22`,
              border: `1px solid ${colors.wip}44`,
              display: "grid",
              placeItems: "center",
              color: colors.wip,
            }}
          >
            <Clock3 size={15} strokeWidth={2.2} />
          </div>
          <div>
            <div
              className="disp"
              style={{
                fontSize: "clamp(30px, 3vw, 42px)",
                fontWeight: 400,
                lineHeight: 1,
                color: colors.text,
                letterSpacing: -1,
              }}
            >
              {wip}
            </div>
            <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500, marginTop: 2 }}>
              Active WIP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
