import { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import { STACKS, formatProfileName } from "../lib/constants";
import { getProjectStack, normalizePossibility, statusOf } from "../lib/utils";
import { useTheme } from "../lib/theme";

export default function ProjectFilters({
  projects = [],
  allProfiles = [],
  stackFilter,
  statusFilter,
  profileFilter,
  possibilityFilter,
  onStackChange,
  onStatusChange,
  onProfileChange,
  onPossibilityChange,
  onResetFilters,
}) {
  const { colors, card } = useTheme();

  const isFiltered =
    stackFilter !== "All" ||
    statusFilter !== "All" ||
    profileFilter !== "All" ||
    possibilityFilter !== "All";

  const availableProfiles = useMemo(() => {
    const set = new Set(allProfiles || []);
    (projects || []).forEach((p) => {
      const pf = String(p?.profile || "").trim();
      if (pf) set.add(pf);
    });
    return Array.from(set);
  }, [projects, allProfiles]);

  // Calculate live counts based on the current dataset
  const counts = useMemo(() => {
    const stack = { All: projects.length };
    const status = { All: projects.length, delivered: 0, wip: 0 };
    const profile = { All: projects.length };
    const possibility = { All: projects.length, Yes: 0, No: 0 };

    STACKS.forEach((s) => (stack[s] = 0));
    availableProfiles.forEach((pf) => (profile[pf] = 0));

    projects.forEach((p) => {
      const s = getProjectStack(p);
      if (stack[s] != null) stack[s]++;

      const st = statusOf(p);
      if (status[st] != null) status[st]++;

      const pf = String(p.profile || "").trim();
      if (pf) {
        profile[pf] = (profile[pf] || 0) + 1;
      }

      const pos = normalizePossibility(p.possibility);
      if (possibility[pos] != null) possibility[pos]++;
    });

    return { stack, status, profile, possibility };
  }, [projects, availableProfiles]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownQuery, setDropdownQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [dropdownOpen]);

  const displayProfiles = useMemo(() => {
    const active = availableProfiles.filter(
      (pf) => (counts.profile[pf] || 0) > 0 || profileFilter === pf
    );
    if (active.length > 0) {
      return active.sort(
        (a, b) => (counts.profile[b] || 0) - (counts.profile[a] || 0) || a.localeCompare(b)
      );
    }
    return availableProfiles;
  }, [availableProfiles, counts.profile, profileFilter]);

  const MAX_PRIMARY = 4;
  const topProfiles = useMemo(() => displayProfiles.slice(0, MAX_PRIMARY), [displayProfiles]);
  const overflowProfiles = useMemo(() => displayProfiles.slice(MAX_PRIMARY), [displayProfiles]);
  const isSelectedInOverflow = useMemo(() => {
    return profileFilter !== "All" && overflowProfiles.includes(profileFilter);
  }, [profileFilter, overflowProfiles]);

  function chip(active) {
    return {
      background: active ? (colors.accent || "#1A1B20") : colors.panel,
      color: active ? "#FFFFFF" : colors.muted,
      border: `1px solid ${active ? (colors.accent || "#1A1B20") : colors.border}`,
      borderRadius: 9999,
      padding: "5px 12px",
      fontSize: 11.5,
      fontWeight: 650,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      cursor: "pointer",
      transition: "all .12s ease",
    };
  }

  function countBadge(count, active) {
    if (count == null) return null;
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 750,
          opacity: active ? 0.9 : 0.7,
          background: active ? "rgba(255, 255, 255, 0.2)" : colors.panel2,
          padding: "1px 5px",
          borderRadius: 99,
        }}
      >
        {count}
      </span>
    );
  }

  return (
    <div style={{ ...card, padding: "14px 16px", marginBottom: 12 }}>
      {/* Top row: Department and Status */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          marginBottom: 10,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10.5,
              color: colors.muted,
              marginRight: 4,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            DEPARTMENT
          </span>
          {["All", ...STACKS].map((s) => (
            <button
              key={s}
              className="chip"
              onClick={() => onStackChange(s)}
              style={chip(stackFilter === s)}
            >
              <span>{s}</span>
              {countBadge(counts.stack[s], stackFilter === s)}
            </button>
          ))}

          <span
            style={{
              fontSize: 10.5,
              color: colors.muted,
              margin: "0 4px 0 10px",
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            STATUS
          </span>
          {[
            ["All", "All"],
            ["delivered", "Delivered"],
            ["wip", "WIP"],
          ].map(([key, label]) => (
            <button
              key={key}
              className="chip"
              onClick={() => onStatusChange(key)}
              style={chip(statusFilter === key)}
            >
              <span>{label}</span>
              {countBadge(counts.status[key], statusFilter === key)}
            </button>
          ))}
        </div>

        {/* Clear filters button */}
        {isFiltered && onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 9px",
              borderRadius: 8,
              border: `1px solid ${colors.late}55`,
              background: `${colors.late}14`,
              color: colors.late,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <X size={13} /> Reset Filters
          </button>
        ) : null}
      </div>

      {/* Bottom row: Profile and Possible */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
        <span
          style={{
            fontSize: 10.5,
            color: colors.muted,
            marginRight: 4,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          PROFILE
        </span>

        {/* All profile chip */}
        <button
          className="chip"
          onClick={() => {
            onProfileChange("All");
            setDropdownOpen(false);
          }}
          style={chip(profileFilter === "All")}
        >
          <span>All</span>
          {countBadge(counts.profile["All"] ?? projects.length, profileFilter === "All")}
        </button>

        {/* Top 4 active profile chips */}
        {topProfiles.map((pf) => (
          <button
            key={pf}
            className="chip"
            onClick={() => {
              onProfileChange(pf);
              setDropdownOpen(false);
            }}
            style={chip(profileFilter === pf)}
          >
            <span>{formatProfileName(pf)}</span>
            {countBadge(counts.profile[pf] ?? 0, profileFilter === pf)}
          </button>
        ))}

        {/* Searchable Overflow Dropdown for remaining profiles */}
        {overflowProfiles.length > 0 && (
          <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              className="chip"
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                ...chip(isSelectedInOverflow),
                paddingRight: 10,
              }}
            >
              <span>
                {isSelectedInOverflow ? formatProfileName(profileFilter) : `More profiles (${overflowProfiles.length})`}
              </span>
              {isSelectedInOverflow ? (
                countBadge(counts.profile[profileFilter] ?? 0, true)
              ) : (
                <ChevronDown size={12} style={{ marginLeft: 2, flexShrink: 0 }} />
              )}
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 90,
                  width: 230,
                  background: colors.panel,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 18,
                  boxShadow: colors.shadow,
                  padding: 8,
                  boxSizing: "border-box",
                }}
              >
                {/* Mini Search input inside dropdown */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: colors.panel2,
                    borderRadius: 9999,
                    padding: "5px 10px",
                    marginBottom: 6,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <Search size={12} color={colors.muted} />
                  <input
                    type="text"
                    value={dropdownQuery}
                    onChange={(e) => setDropdownQuery(e.target.value)}
                    placeholder="Search profiles..."
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: 11.5,
                      color: colors.text,
                      width: "100%",
                      fontWeight: 500,
                    }}
                    autoFocus
                  />
                  {dropdownQuery ? (
                    <button
                      type="button"
                      onClick={() => setDropdownQuery("")}
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

                {/* Filtered list of overflow profiles */}
                <div
                  style={{
                    maxHeight: 190,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {overflowProfiles
                    .filter((pf) =>
                      formatProfileName(pf)
                        .toLowerCase()
                        .includes(dropdownQuery.trim().toLowerCase())
                    )
                    .map((pf) => {
                      const isSelected = profileFilter === pf;
                      return (
                        <div
                          key={pf}
                          onClick={() => {
                            onProfileChange(pf);
                            setDropdownOpen(false);
                            setDropdownQuery("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: isSelected ? 750 : 550,
                            background: isSelected ? colors.panel2 : "transparent",
                            color: isSelected ? (colors.accentSoft || colors.text) : colors.text,
                            transition: "background 0.12s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = colors.panel2;
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatProfileName(pf)}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: isSelected ? colors.panel : colors.panel2,
                              padding: "1px 6px",
                              borderRadius: 9999,
                              color: colors.muted,
                              marginLeft: 6,
                            }}
                          >
                            {counts.profile[pf] ?? 0}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        <span
          style={{
            fontSize: 10.5,
            color: colors.muted,
            margin: "0 4px 0 10px",
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          POSSIBLE
        </span>
        {[
          ["All", "All"],
          ["Yes", "Yes"],
          ["No", "No"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="chip"
            onClick={() => onPossibilityChange(key)}
            style={chip(possibilityFilter === key)}
          >
            <span>{label}</span>
            {countBadge(counts.possibility[key], possibilityFilter === key)}
          </button>
        ))}
      </div>
    </div>
  );
}
