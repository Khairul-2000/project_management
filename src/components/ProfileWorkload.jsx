import { useState, useMemo } from "react";
import { Search, X, ChevronDown, ChevronUp, User } from "lucide-react";
import { fmtMoney } from "../lib/utils";
import { useTheme } from "../lib/theme";

const INITIAL_VISIBLE_COUNT = 6;

function getProfileHue(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [215, 38, 155, 275, 195, 330, 48];
  return hues[Math.abs(hash) % hues.length];
}

export default function ProfileWorkload({ byProfile = [], onSelectProfile }) {
  const { colors, card } = useTheme();
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState("active"); // 'active' | 'all'
  const [expanded, setExpanded] = useState(false);

  const activeProfiles = useMemo(
    () => byProfile.filter((p) => p.total > 0),
    [byProfile]
  );

  const displayedList = useMemo(() => {
    const source = filterMode === "active" ? activeProfiles : byProfile;
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.profile || "").toLowerCase().includes(q)
    );
  }, [filterMode, activeProfiles, byProfile, query]);

  const visibleProfiles = expanded
    ? displayedList
    : displayedList.slice(0, INITIAL_VISIBLE_COUNT);

  const hasMore = displayedList.length > INITIAL_VISIBLE_COUNT;

  return (
    <div
      style={{
        ...card,
        padding: "20px 22px",
        borderRadius: 24,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header: Title + Filter Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <div className="disp" style={{ fontWeight: 750, fontSize: 15, letterSpacing: -0.2 }}>
            Workload by Fiverr profile
          </div>
          <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 2, fontWeight: 500 }}>
            {activeProfiles.length} active of {byProfile.length} profiles
          </div>
        </div>

        {/* Right Header Tools: Mode Toggle & Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Active / All pill toggle */}
          <div
            style={{
              display: "inline-flex",
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 9999,
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFilterMode("active");
                setExpanded(false);
              }}
              style={{
                border: "none",
                background: filterMode === "active" ? (colors.accent || "#1A1B20") : "transparent",
                color: filterMode === "active" ? "#FFFFFF" : colors.muted,
                borderRadius: 9999,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Active ({activeProfiles.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                setExpanded(false);
              }}
              style={{
                border: "none",
                background: filterMode === "all" ? (colors.accent || "#1A1B20") : "transparent",
                color: filterMode === "all" ? "#FFFFFF" : colors.muted,
                borderRadius: 9999,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              All ({byProfile.length})
            </button>
          </div>

          {/* Mini Search Input */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 9999,
              padding: "3px 10px",
              width: 140,
            }}
          >
            <Search size={12} color={colors.muted} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setExpanded(true);
              }}
              placeholder="Search..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 11,
                color: colors.text,
                width: "100%",
                fontWeight: 500,
              }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: colors.muted,
                  padding: 0,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={11} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div style={{ flex: 1 }}>
        {displayedList.length === 0 ? (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: colors.muted,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {query ? `No profiles matching "${query}"` : "No profiles available for this selection."}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            {visibleProfiles.map((pf) => {
              const hue = getProfileHue(pf.name);
              const wipCount = Math.max(0, pf.total - pf.delivered);
              return (
                <div
                  key={pf.profile}
                  onClick={() => onSelectProfile?.(pf.profile)}
                  title={onSelectProfile ? `Filter projects by ${pf.name}` : undefined}
                  style={{
                    background: colors.panel2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 18,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 6,
                    cursor: onSelectProfile ? "pointer" : "default",
                    transition: "transform 0.12s ease, border-color 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.borderColor = `hsl(${hue}, 65%, 55%)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  {/* Top row: Avatar circle + Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: `hsl(${hue}, 65%, 45%)`,
                        color: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {pf.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12.5,
                        color: colors.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pf.name}
                    </div>
                  </div>

                  {/* Middle row: Orders + Value */}
                  <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
                    {pf.total} order{pf.total === 1 ? "" : "s"} · {fmtMoney(pf.value)}
                  </div>

                  {/* Bottom row: Delivered & WIP badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: colors.delivered,
                        fontWeight: 700,
                        background: `${colors.delivered}18`,
                        padding: "1px 6px",
                        borderRadius: 9999,
                      }}
                    >
                      {pf.delivered} delivered
                    </span>
                    {wipCount > 0 ? (
                      <span
                        style={{
                          fontSize: 10.5,
                          color: colors.wip,
                          fontWeight: 700,
                          background: `${colors.wip}18`,
                          padding: "1px 6px",
                          borderRadius: 9999,
                        }}
                      >
                        {wipCount} WIP
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Show more / Show less toggle */}
      {hasMore && !query ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 14px",
              borderRadius: 9999,
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              fontSize: 11.5,
              fontWeight: 650,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.muted;
            }}
          >
            {expanded ? (
              <>
                Show fewer <ChevronUp size={13} />
              </>
            ) : (
              <>
                Show all {displayedList.length} profiles <ChevronDown size={13} />
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
