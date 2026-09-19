import { useEffect, useMemo, useState } from "react";
import { Plus, X, Search, Check, FolderKanban, Shield, User, Trash2 } from "lucide-react";
import { useTheme } from "../lib/theme";
import { createUser, listUsers, patchUser, syncAssignmentsFromProjects } from "../lib/auth";
import { isAdminRole, isSuperAdmin, roleLabel, roleBadgeColor } from "../lib/roles";
import { GitHubIcon, GitLabIcon } from "./GitIcons";
import { saveStoredUsers } from "../lib/clientStorage";

export default function UsersAdmin({ projects = [], clientProjects = [], currentUser }) {
  const { colors, card } = useTheme();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New user form state
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "member",
    githubUsername: "",
    gitlabUsername: "",
  });

  // Assign projects modal state
  const [assigningUser, setAssigningUser] = useState(null);
  const [assignSearch, setAssignSearch] = useState("");
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

  async function onCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const user = await createUser(form);
      setUsers((prev) => [...prev, user]);
      setForm({
        name: "",
        username: "",
        password: "",
        role: "member",
        githubUsername: "",
        gitlabUsername: "",
      });
      setShowCreateModal(false);
      setStatus(`Created user: ${user.name} (@${user.username})`);
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
      setStatus(`Updated role for ${user.username} to ${roleLabel(role)}`);
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

  async function toggleProjectAssignment(userId, phaseId) {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const currentAssigned = new Set((targetUser.assignedProjectIds || []).map(String));
    const strId = String(phaseId);
    if (currentAssigned.has(strId)) {
      currentAssigned.delete(strId);
    } else {
      currentAssigned.add(strId);
    }

    try {
      const updated = await patchUser(userId, {
        assignedProjectIds: Array.from(currentAssigned),
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (assigningUser?.id === userId) {
        setAssigningUser(updated);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function syncFromProjects() {
    setSyncingAssignments(true);
    setError("");
    try {
      const result = await syncAssignmentsFromProjects();
      setUsers(result.users || []);
      setStatus(
        `Synced from projects: ${result.totalLinks} links updated across ${result.updatedMembers} member(s)`
      );
    } catch (err) {
      setError(err.message || "Sync failed");
    } finally {
      setSyncingAssignments(false);
    }
  }

  const field = {
    width: "100%",
    boxSizing: "border-box",
    background: colors.panel2,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: colors.text,
    fontSize: 13,
  };

  return (
    <div style={{ padding: "20px 16px 48px", maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {/* Header & Overview Card */}
      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="disp" style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>
              User Management & Access Control
            </h1>
            <div style={{ color: colors.muted, fontSize: 13, maxWidth: 650 }}>
              Manage team accounts, developer roles, GitHub/GitLab usernames, and project permissions. Super Admin can configure administrators and project leads.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={syncFromProjects}
              disabled={syncingAssignments}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: colors.panel2,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "8px 12px",
                fontWeight: 650,
                fontSize: 12.5,
                cursor: syncingAssignments ? "wait" : "pointer",
              }}
            >
              {syncingAssignments ? "Syncing…" : "Sync from Projects"}
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: colors.accent,
                color: colors.onAccent,
                border: "none",
                borderRadius: 10,
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <Plus size={15} /> Add User
            </button>
          </div>
        </div>

        {status ? (
          <div style={{ marginTop: 12, color: colors.delivered, fontSize: 13, fontWeight: 650 }}>
            {status}
          </div>
        ) : null}
        {error ? (
          <div style={{ marginTop: 12, color: colors.late, fontSize: 13, fontWeight: 650 }}>
            {error}
          </div>
        ) : null}
      </div>

      {/* Users Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.panel2, textAlign: "left" }}>
                {["Name", "Username", "Role", "Git Profiles", "Active", "Assigned Projects", "Password", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      color: colors.muted,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: "center", color: colors.muted }}>
                    Loading users…
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => {
                  const isAdmin = isAdminRole(u);
                  const isSuper = isSuperAdmin(u);
                  const assignedCount = (u.assignedProjectIds || []).length;
                  const roleColor = roleBadgeColor(u.role, colors);

                  return (
                    <tr key={u.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      {/* Name */}
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 99,
                              background: `${roleColor}22`,
                              color: roleColor,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              fontSize: 11,
                            }}
                          >
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{u.name}</div>
                            <div style={{ fontSize: 11, color: colors.muted }}>{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="mono" style={{ padding: "10px 12px", fontSize: 12 }}>
                        @{u.username}
                      </td>

                      {/* Role */}
                      <td style={{ padding: "10px 12px" }}>
                        {canManageAdmins ? (
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                            style={{
                              ...field,
                              width: "auto",
                              padding: "5px 8px",
                              fontSize: 12,
                              fontWeight: 700,
                              color: roleColor,
                            }}
                          >
                            <option value="member">Team Member</option>
                            <option value="admin">Admin / Team Lead</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              background: `${roleColor}18`,
                              color: roleColor,
                              border: `1px solid ${roleColor}44`,
                              borderRadius: 8,
                              padding: "3px 8px",
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            {roleLabel(u.role)}
                          </span>
                        )}
                      </td>

                      {/* Git Profiles */}
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {u.githubUsername ? (
                            <a
                              href={`https://github.com/${u.githubUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`GitHub: @${u.githubUsername}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: colors.text,
                                textDecoration: "none",
                                fontSize: 12,
                              }}
                            >
                              <GitHubIcon size={14} />
                              <span className="mono">{u.githubUsername}</span>
                            </a>
                          ) : null}

                          {u.gitlabUsername ? (
                            <a
                              href={`https://gitlab.com/${u.gitlabUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`GitLab: @${u.gitlabUsername}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: colors.text,
                                textDecoration: "none",
                                fontSize: 12,
                              }}
                            >
                              <GitLabIcon size={14} />
                              <span className="mono">{u.gitlabUsername}</span>
                            </a>
                          ) : null}

                          {!u.githubUsername && !u.gitlabUsername ? (
                            <span style={{ color: colors.muted, fontSize: 12 }}>—</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Active Toggle */}
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          disabled={isSuper}
                          style={{
                            border: "none",
                            background: u.active ? `${colors.delivered}18` : `${colors.late}18`,
                            color: u.active ? colors.delivered : colors.late,
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 750,
                            cursor: isSuper ? "default" : "pointer",
                          }}
                        >
                          {u.active ? "Active" : "Disabled"}
                        </button>
                      </td>

                      {/* Assigned Projects */}
                      <td style={{ padding: "10px 12px" }}>
                        {isAdmin ? (
                          <span style={{ fontSize: 12, color: colors.muted, fontWeight: 650 }}>
                            All Projects (Admin)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssigningUser(u)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 8px",
                              borderRadius: 8,
                              border: `1px solid ${colors.border}`,
                              background: colors.panel2,
                              color: colors.text,
                              fontSize: 12,
                              fontWeight: 650,
                              cursor: "pointer",
                            }}
                          >
                            <FolderKanban size={13} />
                            {assignedCount} phase{assignedCount === 1 ? "" : "s"}
                          </button>
                        )}
                      </td>

                      {/* Password Reset */}
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="password"
                            placeholder="New password…"
                            value={resetPassword[u.id] || ""}
                            onChange={(e) =>
                              setResetPassword((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            style={{ ...field, width: 110, padding: "5px 7px", fontSize: 11.5 }}
                          />
                          <button
                            type="button"
                            onClick={() => applyResetPassword(u)}
                            style={{
                              background: colors.panel2,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 6,
                              color: colors.text,
                              padding: "5px 8px",
                              fontWeight: 650,
                              fontSize: 11.5,
                              cursor: "pointer",
                            }}
                          >
                            Set
                          </button>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {!isSuper && u.id !== currentUser?.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Remove user account @${u.username}?`)) {
                                const next = users.filter((usr) => usr.id !== u.id);
                                setUsers(next);
                                await saveStoredUsers(next);
                              }
                            }}
                            title="Delete user"
                            style={{
                              background: "none",
                              border: "none",
                              color: colors.muted,
                              cursor: "pointer",
                              padding: 4,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...card,
              width: "100%",
              maxWidth: 480,
              padding: 24,
              boxShadow: colors.shadow,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>
                Create New User Account
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  placeholder="e.g. Sifat Rahman"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  style={field}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                    Username
                  </label>
                  <input
                    placeholder="e.g. sifat.rahman"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    style={field}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    style={field}
                  >
                    <option value="member">Team Member</option>
                    <option value="admin">Admin / Team Lead</option>
                    {canManageAdmins ? <option value="super_admin">Super Admin</option> : null}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                  Temporary Password
                </label>
                <input
                  type="password"
                  placeholder="Password for sign in"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={field}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                    GitHub Handle
                  </label>
                  <input
                    placeholder="e.g. sifat-dev"
                    value={form.githubUsername}
                    onChange={(e) => setForm({ ...form, githubUsername: e.target.value })}
                    style={field}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                    GitLab Handle
                  </label>
                  <input
                    placeholder="e.g. sifat"
                    value={form.gitlabUsername}
                    onChange={(e) => setForm({ ...form, gitlabUsername: e.target.value })}
                    style={field}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: colors.panel2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: "9px 14px",
                    fontWeight: 650,
                    color: colors.text,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    background: colors.accent,
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 18px",
                    fontWeight: 700,
                    color: colors.onAccent,
                    cursor: "pointer",
                  }}
                >
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Project Assignment */}
      {assigningUser && (
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
          onClick={() => setAssigningUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...card,
              width: "100%",
              maxWidth: 620,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              padding: 22,
              boxShadow: colors.shadow,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>
                  Assign Projects: {assigningUser.name}
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  Check the project phases this team member is authorized to view and update.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningUser(null)}
                style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search filter for projects */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  flex: 1,
                }}
              >
                <Search size={14} color={colors.muted} />
                <input
                  placeholder="Filter projects or phases…"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: colors.text,
                    fontSize: 12.5,
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* Scrollable list of phases */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {projects
                .filter((p) => {
                  const q = assignSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    p.projectName?.toLowerCase().includes(q) ||
                    p.phase?.toLowerCase().includes(q) ||
                    p.orderId?.toLowerCase().includes(q)
                  );
                })
                .map((p) => {
                  const isAssigned = (assigningUser.assignedProjectIds || [])
                    .map(String)
                    .includes(String(p.id));

                  return (
                    <label
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: isAssigned ? `${colors.accent}14` : colors.panel2,
                        border: `1px solid ${isAssigned ? colors.accent : colors.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleProjectAssignment(assigningUser.id, p.id)}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.projectName}</div>
                        <div style={{ fontSize: 11.5, color: colors.muted }}>
                          {p.phase || "Phase"} · {p.orderId || "Order"} · {p.stack || "Stack"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isAssigned ? colors.delivered : colors.muted,
                        }}
                      >
                        {isAssigned ? "Assigned" : "Not Assigned"}
                      </span>
                    </label>
                  );
                })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setAssigningUser(null)}
                style={{
                  background: colors.accent,
                  color: colors.onAccent,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
