import { useEffect, useMemo, useState } from "react";
import { Users, FolderKanban, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "../lib/constants";
import { useTheme } from "../lib/theme";
import { fmtMoney, statusOf } from "../lib/utils";

function projectNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

export default function ClientProjects({ clientProjects, phases, onOpen, isAdmin = true }) {
  const { colors, card } = useTheme();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0] || 10);

  const rows = useMemo(() => {
    const byKey = new Map();
    for (const p of phases || []) {
      const key = projectNameKey(p.projectName);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(p);
    }

    return (clientProjects || [])
      .map((cp) => {
        const key = cp.projectNameKey || projectNameKey(cp.projectName);
        const kids = byKey.get(key) || [];
        const delivered = kids.filter((p) => statusOf(p) === "delivered").length;
        const wip = kids.filter((p) => statusOf(p) === "wip").length;
        const value = kids.reduce((s, p) => s + Number(p.price || 0), 0);
        const team = Array.isArray(cp.teamMembers) ? cp.teamMembers : [];
        return {
          ...cp,
          phaseCount: kids.length,
          delivered,
          wip,
          value,
          teamCount: team.length + (cp.supervisor ? 1 : 0),
          teamNames: [
            ...(cp.supervisor ? [cp.supervisor] : []),
            ...team.map((m) => m.name).filter(Boolean),
          ],
        };
      })
      .filter((row) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          row.projectName.toLowerCase().includes(q) ||
          row.teamNames.some((n) => String(n).toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Projects with WIP first, then higher WIP count, then name
        if (b.wip !== a.wip) return b.wip - a.wip;
        if (b.phaseCount !== a.phaseCount) return b.phaseCount - a.phaseCount;
        return a.projectName.localeCompare(b.projectName);
      });
  }, [clientProjects, phases, query]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, clientProjects]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, rows.length);

  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return [...pages]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)
      .reduce((acc, p, idx, arr) => {
        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
        acc.push(p);
        return acc;
      }, []);
  }

  return (
    <div style={{ padding: "20px 16px 48px", maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ ...card, padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="disp" style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>
              Projects
            </h1>
            <div style={{ color: colors.muted, fontSize: 13 }}>
              {isAdmin
                ? "Client-level tracking by sheet project name. Assign a team once; new phases inherit it on sync."
                : "Projects assigned to you. Open a project to view its phases and details."}
            </div>
          </div>
          <div style={{ position: "relative", minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: colors.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: colors.panel2,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "9px 11px 9px 30px",
                color: colors.text,
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ ...card, padding: 28, textAlign: "center", color: colors.muted, fontSize: 13 }}>
          No client projects yet. Sync from Google Sheets to create them from Project Name.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10 }}>
            {pageRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onOpen(row)}
                style={{
                  ...card,
                  padding: "14px 16px",
                  textAlign: "left",
                  color: colors.text,
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <FolderKanban size={15} style={{ color: colors.accentSoft, flexShrink: 0 }} />
                    <div className="disp" style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.projectName}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, fontWeight: 500 }}>
                    {row.phaseCount} phase{row.phaseCount === 1 ? "" : "s"} · {fmtMoney(row.value)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, fontWeight: 650 }}>
                  <span style={{ color: colors.delivered }}>{row.delivered} delivered</span>
                  <span style={{ color: colors.wip }}>{row.wip} WIP</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.muted, fontSize: 12, fontWeight: 600 }}>
                  <Users size={14} />
                  {row.teamCount ? row.teamNames.slice(0, 2).join(", ") + (row.teamNames.length > 2 ? "…" : "") : "No team"}
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              ...card,
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
                Showing {rangeStart}–{rangeEnd} of {rows.length}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    background: colors.panel2,
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
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: colors.panel2,
                  color: safePage <= 1 ? colors.border : colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  opacity: safePage <= 1 ? 0.5 : 1,
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers().map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: colors.muted, fontSize: 11 }}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
                      minWidth: 28,
                      height: 28,
                      background: safePage === p ? colors.accent : colors.panel2,
                      color: safePage === p ? colors.onAccent : colors.text,
                      border: `1px solid ${safePage === p ? colors.accent : colors.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: colors.panel2,
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
          <div style={{ marginTop: 8, fontSize: 11.5, color: colors.muted, fontWeight: 500 }}>
            {rows.length} project{rows.length === 1 ? "" : "s"}
            {query.trim() ? " match search" : ""} · page {safePage} of {totalPages}
          </div>
        </>
      )}
    </div>
  );
}
