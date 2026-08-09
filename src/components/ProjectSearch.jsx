import { Search, X } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function ProjectSearch({ value, onChange, resultCount }) {
  const { colors, card } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          ...card,
          flex: 1,
          minWidth: 220,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 14,
        }}
      >
        <Search size={15} color={colors.muted} />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search project, order ID, sales, team, profile, phase…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: colors.text,
            fontSize: 13,
            minWidth: 0,
            fontWeight: 500,
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Clear search"
            style={{
              display: "flex",
              alignItems: "center",
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.muted,
              padding: 4,
            }}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
      {value ? (
        <span style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>
          {resultCount} match{resultCount === 1 ? "" : "es"}
        </span>
      ) : null}
    </div>
  );
}
