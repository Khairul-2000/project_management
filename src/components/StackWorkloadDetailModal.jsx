import { useMemo } from "react";
import { X, Users, FolderKanban } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PROFILE_SHORT, STACK_COLOR } from "../lib/constants";
import { getProjectStack, statusOf, fmtMoney } from "../lib/utils";
import { useTheme } from "../lib/theme";
import StatusBadge from "./StatusBadge";

const PROFILE_PIE_COLORS = ["#4F7CFF", "#F08A56", "#2BB67A", "#9B6FE0", "#2BB8BE", "#C9B03A", "#E24B4A", "#8A93A3"];

function personKey(name) {
  return String(name || "").trim().toLowerCase();
}

export default function StackWorkloadDetailModal({ stack, projects, onClose }) {
  const { colors, card } = useTheme();
  const stackColor = STACK_COLOR[stack] || colors.accent;

  const stackProjects = useMemo(
    () => projects.filter((p) => getProjectStack(p) === stack),
    [projects, stack]
  );

  const profilePie = useMemo(() => {
    const map = new Map();
    for (const p of stackProjects) {
      const key = p.profile || "Unknown";
      const prev = map.get(key) || {
        profile: key,
        name: PROFILE_SHORT[key] || key,
        value: 0,
      };
      prev.value += 1;
      map.set(key, prev);
    }
    return [...map.values()]
      .sort((a, b) => b.value - a.value)
      .map((row, i) => ({ ...row, color: PROFILE_PIE_COLORS[i % PROFILE_PIE_COLORS.length] }));
  }, [stackProjects]);

  const peopleBreakdown = useMemo(() => {
    const map = new Map();
    for (const p of stackProjects) {
      const members = Array.isArray(p.teamMembers) ? p.teamMembers : [];
      const names = members.length
        ? members.map((m) => m.name).filter(Boolean)
        : String(p.membersRaw || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      const unique = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
      for (const name of unique) {
        const key = personKey(name);
        const prev = map.get(key) || { name, projects: [] };
        prev.projects.push({
          id: p.id,
          projectName: p.projectName,
          profile: PROFILE_SHORT[p.profile] || p.profile,
          status: statusOf(p),
          role: members.find((m) => personKey(m.name) === key)?.role || "",
        });
        map.set(key, prev);
      }
    }
    return [...map.values()].sort(
      (a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name)
    );
  }, [stackProjects]);

  const delivered = stackProjects.filter((p) => statusOf(p) === "delivered").length;
  const wip = stackProjects.filter((p) => statusOf(p) === "wip").length;
  const value = stackProjects.reduce((s, p) => s + Number(p.price || 0), 0);

  const tooltipStyle = {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    fontSize: 12.5,
    boxShadow: colors.shadowSoft,
    color: colors.text,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: colors.overlay,
        display: "grid",
        placeItems: "center",
        zIndex: 70,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...card,
          width: "min(820px, 100%)",
          maxHeight: "88vh",
          overflow: "auto",
          padding: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 20px",
            borderBottom: `1px solid ${colors.border}`,
            position: "sticky",
            top: 0,
            background: colors.panel,
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: stackColor }} />
              <h2 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {stack} workload
              </h2>
            </div>
            <div style={{ fontSize: 13, color: colors.muted, fontWeight: 500 }}>
              {stackProjects.length} orders · {fmtMoney(value)} ·{" "}
              <span style={{ color: colors.delivered }}>{delivered} delivered</span>
              {" · "}
              <span style={{ color: colors.wip }}>{wip} WIP</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              color: colors.text,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px 20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile pie */}
          <section>
            <div className="disp" style={{ fontWeight: 750, fontSize: 14, marginBottom: 8 }}>
              Projects by Fiverr profile
            </div>
            {profilePie.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.muted }}>No profile data.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={profilePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {profilePie.map((row) => (
                      <Cell key={row.profile} fill={row.color} stroke={colors.panel} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name) => [`${val} project${val === 1 ? "" : "s"}`, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(v) => <span style={{ color: colors.muted }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* People → projects */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Users size={15} style={{ color: colors.accent }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>
                People & projects
                <span style={{ color: colors.muted, fontWeight: 500, marginLeft: 6 }}>
                  {peopleBreakdown.length} people
                </span>
              </h3>
            </div>
            {peopleBreakdown.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.muted }}>No team assignments yet.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {peopleBreakdown.map((person) => (
                  <div
                    key={person.name}
                    style={{
                      background: colors.panel2,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontWeight: 750, fontSize: 13, marginBottom: 6 }}>
                      {person.name}
                      <span style={{ color: colors.muted, fontWeight: 500, marginLeft: 6, fontSize: 11.5 }}>
                        {person.projects.length} project{person.projects.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {person.projects.slice(0, 5).map((pr) => (
                        <a
                          key={`${person.name}-${pr.id}`}
                          href={`#/project/${pr.id}`}
                          onClick={onClose}
                          className="project-link"
                          style={{ fontSize: 12, fontWeight: 650, textDecoration: "none" }}
                        >
                          {pr.projectName}
                          <span style={{ color: colors.muted, fontWeight: 500 }}>
                            {" · "}
                            {pr.profile}
                            {pr.role ? ` · ${pr.role}` : ""}
                          </span>
                        </a>
                      ))}
                      {person.projects.length > 5 ? (
                        <span style={{ fontSize: 11, color: colors.muted }}>
                          +{person.projects.length - 5} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Compact project list */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <FolderKanban size={15} style={{ color: colors.accent }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>Projects</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflow: "auto" }}>
              {stackProjects.map((p) => {
                const team = (Array.isArray(p.teamMembers) ? p.teamMembers : [])
                  .map((m) => m.name)
                  .filter(Boolean)
                  .slice(0, 4)
                  .join(", ");
                return (
                  <a
                    key={p.id}
                    href={`#/project/${p.id}`}
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "9px 11px",
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: colors.panel2,
                      textDecoration: "none",
                      color: colors.text,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.projectName}</div>
                      <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>
                        {PROFILE_SHORT[p.profile] || p.profile || "—"}
                        {team ? ` · ${team}` : p.membersRaw ? ` · ${p.membersRaw}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 650 }}>
                        {fmtMoney(p.price)}
                      </span>
                      <StatusBadge status={statusOf(p)} compact />
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
