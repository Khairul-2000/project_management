import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Users, Plus, Trash2, ExternalLink } from "lucide-react";
import { useTheme } from "../lib/theme";
import { listTeamDirectory } from "../lib/auth";
import { fmtMoney, statusOf, getProjectStack } from "../lib/utils";
import StatusBadge from "./StatusBadge";

const ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "App Developer",
  "AI Engineer",
  "UI/UX Designer",
  "DevOps Engineer",
  "QA Engineer",
  "Project Lead",
  "Supervisor",
];

function projectNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

export default function ClientProjectDetail({
  clientProject,
  phases,
  isAdmin,
  onBack,
  onUpdate,
  onOpenPhase,
}) {
  const { colors, card, isDark } = useTheme();
  const [directory, setDirectory] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState(ROLES[0]);
  const [teamError, setTeamError] = useState("");
  const [notesText, setNotesText] = useState(clientProject.notes || "");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    setNotesText(clientProject.notes || "");
  }, [clientProject.id, clientProject.notes]);

  useEffect(() => {
    let cancelled = false;
    listTeamDirectory()
      .then((users) => {
        if (!cancelled) setDirectory(users);
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const team = Array.isArray(clientProject.teamMembers) ? clientProject.teamMembers : [];
  const assignedUserIds = useMemo(
    () => new Set(team.map((m) => String(m.userId || m.id)).filter(Boolean)),
    [team]
  );
  const assignedNames = useMemo(
    () => new Set(team.map((m) => String(m.name || "").trim().toLowerCase()).filter(Boolean)),
    [team]
  );
  const availableUsers = useMemo(
    () =>
      directory.filter((u) => {
        if (assignedUserIds.has(String(u.id))) return false;
        if (assignedNames.has(String(u.name || "").trim().toLowerCase())) return false;
        return true;
      }),
    [directory, assignedUserIds, assignedNames]
  );

  const phaseRows = useMemo(() => {
    const key = clientProject.projectNameKey || projectNameKey(clientProject.projectName);
    return (phases || [])
      .filter((p) => projectNameKey(p.projectName) === key)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [phases, clientProject]);

  const delivered = phaseRows.filter((p) => statusOf(p) === "delivered").length;
  const wip = phaseRows.filter((p) => statusOf(p) === "wip").length;
  const value = phaseRows.reduce((s, p) => s + Number(p.price || 0), 0);

  function persist(patch) {
    onUpdate({ ...clientProject, ...patch });
  }

  function handleAddMember(e) {
    e.preventDefault();
    if (!isAdmin) return;
    setTeamError("");
    const user = directory.find((u) => String(u.id) === String(selectedUserId));
    if (!user) {
      setTeamError("Select a team member from the list.");
      return;
    }
    const newMember = {
      id: user.id,
      userId: user.id,
      name: user.name,
      role: newMemberRole,
    };
    persist({ teamMembers: [...team, newMember] });
    setSelectedUserId("");
    setSaveStatus("Team updated");
  }

  function handleRemoveMember(memberId) {
    if (!isAdmin) return;
    persist({ teamMembers: team.filter((m) => m.id !== memberId) });
    setSaveStatus("Team updated");
  }

  function handleSaveNotes() {
    if (!isAdmin) return;
    persist({ notes: notesText });
    setSaveStatus("Notes saved");
  }

  const field = {
    background: colors.panel2,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: colors.text,
    fontSize: 13,
  };

  return (
    <div style={{ padding: "20px 16px 48px", maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          type="button"
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
            boxShadow: colors.shadowSoft,
          }}
        >
          <ArrowLeft size={15} /> Back to projects
        </button>
        {saveStatus ? (
          <span style={{ fontSize: 12, color: colors.delivered, fontWeight: 650 }}>{saveStatus}</span>
        ) : null}
      </div>

      <div style={{ ...card, padding: "20px 22px", marginBottom: 14 }}>
        <h1 className="disp" style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>
          {clientProject.projectName}
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, fontWeight: 650 }}>
          <span style={{ color: colors.muted }}>{phaseRows.length} phases</span>
          <span style={{ color: colors.delivered }}>{delivered} delivered</span>
          <span style={{ color: colors.wip }}>{wip} WIP</span>
          <span style={{ color: colors.text }}>{fmtMoney(value)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }} className="client-project-grid">
        <style>{`
          @media (max-width: 900px) {
            .client-project-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Users size={17} style={{ color: colors.accentSoft }} />
            <h3 className="disp" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>
              Project team
            </h3>
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
            Members are linked to phases by role (e.g. Backend → Backend phases, UI/UX → UI/UX).
            Existing phase assignments are kept; missing matches are added on save/sync.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {team.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: colors.muted }}>{m.role}</div>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.id)}
                    style={{ background: "none", border: "none", color: colors.muted, padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            ))}
            {team.length === 0 ? (
              <div style={{ textAlign: "center", padding: 14, color: colors.muted, fontSize: 13 }}>
                No team members assigned yet.
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={field}>
                <option value="">{availableUsers.length ? "Select user…" : "All users already assigned"}</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} style={{ ...field, flex: 1 }}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
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
              </div>
              {teamError ? <div style={{ fontSize: 12, color: colors.late }}>{teamError}</div> : null}
            </form>
          ) : null}

          <div style={{ marginTop: 16, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 650, color: colors.muted, marginBottom: 6 }}>Notes</div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              disabled={!isAdmin}
              rows={4}
              style={{ ...field, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
            />
            {isAdmin ? (
              <button
                type="button"
                onClick={handleSaveNotes}
                style={{
                  marginTop: 8,
                  background: isDark ? colors.accentSoft : colors.accent,
                  color: colors.onAccent,
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              >
                Save notes
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ ...card, padding: 18, overflow: "hidden" }}>
          <h3 className="disp" style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 750 }}>
            Phases
          </h3>
          {phaseRows.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: 13 }}>No phase rows for this project name yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: colors.muted }}>
                    {["Phase", "Dept", "Order", "Dateline", "Status", ""].map((h) => (
                      <th key={h} style={{ padding: "8px 8px", fontSize: 11, fontWeight: 700 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phaseRows.map((p) => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "10px 8px", fontWeight: 650 }}>{p.phase || "—"}</td>
                      <td style={{ padding: "10px 8px", color: colors.muted }}>{getProjectStack(p)}</td>
                      <td className="mono" style={{ padding: "10px 8px" }}>{p.orderId || "—"}</td>
                      <td style={{ padding: "10px 8px", color: colors.muted }}>{p.dateline || "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <StatusBadge status={statusOf(p)} compact />
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => onOpenPhase(p.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: colors.panel2,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            color: colors.text,
                            padding: "5px 8px",
                            fontWeight: 650,
                            fontSize: 11.5,
                          }}
                        >
                          Open <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
