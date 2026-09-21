import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  Check,
  X,
  FolderKanban,
  GitBranch,
  Sparkles,
} from "lucide-react";
import PhaseDeliveryModal from "./PhaseDeliveryModal";
import DeliveryMessageButton from "./DeliveryMessageButton";
import { useTheme } from "../lib/theme";
import { listTeamDirectory } from "../lib/auth";
import {
  fmtMoney,
  statusOf,
  getProjectStack,
  formatProjectDateline,
  projectDatelineTitle,
  hasAdminSchedule,
  isDatelineOverdue,
} from "../lib/utils";
import StatusBadge from "./StatusBadge";
import {
  PROJECT_ROLES,
  createNote,
  memberRoleLabel,
  mergeMemberRoles,
  normalizeMemberRoles,
  normalizeNotes,
  normalizeTeamMember,
  replaceMemberRoles,
  supervisorNameFromTeam,
} from "../lib/projectMetadata";
import RoleMultiSelect from "./RoleMultiSelect";
import { roleLabel, canViewFinancials } from "../lib/roles";
import { GitHubIcon, GitLabIcon, GitRepoBadges } from "./GitIcons";

const ROLES = PROJECT_ROLES;

function projectNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

export default function ClientProjectDetail({
  clientProject,
  phases = [],
  isAdmin = true,
  currentUser = null,
  includeStaff = false,
  onBack,
  onUpdate,
  onUpdatePhase,
  onOpenPhase,
}) {
  const { colors, card, isDark } = useTheme();
  const canSeePrice = canViewFinancials(currentUser);
  const [deliveryModalPhase, setDeliveryModalPhase] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newMemberRoles, setNewMemberRoles] = useState([ROLES[0]]);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingRoles, setEditingRoles] = useState([]);
  const [teamError, setTeamError] = useState("");
  const [notes, setNotes] = useState(() => normalizeNotes(clientProject.notes));
  const [noteDraft, setNoteDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Global repository URLs for the parent project
  const [githubUrl, setGithubUrl] = useState(clientProject.githubUrl || "");
  const [gitlabUrl, setGitlabUrl] = useState(clientProject.gitlabUrl || "");

  useEffect(() => {
    setNotes(normalizeNotes(clientProject.notes));
    setNoteDraft("");
    setGithubUrl(clientProject.githubUrl || "");
    setGitlabUrl(clientProject.gitlabUrl || "");
  }, [clientProject.id, clientProject.notes, clientProject.githubUrl, clientProject.gitlabUrl]);

  useEffect(() => {
    let cancelled = false;
    listTeamDirectory({ includeStaff })
      .then((users) => {
        if (!cancelled) setDirectory(users);
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [includeStaff]);

  const team = Array.isArray(clientProject.teamMembers) ? clientProject.teamMembers : [];
  const availableUsers = directory;

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

  function persistTeam(nextTeam) {
    const supervisor = supervisorNameFromTeam(nextTeam);
    persist({
      teamMembers: nextTeam,
      ...(supervisor ? { supervisor } : supervisorNameFromTeam(team) ? { supervisor: "" } : {}),
    });
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
    if (!newMemberRoles.length) {
      setTeamError("Select at least one role.");
      return;
    }
    const existingIndex = team.findIndex(
      (m) =>
        String(m.userId || m.id) === String(user.id) ||
        String(m.name || "").trim().toLowerCase() === String(user.name || "").trim().toLowerCase()
    );
    const newMember = normalizeTeamMember({
      id: user.id,
      userId: user.id,
      name: user.name,
      roles: newMemberRoles,
    });
    const nextTeam =
      existingIndex >= 0
        ? team.map((member, index) => (index === existingIndex ? mergeMemberRoles(member, newMemberRoles) : member))
        : [...team, newMember];
    persistTeam(nextTeam);
    setSelectedUserId("");
    setEditingMemberId(null);
    setSaveStatus("Team updated");
  }

  function handleStartEditMember(member) {
    if (!isAdmin) return;
    setTeamError("");
    setEditingMemberId(member.id);
    setEditingRoles(normalizeMemberRoles(member));
  }

  function handleSaveMemberRoles(memberId) {
    if (!isAdmin) return;
    if (!editingRoles.length) {
      setTeamError("Select at least one role.");
      return;
    }
    persistTeam(team.map((m) => (m.id === memberId ? replaceMemberRoles(m, editingRoles) : m)));
    setEditingMemberId(null);
    setEditingRoles([]);
    setTeamError("");
    setSaveStatus("Team updated");
  }

  function handleRemoveMember(memberId) {
    if (!isAdmin) return;
    persistTeam(team.filter((m) => m.id !== memberId));
    if (editingMemberId === memberId) {
      setEditingMemberId(null);
      setEditingRoles([]);
    }
    setSaveStatus("Team updated");
  }

  function handleAddNote() {
    const note = createNote(noteDraft);
    if (!note.text) return;
    const nextNotes = [...notes, note];
    setNotes(nextNotes);
    setNoteDraft("");
    persist({ notes: nextNotes });
    setSaveStatus("Notes saved");
  }

  function handleDeleteNote(noteId) {
    const nextNotes = notes.filter((note) => note.id !== noteId);
    setNotes(nextNotes);
    persist({ notes: nextNotes });
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
    <div style={{ padding: "20px 16px 48px", maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              color: colors.muted,
              cursor: "pointer",
              fontWeight: 650,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Projects
          </button>
          <span style={{ color: colors.muted }}>/</span>
          <span style={{ fontWeight: 750, color: colors.text }}>{clientProject.projectName}</span>
        </div>

        {saveStatus ? (
          <span style={{ fontSize: 12, color: colors.delivered, fontWeight: 700 }}>{saveStatus}</span>
        ) : null}
      </div>

      {/* Parent Project Overview Card */}
      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Client Project Overview
            </div>
            <h1 className="disp" style={{ margin: "0 0 10px", fontSize: 26, fontWeight: 800 }}>
              {clientProject.projectName}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, fontWeight: 650 }}>
              <span style={{ color: colors.muted }}>{phaseRows.length} phases</span>
              <span style={{ color: colors.delivered }}>{delivered} delivered</span>
              <span style={{ color: colors.wip }}>{wip} WIP</span>
              <span style={{ color: colors.text }}>Total Value: <strong>{canSeePrice ? fmtMoney(value) : "—"}</strong></span>
            </div>
          </div>

          {/* Project-Level Repository Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.muted }}>Project Repositories</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isAdmin ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <GitHubIcon size={16} />
                    <input
                      placeholder="GitHub URL…"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      onBlur={() => {
                        if (githubUrl !== (clientProject.githubUrl || "")) {
                          persist({ githubUrl });
                          setSaveStatus("GitHub link saved");
                        }
                      }}
                      style={{ ...field, padding: "5px 8px", fontSize: 12, flex: 1 }}
                    />
                  </div>
                  {githubUrl ? (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: colors.text, display: "grid", placeItems: "center", padding: 4 }}
                      title="Open GitHub"
                    >
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </>
              ) : clientProject.githubUrl ? (
                <a
                  href={clientProject.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: colors.panel2,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <GitHubIcon size={14} /> Open GitHub <ExternalLink size={11} />
                </a>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isAdmin ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <GitLabIcon size={16} />
                    <input
                      placeholder="GitLab URL…"
                      value={gitlabUrl}
                      onChange={(e) => setGitlabUrl(e.target.value)}
                      onBlur={() => {
                        if (gitlabUrl !== (clientProject.gitlabUrl || "")) {
                          persist({ gitlabUrl });
                          setSaveStatus("GitLab link saved");
                        }
                      }}
                      style={{ ...field, padding: "5px 8px", fontSize: 12, flex: 1 }}
                    />
                  </div>
                  {gitlabUrl ? (
                    <a
                      href={gitlabUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: colors.text, display: "grid", placeItems: "center", padding: 4 }}
                      title="Open GitLab"
                    >
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </>
              ) : clientProject.gitlabUrl ? (
                <a
                  href={clientProject.gitlabUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "rgba(252, 109, 38, 0.1)",
                    border: "1px solid rgba(252, 109, 38, 0.3)",
                    color: colors.text,
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <GitLabIcon size={14} /> Open GitLab <ExternalLink size={11} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Team & Notes on left, Phases on right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 14 }} className="client-project-grid">
        <style>{`
          @media (max-width: 900px) {
            .client-project-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Team & Notes Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Team Box */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Users size={17} style={{ color: colors.accentSoft }} />
              <h3 className="disp" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>
                Project Team
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {team.map((m) => {
                const editing = editingMemberId === m.id;
                const directoryUser = directory.find(
                  (u) =>
                    String(u.id) === String(m.userId || m.id) ||
                    u.name.toLowerCase() === m.name.toLowerCase()
                );

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      background: colors.panel2,
                      border: `1px solid ${editing ? colors.accent : colors.border}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name}</span>
                          {/* Clickable Git Handles */}
                          {directoryUser?.githubUsername ? (
                            <a
                              href={`https://github.com/${directoryUser.githubUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`GitHub: @${directoryUser.githubUsername}`}
                              style={{ color: colors.muted, display: "grid", placeItems: "center" }}
                            >
                              <GitHubIcon size={13} />
                            </a>
                          ) : null}
                          {directoryUser?.gitlabUsername ? (
                            <a
                              href={`https://gitlab.com/${directoryUser.gitlabUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`GitLab: @${directoryUser.gitlabUsername}`}
                              style={{ color: colors.muted, display: "grid", placeItems: "center" }}
                            >
                              <GitLabIcon size={13} />
                            </a>
                          ) : null}
                        </div>
                        {!editing ? (
                          <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                            {memberRoleLabel(m)}
                          </div>
                        ) : null}
                      </div>

                      {isAdmin ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                          {editing ? (
                            <>
                              <button
                                type="button"
                                title="Save roles"
                                onClick={() => handleSaveMemberRoles(m.id)}
                                style={{ background: "none", border: "none", color: colors.delivered, padding: 4 }}
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                title="Cancel"
                                onClick={() => {
                                  setEditingMemberId(null);
                                  setEditingRoles([]);
                                  setTeamError("");
                                }}
                                style={{ background: "none", border: "none", color: colors.muted, padding: 4 }}
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              title="Edit roles"
                              onClick={() => handleStartEditMember(m)}
                              style={{ background: "none", border: "none", color: colors.muted, padding: 4 }}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Remove member"
                            onClick={() => handleRemoveMember(m.id)}
                            style={{ background: "none", border: "none", color: colors.muted, padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {editing ? (
                      <RoleMultiSelect roles={ROLES} value={editingRoles} onChange={setEditingRoles} />
                    ) : null}
                  </div>
                );
              })}
              {team.length === 0 ? (
                <div style={{ textAlign: "center", padding: 14, color: colors.muted, fontSize: 13 }}>
                  No team members assigned yet.
                </div>
              ) : null}
            </div>

            {isAdmin ? (
              <form
                onSubmit={handleAddMember}
                style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}
              >
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={field}>
                  <option value="">{availableUsers.length ? "Select user…" : "All users assigned"}</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({roleLabel(u.role)})
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <RoleMultiSelect roles={ROLES} value={newMemberRoles} onChange={setNewMemberRoles} />
                  <button
                    type="submit"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: colors.accent,
                      color: colors.onAccent,
                      border: "none",
                      borderRadius: 8,
                      padding: "0 14px",
                      height: 38,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>
                {teamError ? <div style={{ fontSize: 12, color: colors.late }}>{teamError}</div> : null}
              </form>
            ) : null}
          </div>

          {/* Notes Box */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 750, color: colors.text, marginBottom: 8 }}>
              Project Notes & Logs
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "start",
                    background: colors.panel2,
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{note.text}</span>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      style={{ border: 0, background: "none", color: colors.muted, padding: 0, cursor: "pointer" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              ))}
              {notes.length === 0 ? (
                <div style={{ color: colors.muted, fontSize: 12 }}>No notes yet.</div>
              ) : null}
            </div>

            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              placeholder="Add a project note or update…"
              style={{ ...field, width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
            <button
              type="button"
              onClick={handleAddNote}
              style={{
                marginTop: 8,
                background: colors.accent,
                color: colors.onAccent,
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Phases List Column */}
        <div style={{ ...card, padding: 18, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 750 }}>
              Project Phases ({phaseRows.length})
            </h3>
          </div>

          {phaseRows.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: 13 }}>No phase rows recorded for this project name.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: colors.muted, background: colors.panel2 }}>
                    {["Phase", "Dept", "Repos", "Dateline", "Price", "Status"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                    <th style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {phaseRows.map((p) => {
                    const overdue = isDatelineOverdue(p);
                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: "10px 10px", fontWeight: 700 }}>
                          <a
                            href={`#/project/${p.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              if (typeof onOpenPhase === "function") {
                                onOpenPhase(p.id);
                              } else {
                                window.location.hash = `#/project/${p.id}`;
                              }
                            }}
                            style={{
                              color: isDark ? "#A7F3D0" : colors.primary || "#059669",
                              textDecoration: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontWeight: 750,
                              fontSize: 13,
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = "underline";
                              e.currentTarget.style.color = isDark ? "#34D399" : "#10B981";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = "none";
                              e.currentTarget.style.color = isDark ? "#A7F3D0" : colors.primary || "#059669";
                            }}
                            title={`Open phase details for ${p.phase || "Main Phase"}`}
                          >
                            <span>{p.phase || "Main Phase"}</span>
                            <ExternalLink size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
                          </a>
                          <div
                            className="mono"
                            style={{
                              fontSize: 11,
                              color: colors.muted,
                              marginTop: 2,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              if (typeof onOpenPhase === "function") onOpenPhase(p.id);
                              else window.location.hash = `#/project/${p.id}`;
                            }}
                            title="Open phase details"
                          >
                            {p.orderId || "No Order ID"}
                          </div>
                        </td>
                        <td style={{ padding: "10px 10px", color: colors.muted }}>{getProjectStack(p)}</td>
                        <td style={{ padding: "10px 10px" }}>
                          <GitRepoBadges githubUrl={p.githubUrl} gitlabUrl={p.gitlabUrl} compact />
                        </td>
                        <td
                          style={{
                            padding: "10px 10px",
                            color: overdue ? colors.late : colors.text,
                            fontWeight: overdue ? 700 : 500,
                          }}
                          title={projectDatelineTitle(p)}
                        >
                          {formatProjectDateline(p)}
                        </td>
                        <td className="mono" style={{ padding: "10px 10px", fontWeight: 700 }}>
                          {canSeePrice ? fmtMoney(p.price) : "—"}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          <StatusBadge status={statusOf(p)} compact />
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <DeliveryMessageButton
                            onClick={() => setDeliveryModalPhase(p)}
                            phase={p}
                            size="sm"
                            label="Delivery"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {deliveryModalPhase && (
        <PhaseDeliveryModal
          phase={deliveryModalPhase}
          currentUser={currentUser}
          onClose={() => setDeliveryModalPhase(null)}
          onUpdatePhase={(updated) => {
            setDeliveryModalPhase(updated);
            if (typeof onUpdatePhase === "function") {
              onUpdatePhase(updated);
            }
          }}
        />
      )}
    </div>
  );
}
