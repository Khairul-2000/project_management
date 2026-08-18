import { useEffect, useMemo, useState } from "react";
import { Eye, Plus, X } from "lucide-react";
import { useTheme } from "../lib/theme";
import { createUser, listUsers, patchUser, syncAssignmentsFromProjects } from "../lib/auth";
import { isAdminRole, isSuperAdmin, roleLabel } from "../lib/roles";

export default function UsersAdmin({ projects, clientProjects = [], currentUser }) {
  const { colors, card } = useTheme();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "member" });
  const [viewUserId, setViewUserId] = useState(null);
  const [projectQuery, setProjectQuery] = useState("");
  const [resetPassword, setResetPassword] = useState({});
  const [syncingAssignments, setSyncingAssignments] = useState(false);

  const canManageAdmins = isSuperAdmin(currentUser);

  function projectNameKey(name) {
    return String(name || "").trim().toLowerCase();
  }

  const phasesByClientKey = useMemo(() => {
    const map = new Map();
    for (const p of projects || []) {
      const key = projectNameKey(p.projectName);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return map;
  }, [projects]);

  const clientOptions = useMemo(() => {
    const fromRegistry = (clientProjects || []).map((cp) => ({
      id: cp.id,
      projectName: cp.projectName,
      projectNameKey: cp.projectNameKey || projectNameKey(cp.projectName),
    }));
    const seen = new Set(fromRegistry.map((c) => c.projectNameKey));
    for (const [key, phases] of phasesByClientKey) {
      if (seen.has(key)) continue;
      const name = phases[0]?.projectName || key;
      fromRegistry.push({
        id: `cp-${key.replace(/[^a-z0-9]+/g, "-")}`,
        projectName: name,
        projectNameKey: key,
      });
    }
    return fromRegistry.sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [clientProjects, phasesByClientKey]);

  function clientProjectsForUser(user) {
    if (!user || isAdminRole(user)) return [];
    const allowed = new Set((user.assignedProjectIds || []).map(String));
    return clientOptions
      .map((cp) => {
        const phases = phasesByClientKey.get(cp.projectNameKey) || [];
        const linked = phases.filter((p) => allowed.has(String(p.id)));
        if (!linked.length) return null;
        return { ...cp, phases: linked };
      })
      .filter(Boolean)
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  }

  async function syncFromProjects() {
    setSyncingAssignments(true);
    setError("");
    try {
      const result = await syncAssignmentsFromProjects();
      setUsers(result.users || []);
      const unmatched = result.unmatched || {};
      const unmatchedNote = Object.keys(unmatched).length
        ? ` · unmatched names: ${Object.keys(unmatched).join(", ")}`
        : "";
      setStatus(
        `Synced from projects.json · ${result.totalLinks} links across ${result.updatedMembers} member update(s)${unmatchedNote}`
      );
    } catch (err) {
      setError(err.message || "Sync failed");
    } finally {
      setSyncingAssignments(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const viewUser = useMemo(
    () => users.find((u) => u.id === viewUserId) || null,
    [users, viewUserId]
  );

  const linkedProjects = useMemo(
    () => (viewUser ? clientProjectsForUser(viewUser) : []),
    [viewUser, clientOptions, phasesByClientKey]
  );

  const viewProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return linkedProjects;
    return linkedProjects.filter((cp) => cp.projectName.toLowerCase().includes(q));
  }, [linkedProjects, projectQuery]);

  function openProjects(user) {
    setViewUserId(user.id);
    setProjectQuery("");
  }

  async function onCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const user = await createUser(form);
      setUsers((prev) => [...prev, user]);
      setForm({ name: "", username: "", password: "", role: "member" });
      setStatus(`Created ${user.username}`);
    } catch (err) {
      setError(err.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user) {
    try {
      const updated = await patchUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRole(user, role) {
    if (role === user.role) return;
    setError("");
    try {
      const updated = await patchUser(user.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setStatus(`Updated ${user.username} to ${updated.role}`);
      if (viewUserId === user.id && isAdminRole(updated)) {
        setViewUserId(null);
      }
    } catch (err) {
      setError(err.message || "Failed to update role");
    }
  }

  async function applyResetPassword(user) {
    const password = resetPassword[user.id];
    if (!password) return;
    try {
      const updated = await patchUser(user.id, { password });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setResetPassword((prev) => ({ ...prev, [user.id]: "" }));
      setStatus(`Password updated for ${user.username}`);
    } catch (err) {
      setError(err.message);
    }
  }

  const field = {
    width: "100%",
    boxSizing: "border-box",
    background: colors.panel2,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: "9px 11px",
    color: colors.text,
    fontSize: 13,
  };

  return (
    <div style={{ padding: "20px 16px 48px", maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <h1 className="disp" style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>
          User management
        </h1>
        <div style={{ color: colors.muted, fontSize: 13 }}>
          Create accounts and change roles. Super admin can assign an admin as supervisor or any member.
          Member project access comes from team names on projects — use <strong>Sync from projects</strong>, then open a member to see
          their associated client projects.
        </div>
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={syncFromProjects}
            disabled={syncingAssignments}
            style={{
              background: colors.accent,
              color: colors.onAccent,
              border: "none",
              borderRadius: 10,
              padding: "9px 14px",
              fontWeight: 700,
              fontSize: 13,
              opacity: syncingAssignments ? 0.75 : 1,
            }}
          >
            {syncingAssignments ? "Syncing…" : "Sync from projects"}
          </button>
        </div>
        {status ? <div style={{ marginTop: 10, color: colors.delivered, fontSize: 13, fontWeight: 650 }}>{status}</div> : null}
        {error ? <div style={{ marginTop: 10, color: colors.late, fontSize: 13, fontWeight: 650 }}>{error}</div> : null}
      </div>

      <div style={{ ...card, padding: "18px 20px", marginBottom: 16 }}>
        <div className="disp" style={{ fontWeight: 750, fontSize: 16, marginBottom: 12 }}>Create user</div>
        <form onSubmit={onCreate} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr auto", gap: 10 }}>
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={field}
          />
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            style={field}
          />
          <input
            type="password"
            placeholder="Temp password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            style={field}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={field}
          >
            <option value="member">Member</option>
            {canManageAdmins ? <option value="admin">Admin</option> : null}
          </select>
          <button
            type="submit"
            disabled={creating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: colors.accent,
              color: colors.onAccent,
              border: "none",
              borderRadius: 10,
              padding: "0 14px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={15} /> Add
          </button>
        </form>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.panel2, textAlign: "left" }}>
                {["Name", "Username", "Role", "Active", "Projects", "Password", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", color: colors.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 20, color: colors.muted, textAlign: "center" }}>
                    Loading users…
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => {
                  const linkedCount = isAdminRole(u) ? null : clientProjectsForUser(u).length;
                  const roleLocked = !canManageAdmins && isAdminRole(u);
                  return (
                    <tr key={u.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "10px 12px", fontWeight: 650 }}>{u.name}</td>
                      <td className="mono" style={{ padding: "10px 12px" }}>{u.username}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value)}
                          aria-label={`Role for ${u.username}`}
                          disabled={roleLocked}
                          style={{ ...field, width: "auto", minWidth: 130, padding: "7px 8px" }}
                        >
                          <option value="member">{roleLabel("member")}</option>
                          {(canManageAdmins || u.role === "admin") ? (
                            <option value="admin">{roleLabel("admin")}</option>
                          ) : null}
                          {(canManageAdmins || u.role === "super_admin") ? (
                            <option value="super_admin">{roleLabel("super_admin")}</option>
                          ) : null}
                        </select>
                      </td>
                      <td style={{ padding: "10px 12px", color: u.active ? colors.delivered : colors.late }}>
                        {u.active ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isAdminRole(u) ? "All" : linkedCount}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="password"
                            placeholder={u.hasPassword ? "Reset…" : "Set…"}
                            value={resetPassword[u.id] || ""}
                            onChange={(e) => setResetPassword((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            style={{ ...field, width: 110, padding: "7px 8px" }}
                          />
                          <button
                            type="button"
                            onClick={() => applyResetPassword(u)}
                            style={{
                              background: colors.panel2,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 8,
                              color: colors.text,
                              padding: "7px 8px",
                              fontWeight: 650,
                              fontSize: 12,
                            }}
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {u.role === "member" && (
                          <button
                            type="button"
                            onClick={() => openProjects(u)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: colors.panel2,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 8,
                              color: colors.text,
                              padding: "7px 10px",
                              fontWeight: 700,
                              fontSize: 12,
                              marginRight: 6,
                            }}
                          >
                            <Eye size={13} /> Projects
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          style={{
                            background: colors.panel2,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            color: colors.text,
                            padding: "7px 10px",
                            fontWeight: 650,
                            fontSize: 12,
                          }}
                        >
                          {u.active ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {viewUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: colors.overlay,
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setViewUserId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...card,
              width: "min(720px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <div>
                <div className="disp" style={{ fontWeight: 800, fontSize: 18 }}>
                  Assigned projects · {viewUser.name}
                </div>
                <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                  {linkedProjects.length} client project
                  {linkedProjects.length === 1 ? "" : "s"} linked via sync / team membership
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewUserId(null)}
                aria-label="Close"
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.muted,
                  padding: 8,
                  display: "inline-flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <input
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
              placeholder="Search assigned projects…"
              style={{ ...field, margin: "12px 0" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflow: "auto" }}>
              {viewProjects.length === 0 ? (
                <div
                  style={{
                    padding: "18px 12px",
                    textAlign: "center",
                    color: colors.muted,
                    fontSize: 13,
                    border: `1px dashed ${colors.border}`,
                    borderRadius: 10,
                  }}
                >
                  No projects linked to this member yet. Run <strong>Sync from projects</strong> after
                  they appear on project teams.
                </div>
              ) : (
                viewProjects.map((cp) => (
                  <div
                    key={cp.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: colors.panel2,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{cp.projectName}</div>
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                      {cp.phases.length} phase{cp.phases.length === 1 ? "" : "s"}
                      {cp.phases.length
                        ? ` · ${cp.phases
                            .map((p) => p.phase || p.stack || "Phase")
                            .slice(0, 4)
                            .join(", ")}${cp.phases.length > 4 ? "…" : ""}`
                        : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
