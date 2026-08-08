import { useMemo } from "react";
import { Pencil, Trash2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, PROFILE_SHORT, STACK_COLOR, PAGE_SIZE_OPTIONS } from "../lib/constants";
import { deriveStack, statusOf, fmtMoney } from "../lib/utils";
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
}) {
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return projects.slice(start, start + pageSize);
  }, [projects, safePage, pageSize]);

  const rangeStart = projects.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, projects.length);

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

  return (
    <>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.panel2, textAlign: "left" }}>
                {["Date", "Sales person", "Team", "Department", "Profile", "Project", "Phase", "Order", "Price", "Dateline", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      color: COLORS.muted,
                      fontWeight: 600,
                      fontSize: 11.5,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 24, textAlign: "center", color: COLORS.muted }}>
                    No projects match this filter.
                  </td>
                </tr>
              )}
              {pageRows.map((p, i) => {
                const stack = p.stack || deriveStack(p.phase);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderTop: `1px solid ${COLORS.border}`,
                      background: i % 2 ? "transparent" : COLORS.panel2 + "55",
                    }}
                  >
                    <td className="mono" style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {p.date}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{p.salesPerson}</td>
                    <td style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {p.teamName || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 99,
                            background: STACK_COLOR[stack],
                            display: "inline-block",
                          }}
                        />
                        {stack}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {PROFILE_SHORT[p.profile] || p.profile}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>
                      <a href={`#/project/${p.id}`} className="project-link">
                        {p.projectName}
                      </a>
                    </td>
                    <td style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {p.phase || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {p.orderUrl || p.orderId ? (
                        <a
                          href={p.orderUrl || `https://www.fiverr.com/orders/${p.orderId}/activities`}
                          target="_blank"
                          rel="noreferrer"
                          className="project-link mono"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}
                        >
                          {p.orderId || "Open"} <ExternalLink size={12} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono" style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {fmtMoney(p.price)}
                    </td>
                    <td className="mono" style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {p.dateline || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <StatusBadge status={statusOf(p)} />
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => onEdit(p)}
                        style={{ background: "none", border: "none", color: COLORS.muted, padding: 5 }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        style={{ background: "none", border: "none", color: COLORS.late, padding: 5 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {projects.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 14px",
              borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.panel2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11.5, color: COLORS.muted }}>
                Showing {rangeStart}–{rangeEnd} of {projects.length}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.muted }}>
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  style={{
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    padding: "5px 8px",
                    color: COLORS.text,
                    fontSize: 12.5,
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

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => onPageChange(safePage - 1)}
                disabled={safePage <= 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  background: COLORS.panel,
                  color: safePage <= 1 ? COLORS.border : COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  opacity: safePage <= 1 ? 0.5 : 1,
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((page, idx) =>
                page === "…" ? (
                  <span key={`ellipsis-${idx}`} className="mono" style={{ padding: "0 6px", color: COLORS.muted, fontSize: 12 }}>
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    style={{
                      minWidth: 32,
                      height: 32,
                      background: safePage === page ? COLORS.accent : COLORS.panel,
                      color: safePage === page ? "#0D1117" : COLORS.text,
                      border: `1px solid ${safePage === page ? COLORS.accent : COLORS.border}`,
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
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
                  width: 32,
                  height: 32,
                  background: COLORS.panel,
                  color: safePage >= totalPages ? COLORS.border : COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  opacity: safePage >= totalPages ? 0.5 : 1,
                }}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mono" style={{ marginTop: 10, fontSize: 11.5, color: COLORS.muted }}>
        {projects.length} of {totalCount} projects match filters · page {safePage} of {totalPages}
      </div>
    </>
  );
}
