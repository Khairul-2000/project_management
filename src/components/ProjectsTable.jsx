import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock3,
  Download,
  X,
} from "lucide-react";
import { PROFILE_SHORT, formatProfileName, STACK_COLOR, PAGE_SIZE_OPTIONS } from "../lib/constants";
import {
  getProjectStack,
  statusOf,
  fmtMoney,
  normalizePossibility,
  formatProjectDateline,
  projectDatelineTitle,
  hasAdminSchedule,
  isDatelineOverdue,
  getDaysLeft,
  formatDaysLeft,
} from "../lib/utils";
import { useTheme } from "../lib/theme";
import StatusBadge from "./StatusBadge";
import { GitRepoBadges } from "./GitIcons";
import { exportProjectsToCsv } from "../lib/csvHelper";

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarBg(name) {
  const hues = [210, 25, 270, 160, 45, 340];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 65%, 45%)`;
}

export default function ProjectsTable({
  projects = [],
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onPossibilityChange,
  onStatusChange,
  onBulkUpdateStatus,
  onBulkDelete,
  canManage = true,
  canDelete = false,
  canViewFinancials = true,
  canChangeStatus = true,
}) {
  const { colors, card } = useTheme();

  // Multi-column sort: { key: string, dir: "asc" | "desc" | null }
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });

  // Multi-select for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  function handleSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.dir === "asc") return { key, dir: "desc" };
        if (prev.dir === "desc") return { key: null, dir: null };
        return { key, dir: "asc" };
      }
      return { key, dir: "asc" };
    });
    onPageChange(1);
  }

  const sortedProjects = useMemo(() => {
    if (!sortConfig.key || !sortConfig.dir) return projects;

    const dir = sortConfig.dir === "asc" ? 1 : -1;
    return [...projects].sort((a, b) => {
      switch (sortConfig.key) {
        case "date": {
          const da = new Date(a.date || 0).getTime() || 0;
          const db = new Date(b.date || 0).getTime() || 0;
          return (da - db) * dir;
        }
        case "projectName":
          return (a.projectName || "").localeCompare(b.projectName || "") * dir;
        case "stack":
          return getProjectStack(a).localeCompare(getProjectStack(b)) * dir;
        case "price":
          return ((Number(a.price) || 0) - (Number(b.price) || 0)) * dir;
        case "status":
          return statusOf(a).localeCompare(statusOf(b)) * dir;
        case "possibility": {
          const pa = normalizePossibility(a.possibility) === "Yes" ? 1 : 0;
          const pb = normalizePossibility(b.possibility) === "Yes" ? 1 : 0;
          return (pa - pb) * dir;
        }
        case "dateline": {
          const la = getDaysLeft(a) ?? 9999;
          const lb = getDaysLeft(b) ?? 9999;
          return (la - lb) * dir;
        }
        default:
          return 0;
      }
    });
  }, [projects, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, safePage, pageSize]);

  const rangeStart = sortedProjects.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sortedProjects.length);

  // Selection handlers
  const allPageSelected = pageRows.length > 0 && pageRows.every((p) => selectedIds.has(p.id));
  const somePageSelected = pageRows.some((p) => selectedIds.has(p.id));

  function toggleSelectAllPage() {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      pageRows.forEach((p) => next.delete(p.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      pageRows.forEach((p) => next.add(p.id));
      setSelectedIds(next);
    }
  }

  function toggleSelectRow(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
    textAlign: "left",
  };

  const td = {
    padding: "10px 8px",
    verticalAlign: "middle",
    fontSize: 12,
  };

  const ellipsis = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  function renderSortHeader(label, sortKey, width) {
    const isSorted = sortConfig.key === sortKey;
    const Icon = isSorted
      ? sortConfig.dir === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;

    return (
      <th key={sortKey || label} style={{ ...th, width }}>
        {sortKey ? (
          <button
            type="button"
            onClick={() => handleSort(sortKey)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              color: isSorted ? colors.accent : colors.muted,
              fontWeight: 700,
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              cursor: "pointer",
            }}
          >
            {label}
            <Icon size={12} strokeWidth={isSorted ? 2.5 : 1.75} />
          </button>
        ) : (
          label
        )}
      </th>
    );
  }

  return (
    <>
      {/* Floating / Embedded Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            ...card,
            padding: "8px 18px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            background: "#1A1B20",
            color: "#FFFFFF",
            borderRadius: 9999,
            border: "1px solid #2B2D38",
            boxShadow: colors.shadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: colors.accentSoft || "#F7CE46",
                color: "#1A1B20",
                padding: "2px 9px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {selectedIds.size}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>projects selected</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {onBulkUpdateStatus && canChangeStatus ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onBulkUpdateStatus(Array.from(selectedIds), "Delivered");
                    setSelectedIds(new Set());
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 14px",
                    borderRadius: 9999,
                    border: `1px solid ${colors.delivered}55`,
                    background: `${colors.delivered}22`,
                    color: colors.delivered,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <CheckCircle2 size={13} /> Mark Delivered
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onBulkUpdateStatus(Array.from(selectedIds), "WIP");
                    setSelectedIds(new Set());
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 14px",
                    borderRadius: 9999,
                    border: `1px solid ${colors.wip}55`,
                    background: `${colors.wip}22`,
                    color: colors.wip,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Clock3 size={13} /> Mark WIP
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => {
                const selectedProjects = projects.filter((p) => selectedIds.has(p.id));
                exportProjectsToCsv(selectedProjects, `selected-projects-${Date.now()}.csv`);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Download size={13} /> Export CSV
            </button>

            {onBulkDelete && canDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} selected projects?`)) {
                    onBulkDelete(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: `1px solid ${colors.late}55`,
                  background: `${colors.late}22`,
                  color: colors.late,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: "none",
                border: "none",
                color: "#8E92A0",
                padding: 4,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              title="Clear selection"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div style={{ ...card, borderRadius: 24, overflow: "hidden" }}>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 1180,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: colors.panel2 }}>
                <th style={{ ...th, width: 36, textAlign: "center", padding: "10px 4px" }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected;
                    }}
                    onChange={toggleSelectAllPage}
                    style={{ cursor: "pointer" }}
                    aria-label="Select all on page"
                  />
                </th>
                {renderSortHeader("Date", "date", 82)}
                {renderSortHeader("Project & Phase", "projectName", "20%")}
                {renderSortHeader("Dept", "stack", "9%")}
                <th style={{ ...th, width: "8%" }}>Order ID</th>
                <th style={{ ...th, width: 56, textAlign: "center" }}>Repos</th>
                <th style={{ ...th, width: "9%" }}>Team</th>
                <th style={{ ...th, width: "7%" }}>Profile</th>
                <th style={{ ...th, width: "8%" }}>Sales</th>
                {canViewFinancials ? renderSortHeader("Price", "price", 74) : <th style={{ ...th, width: 74 }}>Price</th>}
                {renderSortHeader("Dateline", "dateline", "9%")}
                {renderSortHeader("Status", "status", 88)}
                {renderSortHeader("Possible", "possibility", 78)}
                {canManage || canDelete ? (
                  <th style={{ ...th, width: 80, textAlign: "right" }}>Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={14}
                    style={{ padding: 36, textAlign: "center", color: colors.muted }}
                  >
                    No projects found matching the criteria.
                  </td>
                </tr>
              )}
              {pageRows.map((p, i) => {
                const stack = getProjectStack(p);
                const possible = normalizePossibility(p.possibility);
                const isYes = possible === "Yes";
                const isSelected = selectedIds.has(p.id);
                const daysLeft = getDaysLeft(p);
                const overdue = isDatelineOverdue(p);
                const currentStatus = statusOf(p);

                // Team members preview
                const team = Array.isArray(p.teamMembers) ? p.teamMembers : [];
                const membersList = [
                  ...(p.supervisor ? [{ name: p.supervisor, role: "Supervisor" }] : []),
                  ...team,
                ];

                return (
                  <tr
                    key={p.id}
                    className="table-row"
                    style={{
                      borderTop: `1px solid ${colors.border}`,
                      background: isSelected
                        ? `${colors.accent}14`
                        : i % 2
                          ? colors.panel
                          : colors.bgAccent,
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ ...td, textAlign: "center", padding: "10px 4px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(p.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>

                    {/* Date */}
                    <td
                      className="mono"
                      style={{ ...td, ...ellipsis, color: colors.muted, fontSize: 11 }}
                      title={p.date}
                    >
                      {p.date}
                    </td>

                    {/* Project & Phase UPFRONT */}
                    <td style={{ ...td }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <a
                          href={`#/project/${p.id}`}
                          className="project-link"
                          style={{
                            ...ellipsis,
                            fontSize: 13,
                            fontWeight: 750,
                            display: "block",
                          }}
                          title={p.projectName}
                        >
                          {p.projectName}
                        </a>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              ...ellipsis,
                              fontSize: 11,
                              color: colors.muted,
                              fontWeight: 600,
                              background: colors.panel2,
                              padding: "1px 6px",
                              borderRadius: 6,
                              border: `1px solid ${colors.border}`,
                              maxWidth: "100%",
                            }}
                            title={p.phase || "Main"}
                          >
                            {p.phase || "Main Phase"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department (Stack) */}
                    <td style={{ ...td, ...ellipsis }} title={stack}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontWeight: 650,
                          fontSize: 11.5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 99,
                            background: STACK_COLOR[stack] || "#8A93A3",
                            flexShrink: 0,
                          }}
                        />
                        <span style={ellipsis}>{stack}</span>
                      </span>
                    </td>

                    {/* Order ID */}
                    <td style={td} title={p.orderId || ""}>
                      {p.orderUrl || p.orderId ? (
                        <a
                          href={p.orderUrl || `https://www.fiverr.com/orders/${p.orderId}/activities`}
                          target="_blank"
                          rel="noreferrer"
                          className="project-link mono"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 11,
                            maxWidth: "100%",
                          }}
                        >
                          <span style={ellipsis}>{p.orderId || "Open"}</span>
                          <ExternalLink size={11} style={{ flexShrink: 0 }} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Code Repositories */}
                    <td style={{ ...td, textAlign: "center" }}>
                      <GitRepoBadges githubUrl={p.githubUrl} gitlabUrl={p.gitlabUrl} compact />
                    </td>

                    {/* Team Members */}
                    <td style={{ ...td }}>
                      {membersList.length > 0 ? (
                        <div
                          style={{ display: "inline-flex", alignItems: "center" }}
                          title={membersList.map((m) => `${m.name} (${m.role || "Member"})`).join(", ")}
                        >
                          {membersList.slice(0, 3).map((m, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 99,
                                background: getAvatarBg(m.name),
                                color: "#FFF",
                                fontSize: 9.5,
                                fontWeight: 800,
                                display: "grid",
                                placeItems: "center",
                                marginLeft: idx > 0 ? -6 : 0,
                                border: `2px solid ${colors.panel}`,
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(m.name)}
                            </div>
                          ))}
                          {membersList.length > 3 ? (
                            <span
                              style={{
                                fontSize: 10,
                                color: colors.muted,
                                fontWeight: 700,
                                marginLeft: 4,
                              }}
                            >
                              +{membersList.length - 3}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span style={{ color: colors.muted, fontSize: 11 }}>—</span>
                      )}
                    </td>

                    {/* Fiverr Profile */}
                    <td
                      style={{ ...td, ...ellipsis, color: colors.muted, fontSize: 11 }}
                      title={formatProfileName(p.profile)}
                    >
                      {formatProfileName(p.profile)}
                    </td>

                    {/* Sales Person */}
                    <td style={{ ...td, ...ellipsis, fontWeight: 500, fontSize: 11.5 }} title={p.salesPerson}>
                      {p.salesPerson || "—"}
                    </td>

                    {/* Price */}
                    <td
                      className="mono"
                      style={{ ...td, ...ellipsis, fontWeight: 750, fontSize: 12.5 }}
                      title={canViewFinancials ? fmtMoney(p.price) : "Masked"}
                    >
                      {canViewFinancials ? fmtMoney(p.price) : <span style={{ color: colors.muted }}>—</span>}
                    </td>

                    {/* Dateline & Days Left */}
                    <td style={{ ...td }} title={projectDatelineTitle(p)}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: overdue
                              ? colors.late
                              : daysLeft != null && daysLeft <= 7
                                ? colors.wip
                                : colors.text,
                          }}
                        >
                          {daysLeft != null ? formatDaysLeft(daysLeft) : formatProjectDateline(p)}
                        </span>
                        {p.dateline ? (
                          <span style={{ fontSize: 9.5, color: colors.muted, ...ellipsis }}>
                            {p.dateline}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Status (with inline quick change) */}
                    <td style={td}>
                      {canChangeStatus && onStatusChange ? (
                        <select
                          value={currentStatus}
                          onChange={(e) => onStatusChange(p, e.target.value)}
                          style={{
                            background:
                              currentStatus === "delivered"
                                ? `${colors.delivered}18`
                                : `${colors.wip}18`,
                            color:
                              currentStatus === "delivered"
                                ? colors.delivered
                                : colors.wip,
                            border: `1px solid ${
                              currentStatus === "delivered"
                                ? `${colors.delivered}44`
                                : `${colors.wip}44`
                            }`,
                            borderRadius: 8,
                            padding: "3px 6px",
                            fontSize: 11,
                            fontWeight: 750,
                            cursor: "pointer",
                            outline: "none",
                          }}
                        >
                          <option value="wip">WIP</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      ) : (
                        <StatusBadge status={currentStatus} compact />
                      )}
                    </td>

                    {/* Possible Flag */}
                    <td style={td}>
                      {canManage && onPossibilityChange ? (
                        <select
                          value={possible}
                          onChange={(e) => onPossibilityChange(p, e.target.value)}
                          style={{
                            background: isYes ? `${colors.delivered}18` : colors.panel2,
                            color: isYes ? colors.delivered : colors.muted,
                            border: `1px solid ${isYes ? `${colors.delivered}44` : colors.border}`,
                            borderRadius: 8,
                            padding: "3px 6px",
                            fontSize: 11,
                            fontWeight: 750,
                            cursor: "pointer",
                            outline: "none",
                            width: 62,
                          }}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            color: isYes ? colors.delivered : colors.muted,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {possible}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    {canManage || canDelete ? (
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          {canManage && onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(p)}
                              title="Edit phase"
                              style={{
                                padding: "4px 6px",
                                background: colors.panel2,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 6,
                                color: colors.text,
                                cursor: "pointer",
                              }}
                            >
                              <Pencil size={12} />
                            </button>
                          ) : null}
                          {canDelete && onDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(p.id)}
                              title="Delete phase"
                              style={{
                                padding: "4px 6px",
                                background: colors.panel2,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 6,
                                color: colors.late,
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: `1px solid ${colors.border}`,
            background: colors.panel,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: colors.muted }}>
            Showing <strong>{rangeStart}</strong> to <strong>{rangeEnd}</strong> of{" "}
            <strong>{sortedProjects.length}</strong> entries
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: colors.muted }}>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: "4px 8px",
                  color: colors.text,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => onPageChange(safePage - 1)}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  background: colors.panel2,
                  color: colors.text,
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                  opacity: safePage <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers().map((num, idx) =>
                num === "…" ? (
                  <span key={`dots-${idx}`} style={{ padding: "0 4px", color: colors.muted, fontSize: 12 }}>
                    …
                  </span>
                ) : (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onPageChange(num)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: `1px solid ${num === safePage ? colors.accent : colors.border}`,
                      background: num === safePage ? colors.accent : colors.panel2,
                      color: num === safePage ? colors.onAccent : colors.text,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {num}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => onPageChange(safePage + 1)}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  background: colors.panel2,
                  color: colors.text,
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                  opacity: safePage >= totalPages ? 0.4 : 1,
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
