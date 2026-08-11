import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { useTheme } from "../lib/theme";
import { createUser, listUsers, patchUser, syncAssignmentsFromProjects } from "../lib/auth";

export default function UsersAdmin({ projects, onBack }) {
  const { colors, card } = useTheme();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "member" });
  const [assignUserId, setAssignUserId] = useState(null);
  const [assignQuery, setAssignQuery] = useState("");
  const [assignSelected, setAssignSelected] = useState([]);
  const [resetPassword, setResetPassword] = useState({});
  const [syncingAssignments, setSyncingAssignments] = useState(false);

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

  const assignUser = useMemo(
    () => users.find((u) => u.id === assignUserId) || null,
    [users, assignUserId]
  );

  const filteredProjects = useMemo(() => {
    const q = assignQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (!q) return true;
      return [p.projectName, p.orderId, p.phase, p.profile, p.sheetTab]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [projects, assignQuery]);

  function openAssign(user) {
    setAssignUserId(user.id);
    setAssignSelected([...(user.assignedProjectIds || [])]);
    setAssignQuery("");
  }

  async function saveAssign() {
    if (!assignUserId) return;
    setStatus("Saving assignments…");
    try {
      const updated = await patchUser(assignUserId, { assignedProjectIds: assignSelected });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setStatus(`Saved ${assignSelected.length} project(s) for ${updated.name}`);
      setAssignUserId(null);
    } catch (err) {
      setError(err.message || "Save failed");
      setStatus("");
    }
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
      if (assignUserId === user.id && updated.role === "admin") {
        setAssignUserId(null);
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

  function toggleProject(id) {
    setAssignSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          color: colors.text,
          padding: "8px 12px",
          fontWeight: 650,
          marginBottom: 16,
          boxShadow: colors.shadowSoft,
        }}
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <h1 className="disp" style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>
          User management
        </h1>
        <div style={{ color: colors.muted, fontSize: 13 }}>
          Create accounts, change roles (member ↔ admin), and assign which projects each member can see.
          Project team names (supervisor / team members) can also auto-link via{" "}
          <strong>Sync from projects</strong>.
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
            <option value="admin">Admin</option>
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
                users.map((u) => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 650 }}>{u.name}</td>
                    <td className="mono" style={{ padding: "10px 12px" }}>{u.username}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        aria-label={`Role for ${u.username}`}
                        style={{ ...field, width: "auto", minWidth: 110, padding: "7px 8px" }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 12px", color: u.active ? colors.delivered : colors.late }}>
                      {u.active ? "Yes" : "No"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {u.role === "admin" ? "All" : u.assignedProjectIds?.length || 0}
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
                          onClick={() => openAssign(u)}
                          style={{
                            background: colors.accentSoft,
                            border: "none",
                            borderRadius: 8,
                            color: colors.accent,
                            padding: "7px 10px",
                            fontWeight: 700,
                            fontSize: 12,
                            marginRight: 6,
                          }}
                        >
                          Assign
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
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {assignUser && (
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
          onClick={() => setAssignUserId(null)}
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
            <div className="disp" style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
              Assign projects · {assignUser.name}
            </div>
            <div style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
              Selected: {assignSelected.length}
            </div>
            <input
              value={assignQuery}
              onChange={(e) => setAssignQuery(e.target.value)}
              placeholder="Search projects…"
              style={{ ...field, marginBottom: 12 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflow: "auto" }}>
              {filteredProjects.map((p) => {
                const checked = assignSelected.includes(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: checked ? colors.panel2 : colors.panel,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProject(p.id)}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <div style={{ fontWeight: 700 }}>{p.projectName}</div>
                      <div style={{ fontSize: 12, color: colors.muted }}>
                        {[p.orderId, p.phase, p.sheetTab].filter(Boolean).join(" · ")}
                      </div>
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setAssignUserId(null)}
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  color: colors.text,
                  padding: "10px 14px",
                  fontWeight: 650,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAssign}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: colors.accent,
                  border: "none",
                  borderRadius: 10,
                  color: colors.onAccent,
                  padding: "10px 14px",
                  fontWeight: 750,
                }}
              >
                <Save size={15} /> Save assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
