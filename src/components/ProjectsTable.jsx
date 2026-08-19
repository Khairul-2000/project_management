import { useMemo, useState } from "react";
import { Pencil, Trash2, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PROFILE_SHORT, STACK_COLOR, PAGE_SIZE_OPTIONS } from "../lib/constants";
import {
  getProjectStack,
  statusOf,
  fmtMoney,
  normalizePossibility,
  formatProjectDateline,
  projectDatelineTitle,
  hasAdminSchedule,
  isDatelineOverdue,
} from "../lib/utils";
import { useTheme } from "../lib/theme";
import StatusBadge from "./StatusBadge";

export default function ProjectsTable({
  projects,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onPossibilityChange,
  canManage = true,
}) {
  const { colors, card } = useTheme();
  // null | "yes-first" | "no-first"
  const [possibilitySort, setPossibilitySort] = useState(null);

  const sortedProjects = useMemo(() => {
    if (!possibilitySort) return projects;
    const rank = (p) => (normalizePossibility(p.possibility) === "Yes" ? 1 : 0);
    const dir = possibilitySort === "yes-first" ? -1 : 1;
    return [...projects].sort((a, b) => (rank(a) - rank(b)) * dir);
  }, [projects, possibilitySort]);

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, safePage, pageSize]);

  const rangeStart = sortedProjects.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sortedProjects.length);

  function cyclePossibilitySort() {
    setPossibilitySort((prev) => {
      if (prev === null) return "yes-first";
      if (prev === "yes-first") return "no-first";
      return null;
    });
    onPageChange(1);
  }

  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return [...pages]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)
      .reduce((acc, page, idx, arr) => {
        if (idx > 0 && page - arr[idx - 1] > 1) acc.push("…");
        acc.push(page);
        return acc;
      }, []);
  }

  const th = {
    padding: "10px 8px",
    color: colors.muted,
    fontWeight: 700,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
    textAlign: "left",
  };

  const td = {
    padding: "9px 8px",
    verticalAlign: "middle",
    fontSize: 12,
  };

  const ellipsis = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const headers = [
    { label: "Date", style: { width: 78 } },
    { label: "Sales", style: { width: "10%" } },
    { label: "Team", style: { width: "7%" } },
    { label: "Dept", style: { width: "8%" } },
    { label: "Profile", style: { width: "7%" } },
    { label: "Project", style: { width: "12%" } },
    { label: "Phase", style: { width: "10%" } },
    { label: "Possible", style: { width: 88 }, sortable: "possibility" },
    { label: "Order", style: { width: "9%" } },
    { label: "Price", style: { width: 72 } },
    { label: "Dateline", style: { width: "8%" } },
    { label: "Status", style: { width: 78 } },
    ...(canManage ? [{ label: "Actions", style: { width: 84, textAlign: "right" } }] : []),
  ];

  const SortIcon =
    possibilitySort === "yes-first" ? ArrowDown : possibilitySort === "no-first" ? ArrowUp : ArrowUpDown;

  function possibilityStyles(isYes) {
    if (isYes) {
      return {
        background: `${colors.delivered}22`,
        border: `1px solid ${colors.delivered}66`,
        color: colors.delivered,
      };
    }
    // No: neutral only — no second accent color
    return {
      background: colors.panel2,
      border: `1px solid ${colors.border}`,
      color: colors.muted,
    };
  }

  return (
    <>
      <div style={{ ...card, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 1040,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: colors.panel2 }}>
                {headers.map((h) => (
                  <th key={h.label} style={{ ...th, ...h.style }}>
                    {h.label === "Actions" ? (
                      ""
                    ) : h.sortable === "possibility" ? (
                      <button
                        type="button"
                        onClick={cyclePossibilitySort}
                        title={
                          possibilitySort === "yes-first"
                            ? "Sorted: Yes first (click for No first)"
                            : possibilitySort === "no-first"
                              ? "Sorted: No first (click to clear)"
                              : "Sort by Possible (Yes / No)"
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: possibilitySort ? colors.text : colors.muted,
                          fontWeight: 700,
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                          cursor: "pointer",
                        }}
                      >
                        Possible
                        <SortIcon size={12} />
                      </button>
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={headers.length} style={{ padding: 24, textAlign: "center", color: colors.muted }}>
                    No projects match this filter.
                  </td>
                </tr>
              )}
              {pageRows.map((p, i) => {
                const stack = getProjectStack(p);
                const possible = normalizePossibility(p.possibility);
                const isYes = possible === "Yes";
                return (
                  <tr
                    key={p.id}
                    className="table-row"
                    style={{
                      borderTop: `1px solid ${colors.border}`,
                      background: i % 2 ? colors.panel : colors.bgAccent,
                    }}
                  >
                    <td className="mono" style={{ ...td, ...ellipsis, color: colors.muted }} title={p.date}>
                      {p.date}
                    </td>
                    <td style={{ ...td, ...ellipsis, fontWeight: 500 }} title={p.salesPerson}>
                      {p.salesPerson}
                    </td>
                    <td style={{ ...td, ...ellipsis, color: colors.muted }} title={p.teamName || ""}>
                      {p.teamName || "—"}
                    </td>
                    <td style={{ ...td, ...ellipsis }} title={stack}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 650, maxWidth: "100%" }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 99,
                            background: STACK_COLOR[stack],
                            flexShrink: 0,
                          }}
                        />
                        <span style={ellipsis}>{stack}</span>
                      </span>
                    </td>
                    <td style={{ ...td, ...ellipsis, color: colors.muted }} title={PROFILE_SHORT[p.profile] || p.profile}>
                      {PROFILE_SHORT[p.profile] || p.profile}
                    </td>
                    <td style={{ ...td, fontWeight: 700 }} title={p.projectName}>
                      <a href={`#/project/${p.id}`} className="project-link" style={{ ...ellipsis, display: "block" }}>
                        {p.projectName}
                      </a>
                    </td>
                    <td style={{ ...td, ...ellipsis, color: colors.muted }} title={p.phase || ""}>
                      {p.phase || "—"}
                    </td>
                    <td style={td}>
                      {canManage && onPossibilityChange ? (
                        <select
                          value={possible}
                          onChange={(e) => onPossibilityChange(p, e.target.value)}
                          aria-label={`Possible for ${p.phase || p.projectName}`}
                          title="Flag whether this phase is possible"
                          style={{
                            ...possibilityStyles(isYes),
                            borderRadius: 8,
                            padding: "4px 6px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            width: "100%",
                            maxWidth: 72,
                          }}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            ...possibilityStyles(isYes),
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}
                        >
                          {possible}
                        </span>
                      )}
                    </td>
                    <td style={td} title={p.orderId || ""}>
                      {p.orderUrl || p.orderId ? (
                        <a
                          href={p.orderUrl || `https://www.fiverr.com/orders/${p.orderId}/activities`}
                          target="_blank"
                          rel="noreferrer"
                          className="project-link mono"
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, maxWidth: "100%" }}
                        >
                          <span style={ellipsis}>{p.orderId || "Open"}</span>
                          <ExternalLink size={11} style={{ flexShrink: 0 }} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono" style={{ ...td, ...ellipsis, fontWeight: 650 }} title={fmtMoney(p.price)}>
                      {fmtMoney(p.price)}
                    </td>
                    <td
                      className="mono"
                      style={{
                        ...td,
                        ...ellipsis,
                        color: isDatelineOverdue(p)
                          ? colors.late
                          : hasAdminSchedule(p)
                            ? colors.delivered
                            : colors.muted,
                        fontWeight: hasAdminSchedule(p) || isDatelineOverdue(p) ? 700 : 500,
                      }}
                      title={projectDatelineTitle(p)}
                    >
                      {formatProjectDateline(p)}
                    </td>
                    <td style={td}>
                      <StatusBadge status={statusOf(p)} compact />
                    </td>
                    {canManage && (
                    <td style={{ ...td, width: 84, textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => onEdit(p)}
                          title="Edit"
                          aria-label="Edit project"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 30,
                            height: 30,
                            background: colors.panel2,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            color: colors.text,
                            flexShrink: 0,
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          title="Delete"
                          aria-label="Delete project"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 30,
                            height: 30,
                            background: "rgba(226, 75, 74, 0.12)",
                            border: `1px solid rgba(226, 75, 74, 0.28)`,
                            borderRadius: 8,
                            color: colors.late,
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedProjects.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 12px",
              borderTop: `1px solid ${colors.border}`,
              background: colors.panel2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
                Showing {rangeStart}–{rangeEnd} of {sortedProjects.length}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  style={{
                    background: colors.panel,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "5px 7px",
                    color: colors.text,
                    fontSize: 12,
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button
                onClick={() => onPageChange(safePage - 1)}
                disabled={safePage <= 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: colors.panel,
                  color: safePage <= 1 ? colors.border : colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  opacity: safePage <= 1 ? 0.5 : 1,
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers().map((page, idx) =>
                page === "…" ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: colors.muted, fontSize: 11 }}>
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    style={{
                      minWidth: 28,
                      height: 28,
                      background: safePage === page ? colors.accent : colors.panel,
                      color: safePage === page ? colors.onAccent : colors.text,
                      border: `1px solid ${safePage === page ? colors.accent : colors.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => onPageChange(safePage + 1)}
                disabled={safePage >= totalPages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: colors.panel,
                  color: safePage >= totalPages ? colors.border : colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  opacity: safePage >= totalPages ? 0.5 : 1,
                }}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
        {sortedProjects.length} of {totalCount} projects match filters · page {safePage} of {totalPages}
      </div>
    </>
  );
}
