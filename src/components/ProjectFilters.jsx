import { COLORS, STACKS, PROFILES, PROFILE_SHORT } from "../lib/constants";

export default function ProjectFilters({
  stackFilter,
  statusFilter,
  profileFilter,
  onStackChange,
  onStatusChange,
  onProfileChange,
}) {
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: COLORS.muted, marginRight: 4 }}>DEPARTMENT</span>
        {["All", ...STACKS].map((s) => (
          <button
            key={s}
            className="chip"
            onClick={() => onStackChange(s)}
            style={{
              background: stackFilter === s ? COLORS.accent : COLORS.panel2,
              color: stackFilter === s ? "#0D1117" : COLORS.muted,
              border: `1px solid ${stackFilter === s ? COLORS.accent : COLORS.border}`,
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {s}
          </button>
        ))}
        <span className="mono" style={{ fontSize: 11, color: COLORS.muted, margin: "0 4px 0 12px" }}>STATUS</span>
        {[
          ["All", "All"],
          ["delivered", "Delivered"],
          ["wip", "In progress"],
          ["late", "Late"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="chip"
            onClick={() => onStatusChange(key)}
            style={{
              background: statusFilter === key ? COLORS.accent : COLORS.panel2,
              color: statusFilter === key ? "#0D1117" : COLORS.muted,
              border: `1px solid ${statusFilter === key ? COLORS.accent : COLORS.border}`,
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: COLORS.muted, marginRight: 4 }}>PROFILE</span>
        {["All", ...PROFILES].map((pf) => (
          <button
            key={pf}
            className="chip"
            onClick={() => onProfileChange(pf)}
            style={{
              background: profileFilter === pf ? COLORS.accent : COLORS.panel2,
              color: profileFilter === pf ? "#0D1117" : COLORS.muted,
              border: `1px solid ${profileFilter === pf ? COLORS.accent : COLORS.border}`,
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {pf === "All" ? "All" : PROFILE_SHORT[pf]}
          </button>
        ))}
      </div>
    </>
  );
}
