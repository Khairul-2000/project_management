import { useState } from "react";
import { Shield } from "lucide-react";
import { useTheme } from "../lib/theme";
import { patchUser } from "../lib/auth";
import { roleLabel, roleBadgeColor } from "../lib/roles";

export default function UserProfile({ currentUser, onUpdateUser }) {
  const { colors, card } = useTheme();
  const roleColor = roleBadgeColor(currentUser?.role, colors);
  const [githubUsername, setGithubUsername] = useState(currentUser?.githubUsername || "");
  const [gitlabUsername, setGitlabUsername] = useState(currentUser?.gitlabUsername || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");

    const payload = {};
    if (githubUsername !== currentUser?.githubUsername) payload.githubUsername = githubUsername;
    if (gitlabUsername !== currentUser?.gitlabUsername) payload.gitlabUsername = gitlabUsername;
    if (password) payload.password = password;

    if (Object.keys(payload).length === 0) {
      setSaving(false);
      setStatus("No changes made.");
      return;
    }

    try {
      const updatedUser = await patchUser(currentUser.id, payload);
      setStatus("Profile updated successfully!");
      if (password) setPassword("");
      if (onUpdateUser) onUpdateUser(updatedUser);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
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
    marginBottom: 12,
  };

  return (
    <div style={{ padding: "20px 16px 48px", maxWidth: 600, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <h1 className="disp" style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>
          My Profile
        </h1>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 20 }}>
          Update your personal details, GitHub/GitLab usernames, and password.
        </div>

        <form onSubmit={handleSave}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Role & Permissions</label>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 8,
              background: `${roleColor}18`,
              border: `1px solid ${roleColor}44`,
              color: roleColor,
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <Shield size={15} />
            <span>{roleLabel(currentUser?.role)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 16 }}>
            {currentUser?.role === "super_admin"
              ? "Super Admin has full unrestricted access across projects, financial data, and system settings."
              : currentUser?.role === "admin"
                ? "Admin / Team Lead can manage projects, assign members, and view financial data."
                : "Team Member can update task checklists, commit links, and progress on assigned projects."}
          </div>

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Name</label>
          <input value={currentUser?.name || ""} disabled style={{ ...field, opacity: 0.7 }} />

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Username</label>
          <input value={currentUser?.username || ""} disabled style={{ ...field, opacity: 0.7 }} />

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>GitHub Username</label>
          <input
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="e.g. johndoe"
            style={field}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>GitLab Username</label>
          <input
            value={gitlabUsername}
            onChange={(e) => setGitlabUsername(e.target.value)}
            placeholder="e.g. johndoe"
            style={field}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Change Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            style={field}
          />

          {status && <div style={{ color: colors.delivered, fontSize: 13, fontWeight: 650, marginBottom: 12 }}>{status}</div>}
          {error && <div style={{ color: colors.late, fontSize: 13, fontWeight: 650, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={saving}
            style={{
              background: colors.accent,
              color: colors.onAccent,
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
