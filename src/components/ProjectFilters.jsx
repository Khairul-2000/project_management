import { STACKS, PROFILES, PROFILE_SHORT } from "../lib/constants";
import { useTheme } from "../lib/theme";

export default function ProjectFilters({
  stackFilter,
  statusFilter,
  profileFilter,
  onStackChange,
  onStatusChange,
  onProfileChange,
}) {
  const { colors, card } = useTheme();

  function chip(active) {
    return {
      background: active ? colors.accent : colors.panel,
      color: active ? colors.onAccent : colors.muted,
      border: `1px solid ${active ? colors.accent : colors.border}`,
      borderRadius: 10,
      padding: "6px 11px",
      fontSize: 12,
      fontWeight: 650,
    };
  }

  return (
    <div style={{ ...card, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontSize: 10.5, color: colors.muted, marginRight: 4, fontWeight: 700, letterSpacing: 0.4 }}>
          DEPARTMENT
        </span>
        {["All", ...STACKS].map((s) => (
          <button key={s} className="chip" onClick={() => onStackChange(s)} style={chip(stackFilter === s)}>
            {s}
          </button>
        ))}
        <span style={{ fontSize: 10.5, color: colors.muted, margin: "0 4px 0 10px", fontWeight: 700, letterSpacing: 0.4 }}>
          STATUS
        </span>
        {[
          ["All", "All"],
          ["delivered", "Delivered"],
          ["wip", "WIP"],
        ].map(([key, label]) => (
          <button key={key} className="chip" onClick={() => onStatusChange(key)} style={chip(statusFilter === key)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
        <span style={{ fontSize: 10.5, color: colors.muted, marginRight: 4, fontWeight: 700, letterSpacing: 0.4 }}>
          PROFILE
        </span>
        {["All", ...PROFILES].map((pf) => (
          <button key={pf} className="chip" onClick={() => onProfileChange(pf)} style={chip(profileFilter === pf)}>
            {pf === "All" ? "All" : PROFILE_SHORT[pf]}
          </button>
        ))}
      </div>
    </div>
  );
}
