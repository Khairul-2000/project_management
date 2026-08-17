import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Calendar, User, DollarSign, Tag, CheckSquare, 
  Trash2, Plus, Clock, Clock3, FileText, CheckCircle2, AlertTriangle, Users, ExternalLink
} from "lucide-react";
import { STACK_COLOR, PROFILE_SHORT, STACKS } from "../lib/constants";
import { useTheme } from "../lib/theme";
import { listTeamDirectory } from "../lib/auth";
import {
  statusOf,
  fmtMoney,
  parseProjectDate,
  parseDatelineDays,
  getSheetRemainingDays,
  getSuggestedDeliveryDate,
  getOriginalDeliveryDate,
  getCurrentDeliveryDate,
  getTotalExtensionDays,
  getDaysLeft,
  getProjectExtensions,
  hasAdminSchedule,
  formatDisplayDate,
  formatDaysLeft,
  toInputDate,
  diffCalendarDays,
  getDeveloperRole,
  getProjectStack,
  deriveStack,
} from "../lib/utils";
import { PROJECT_ROLES, createNote, memberRoleLabel, mergeMemberRoles, normalizeNotes, normalizeTeamMember } from "../lib/projectMetadata";
import RoleMultiSelect from "./RoleMultiSelect";

function getInitials(name) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarBg(name) {
  const colors = [
    "linear-gradient(135deg, #4F7CFF, #2F5CE0)",
    "linear-gradient(135deg, #F08A56, #E06A30)",
    "linear-gradient(135deg, #9B6FE0, #7A4CC0)",
    "linear-gradient(135deg, #2BB8BE, #1A9499)",
    "linear-gradient(135deg, #C9B03A, #A89220)",
    "linear-gradient(135deg, #E24B4A, #C03838)"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function defaultRoleForProject(project) {
  const role = getDeveloperRole(getProjectStack(project));
  return PROJECT_ROLES.includes(role) ? [role] : [PROJECT_ROLES[0]];
}

const ROLES = PROJECT_ROLES;

export default function ProjectDetails({ project, onBack, onUpdate, onDelete, isAdmin = false, backLabel = "Back to Projects" }) {
  const { colors, isDark } = useTheme();
  const COLORS = colors;
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newMemberRoles, setNewMemberRoles] = useState(() => defaultRoleForProject(project));
  const [directory, setDirectory] = useState([]);
  const [teamError, setTeamError] = useState("");
  const [notes, setNotes] = useState(() => normalizeNotes(project.notes));
  const [noteDraft, setNoteDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [deliveryInput, setDeliveryInput] = useState("");
  const [extendInput, setExtendInput] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [phaseDraft, setPhaseDraft] = useState(project.phase || "");

  // Sync notes / schedule inputs when project changes
  useEffect(() => {
    setNotes(normalizeNotes(project.notes));
    setNoteDraft("");
    setSaveStatus("");
    setScheduleError("");
    setNewMemberRoles(defaultRoleForProject(project));
    setPhaseDraft(project.phase || "");
    const suggested = getSuggestedDeliveryDate(project);
    const original = getOriginalDeliveryDate(project);
    setDeliveryInput(toInputDate(original || suggested || ""));
    setExtendInput("");
  }, [project.id, project.notes, project.deliveryDate, project.date, project.dateline, project.extensions, project.phase, project.stack]);

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

  const defaultSubtasks = useMemo(() => [
    { id: "1", text: "Requirements gathering & analysis", completed: false },
    { id: "2", text: "UI/UX Mockup design", completed: false },
    { id: "3", text: "Core API development", completed: false },
    { id: "4", text: "Frontend integration & testing", completed: false },
    { id: "5", text: "Client review & revisions", completed: false },
    { id: "6", text: "Final deployment & delivery", completed: false },
  ], []);

  const subtasks = project.subtasks || defaultSubtasks;
  const completedCount = subtasks.filter(t => t.completed).length;
  const totalCount = subtasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const team = Array.isArray(project.teamMembers) ? project.teamMembers : [];
  const currentStack = getProjectStack(project);
  const stackColor = STACK_COLOR[currentStack] || STACK_COLOR.Other;

  const assignedUserIds = useMemo(() => {
    const ids = new Set();
    for (const m of team) {
      if (m?.userId) ids.add(String(m.userId));
      else if (m?.id && String(m.id).startsWith("u-")) ids.add(String(m.id));
    }
    return ids;
  }, [team]);

  const assignedNames = useMemo(() => {
    return new Set(
      team
        .map((m) => String(m?.name || "").trim().toLowerCase())
        .filter(Boolean)
    );
  }, [team]);

  const availableUsers = directory;

  const handleToggleSubtask = (subtaskId) => {
    const updatedSubtasks = subtasks.map(t =>
      t.id === subtaskId ? { ...t, completed: !t.completed } : t
    );
    onUpdate({
      ...project,
      subtasks: updatedSubtasks
    });
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false
    };
    onUpdate({
      ...project,
      subtasks: [...subtasks, newTask]
    });
    setNewSubtaskText("");
  };

  const handleDeleteSubtask = (subtaskId) => {
    const updatedSubtasks = subtasks.filter(t => t.id !== subtaskId);
    onUpdate({
      ...project,
      subtasks: updatedSubtasks
    });
  };

  const handleAddMember = (e) => {
    e.preventDefault();
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
    const existingIndex = team.findIndex((member) => String(member.userId || member.id) === String(user.id) || String(member.name || "").trim().toLowerCase() === String(user.name || "").trim().toLowerCase());
    const newMember = normalizeTeamMember({
      id: user.id,
      userId: user.id,
      name: user.name,
      roles: newMemberRoles,
    });
    onUpdate({
      ...project,
      teamMembers: existingIndex >= 0 ? team.map((member, index) => index === existingIndex ? mergeMemberRoles(member, newMemberRoles) : member) : [...team, newMember],
    });
    setSelectedUserId("");
  };

  const handleRemoveMember = (memberId) => {
    const updatedTeam = team.filter((m) => m.id !== memberId);
    onUpdate({
      ...project,
      teamMembers: updatedTeam,
    });
  };

  const handleAddNote = () => {
    const note = createNote(noteDraft);
    if (!note.text) return;
    const nextNotes = [...notes, note];
    setNotes(nextNotes);
    setNoteDraft("");
    onUpdate({
      ...project,
      notes: nextNotes
    });
    setSaveStatus("Saved!");
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleDeleteNote = (noteId) => {
    const nextNotes = notes.filter((note) => note.id !== noteId);
    setNotes(nextNotes);
    onUpdate({ ...project, notes: nextNotes });
  };

  const handleStatusChange = (field, val) => {
    onUpdate({
      ...project,
      [field]: val
    });
  };

  const startDate = parseProjectDate(project.date);
  const sheetRemaining = getSheetRemainingDays(project.dateline);
  const datelineDays = parseDatelineDays(project.dateline);
  const suggestedDelivery = getSuggestedDeliveryDate(project);
  const originalDelivery = getOriginalDeliveryDate(project);
  const currentDelivery = getCurrentDeliveryDate(project);
  const totalExtDays = getTotalExtensionDays(project);
  const daysLeft = getDaysLeft(project);
  const extensions = getProjectExtensions(project);
  const adminSchedule = hasAdminSchedule(project);
  const hasDelivery = Boolean(currentDelivery) || sheetRemaining === -1;

  const timelineStops = useMemo(() => {
    const stops = [];
    if (startDate) {
      stops.push({ key: "start", label: formatDisplayDate(startDate), sub: "Project start", kind: "start" });
    }

    if (adminSchedule && originalDelivery) {
      stops.push({
        key: "delivery",
        label: formatDisplayDate(originalDelivery),
        sub: "Delivery",
        kind: "delivery",
      });
      let prev = originalDelivery;
      extensions.forEach((ext, idx) => {
        const next = ext.date
          ? parseProjectDate(ext.date)
          : ext.days != null && prev
            ? (() => {
                const d = new Date(prev);
                d.setDate(d.getDate() + (Number(ext.days) || 0));
                return d;
              })()
            : null;
        if (!next) return;
        const gained = diffCalendarDays(prev, next);
        stops.push({
          key: `ext-${idx}`,
          label: formatDisplayDate(next),
          sub: `Extended${gained != null ? ` · +${gained}d` : ""}`,
          kind: "extension",
        });
        prev = next;
      });
      return stops;
    }

    // Sheet-only: show live countdown as current due (not Initial Date + days)
    if (currentDelivery && sheetRemaining != null && sheetRemaining >= 0) {
      stops.push({
        key: "delivery",
        label: formatDisplayDate(currentDelivery),
        sub: `Due · ${sheetRemaining}d on sheet`,
        kind: "delivery",
      });
    } else if (sheetRemaining === -1) {
      stops.push({
        key: "late",
        label: "Order Late",
        sub: "Sheet status — set a delivery date or extend",
        kind: "extension",
      });
    }
    return stops;
  }, [startDate, originalDelivery, currentDelivery, extensions, adminSchedule, sheetRemaining]);

  function handleSaveDeliveryDate(e) {
    e.preventDefault();
    setScheduleError("");
    const next = parseProjectDate(deliveryInput);
    if (!next) {
      setScheduleError("Pick a valid delivery date.");
      return;
    }
    onUpdate({
      ...project,
      deliveryDate: toInputDate(next),
    });
    setSaveStatus(`Delivery date set to ${formatDisplayDate(next)}`);
  }

  function handleTakeExtension(e) {
    e.preventDefault();
    setScheduleError("");
    const baseline = currentDelivery || suggestedDelivery;
    if (!baseline && sheetRemaining !== -1) {
      setScheduleError("Set a delivery date first.");
      return;
    }
    const next = parseProjectDate(extendInput);
    if (!next) {
      setScheduleError("Pick the new delivery date for this extension.");
      return;
    }
    const from = baseline || parseProjectDate(toInputDate(new Date()));
    const gained = from ? diffCalendarDays(from, next) : null;
    if (gained == null || gained < 1) {
      setScheduleError("New delivery date must be after the current delivery date.");
      return;
    }
    const lockedOriginal = project.deliveryDate || toInputDate(baseline || next);
    onUpdate({
      ...project,
      deliveryDate: lockedOriginal,
      extensions: [...extensions, { date: toInputDate(next), createdAt: new Date().toISOString() }],
    });
    setExtendInput("");
    setSaveStatus(`Extended to ${formatDisplayDate(next)} (+${gained}d)`);
  }

  const badge = (status) => {
    const map = {
      delivered: { c: COLORS.delivered, l: "Delivered", Icon: CheckCircle2 },
      wip: { c: COLORS.wip, l: "WIP", Icon: Clock3 },
      late: { c: COLORS.late, l: "Late", Icon: AlertTriangle },
    };
    const { c, l, Icon } = map[status] || map.wip;
    return (
      <span style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: 5, 
        color: c, 
        background: c + "1A", 
        border: `1px solid ${c}44`, 
        borderRadius: 999, 
        padding: "4px 10px", 
        fontSize: 12, 
        fontWeight: 600 
      }}>
        <Icon size={13} strokeWidth={2.5} /> {l}
      </span>
    );
  };

  return (
    <div style={{
      background: `linear-gradient(160deg, ${COLORS.bg} 0%, ${COLORS.bgAccent} 100%)`,
      color: COLORS.text,
      minHeight: "100%",
      fontFamily: "Manrope, sans-serif",
      padding: "20px 16px 48px",
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      
      {/* BREADCRUMB & BACK BUTTON */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 6, 
          background: COLORS.panel, 
          color: COLORS.text, 
          border: `1px solid ${COLORS.border}`, 
          borderRadius: 12, 
          padding: "8px 14px", 
          fontWeight: 600, 
          fontSize: 13,
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: COLORS.shadowSoft,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.panel2; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.panel; }}
        >
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <div style={{ color: COLORS.muted, fontSize: 13 }}>
          Console &nbsp;/&nbsp; {backLabel.includes("Dashboard") ? "Dashboard" : "Projects"} &nbsp;/&nbsp; <span style={{ color: COLORS.text, fontWeight: 500 }}>{project.projectName}</span>
        </div>
      </div>

      {/* HEADER BLOCK */}
      <div style={{ 
        background: COLORS.panel, 
        border: `1px solid ${COLORS.border}`, 
        borderRadius: 20, 
        padding: "24px 28px", 
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        boxShadow: COLORS.shadowSoft,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            {isAdmin ? (
              <select
                value={STACKS.includes(currentStack) ? currentStack : "Other"}
                onChange={(e) =>
                  onUpdate({
                    ...project,
                    stack: e.target.value,
                    stackLocked: true,
                  })
                }
                aria-label="Department"
                style={{
                  background: stackColor + "22",
                  color: stackColor,
                  border: `1px solid ${stackColor}55`,
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {STACKS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ 
                background: stackColor + "22", 
                color: stackColor, 
                border: `1px solid ${stackColor}33`, 
                borderRadius: 6, 
                padding: "2px 8px", 
                fontSize: 11, 
                fontWeight: 600,
                textTransform: "uppercase" 
              }}>
                {currentStack}
              </span>
            )}
            {badge(statusOf(project))}
            {isAdmin && project.stackLocked ? (
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    ...project,
                    stackLocked: false,
                    stack: deriveStack(project.phase),
                  })
                }
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  color: COLORS.muted,
                  fontSize: 11,
                  fontWeight: 650,
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
                title="Reset department from phase name"
              >
                Auto department
              </button>
            ) : null}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, fontFamily: "Manrope, sans-serif" }}>
            {project.projectName}
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "6px 0 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>
              ID: <span className="mono" style={{ color: COLORS.accent }}>{project.id}</span>
            </span>
            <span>·</span>
            {isAdmin ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Phase:
                <input
                  value={phaseDraft}
                  onChange={(e) => setPhaseDraft(e.target.value)}
                  onBlur={() => {
                    const phase = phaseDraft.trim();
                    if (phase === (project.phase || "")) return;
                    if (project.stackLocked) {
                      onUpdate({ ...project, phase });
                      return;
                    }
                    onUpdate({
                      ...project,
                      phase,
                      stack: deriveStack(phase),
                    });
                  }}
                  placeholder="e.g. Mobile App Frontend"
                  style={{
                    background: COLORS.panel2,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: COLORS.text,
                    fontSize: 13,
                    minWidth: 180,
                  }}
                />
              </span>
            ) : (
              <span>Phase: {project.phase || "—"}</span>
            )}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: COLORS.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Project Budget</div>
          <div className="disp" style={{ fontSize: 32, fontWeight: 700, color: COLORS.delivered, marginTop: 4 }}>
            {fmtMoney(project.price)}
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, alignItems: "start" }} className="grid-layout">
        <style>{`
          @media (max-width: 820px) {
            .grid-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        {/* LEFT COLUMN: PROJECT INFO & TEAM */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* INFO CARD */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", fontFamily: "Manrope, sans-serif" }}>Metadata & Details</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Sales Person", value: project.salesPerson, Icon: User },
                { label: "Team", value: project.teamName || "—", Icon: Users },
                { label: "Intake Date", value: project.date, Icon: Calendar },
                { label: "Fiverr Profile", value: PROFILE_SHORT[project.profile] || project.profile, Icon: Tag },
                { label: "Sheet Dateline", value: project.dateline || "—", Icon: Clock },
                { label: "Supervisor", value: project.supervisor || "—", Icon: User },
                { label: "Shift", value: project.shift || "—", Icon: Clock3 },
                { label: "Possibility", value: project.possibility === "Yes" ? "Yes" : "No", Icon: AlertTriangle },
              ].map(({ label, value, Icon }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: COLORS.panel2, borderRadius: 8, padding: 8, color: COLORS.muted }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: COLORS.muted }}>{label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{value}</div>
                  </div>
                </div>
              ))}
              {(project.orderUrl || project.orderId) && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: COLORS.panel2, borderRadius: 8, padding: 8, color: COLORS.muted }}>
                    <ExternalLink size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: COLORS.muted }}>Fiverr Order</div>
                    <a
                      href={project.orderUrl || `https://www.fiverr.com/orders/${project.orderId}/activities`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, color: COLORS.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {project.orderId || "Open order"} <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery schedule */}
          <section aria-label="Delivery schedule">
            <style>{`
              @keyframes scheduleFadeIn {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .schedule-row { animation: scheduleFadeIn 0.35s ease-out both; }
            `}</style>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={16} style={{ color: COLORS.accentSoft }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "Manrope, sans-serif" }}>
                  Delivery schedule
                </h3>
              </div>
              {hasDelivery ? (
                <div style={{ fontSize: 12.5, color: COLORS.muted, textAlign: "right" }}>
                  Current due{" "}
                  <strong style={{ color: daysLeft != null && daysLeft <= 7 ? COLORS.late : COLORS.text }}>
                    {formatDisplayDate(currentDelivery)}
                  </strong>
                  {" · "}
                  {formatDaysLeft(daysLeft)}
                  {totalExtDays ? ` · +${totalExtDays}d extended` : ""}
                </div>
              ) : null}
            </div>

            {timelineStops.length ? (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: isAdmin ? 16 : 0 }}>
                {timelineStops.map((stop, idx) => (
                  <div
                    key={stop.key}
                    className="schedule-row"
                    style={{ display: "flex", gap: 12, alignItems: "stretch", animationDelay: `${idx * 0.05}s` }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 99,
                          marginTop: 5,
                          background:
                            stop.kind === "extension"
                              ? COLORS.accentSoft
                              : stop.kind === "delivery"
                                ? COLORS.delivered
                                : COLORS.muted,
                          boxShadow:
                            idx === timelineStops.length - 1 ? `0 0 0 3px ${COLORS.accentSoft}40` : "none",
                          flexShrink: 0,
                        }}
                      />
                      {idx < timelineStops.length - 1 ? (
                        <div style={{ width: 2, flex: 1, minHeight: 20, background: COLORS.border, marginTop: 4 }} />
                      ) : null}
                    </div>
                    <div style={{ paddingBottom: idx < timelineStops.length - 1 ? 16 : 2 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{stop.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{stop.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: isAdmin ? 14 : 0 }}>
                No delivery date yet
                {project.dateline ? ` — sheet shows “${project.dateline}”` : ""}.
                {isAdmin ? " Set one below." : ""}
              </div>
            )}

            {isAdmin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <form
                  onSubmit={handleSaveDeliveryDate}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "end",
                    padding: 12,
                    borderRadius: 12,
                    background: COLORS.panel2,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: COLORS.muted, fontWeight: 650 }}>
                    {hasDelivery ? "Update delivery date" : "Set delivery date"}
                    <input
                      type="date"
                      value={deliveryInput}
                      onChange={(e) => setDeliveryInput(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: COLORS.panel,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        padding: "9px 11px",
                        color: COLORS.text,
                        fontSize: 13,
                        colorScheme: isDark ? "dark" : "light",
                      }}
                    />
                    {suggestedDelivery && !adminSchedule ? (
                      <span style={{ fontWeight: 500, fontSize: 11.5 }}>
                        Prefill from sheet countdown: {formatDisplayDate(suggestedDelivery)}
                        {datelineDays != null ? ` (“${project.dateline}” left)` : ""}
                      </span>
                    ) : null}
                  </label>
                  <button
                    type="submit"
                    style={{
                      background: isDark ? "#1C2230" : COLORS.accent,
                      color: isDark ? "#E8EDF5" : COLORS.onAccent,
                      border: `1px solid ${isDark ? "#2A3341" : "transparent"}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 700,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      height: 40,
                    }}
                  >
                    Save date
                  </button>
                </form>

                {hasDelivery ? (
                  <form
                    onSubmit={handleTakeExtension}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "end",
                      padding: 12,
                      borderRadius: 12,
                      background: COLORS.panel2,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: COLORS.muted, fontWeight: 650 }}>
                      Extend to new delivery date
                      <input
                        type="date"
                        value={extendInput}
                        min={toInputDate(
                          currentDelivery
                            ? new Date(
                                currentDelivery.getFullYear(),
                                currentDelivery.getMonth(),
                                currentDelivery.getDate() + 1
                              )
                            : ""
                        )}
                        onChange={(e) => setExtendInput(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: COLORS.panel,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 10,
                          padding: "9px 11px",
                          color: COLORS.text,
                          fontSize: 13,
                          colorScheme: isDark ? "dark" : "light",
                        }}
                      />
                      <span style={{ fontWeight: 500, fontSize: 11.5 }}>
                        Current due {formatDisplayDate(currentDelivery)} — pick a later date
                      </span>
                    </label>
                    <button
                      type="submit"
                      style={{
                        background: COLORS.accentSoft,
                        color: "#12161E",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontWeight: 700,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        height: 40,
                      }}
                    >
                      Take extension
                    </button>
                  </form>
                ) : null}

                {scheduleError ? (
                  <div style={{ color: COLORS.late, fontSize: 12.5, fontWeight: 650 }}>{scheduleError}</div>
                ) : null}
              </div>
            )}
          </section>

          {/* TEAM MEMBERS CARD */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users size={18} style={{ color: COLORS.accent }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, fontFamily: "Manrope, sans-serif" }}>Assigned Team</h3>
            </div>
            
            {/* TEAM LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {team.map((m) => (
                <div key={m.id} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  background: COLORS.panel2, 
                  border: `1px solid ${COLORS.border}`, 
                  borderRadius: 10, 
                  padding: "10px 12px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: "50%", 
                      background: getAvatarBg(m.name), 
                      color: "#FFFFFF", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      fontSize: 12, 
                      fontWeight: 700 
                    }}>
                      {getInitials(m.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>{memberRoleLabel(m)}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(m.id)} 
                    style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 4 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = COLORS.late}
                    onMouseLeave={(e) => e.currentTarget.style.color = COLORS.muted}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {team.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px", color: COLORS.muted, fontSize: 13 }}>
                  No team members assigned yet.
                </div>
              )}
            </div>

            {/* ADD MEMBER FORM */}
            <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11.5, color: COLORS.muted, fontWeight: 600 }}>ASSIGN NEW MEMBER</div>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setTeamError("");
                }}
                style={{
                  background: COLORS.panel2,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: COLORS.text,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <option value="">
                  {availableUsers.length ? "Select user…" : "All users already assigned"}
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {teamError && (
                <div style={{ fontSize: 12, color: COLORS.late }}>{teamError}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <RoleMultiSelect roles={ROLES} value={newMemberRoles} onChange={setNewMemberRoles} />
                <button type="submit" disabled={!selectedUserId} style={{ 
                  background: selectedUserId ? COLORS.accent : COLORS.border, 
                  color: selectedUserId ? "#fff" : COLORS.muted, 
                  border: "none", 
                  borderRadius: 8, 
                  padding: "0 14px", height: 40,
                  fontWeight: 600, 
                  fontSize: 13, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  cursor: selectedUserId ? "pointer" : "not-allowed",
                  opacity: selectedUserId ? 1 : 0.7,
                }}>
                  <Plus size={15} strokeWidth={2.5} /> Assign
                </button>
              </div>
            </form>
          </div>

          {/* STATUS CONTROLLER */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", fontFamily: "Manrope, sans-serif" }}>Pipeline Status</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 6, fontWeight: 500 }}>Sales Status</label>
                <select 
                  value={project.salesStatus || "WIP"} 
                  onChange={(e) => handleStatusChange("salesStatus", e.target.value)}
                  style={{ 
                    width: "100%", 
                    background: COLORS.panel2, 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: 8, 
                    padding: "9px 11px", 
                    color: COLORS.text, 
                    fontSize: 13.5,
                    cursor: "pointer"
                  }}
                >
                  <option value="WIP">WIP</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 6, fontWeight: 500 }}>Team Lead Status</label>
                <select 
                  value={project.teamLeadStatus || "WIP"} 
                  onChange={(e) => handleStatusChange("teamLeadStatus", e.target.value)}
                  style={{ 
                    width: "100%", 
                    background: COLORS.panel2, 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: 8, 
                    padding: "9px 11px", 
                    color: COLORS.text, 
                    fontSize: 13.5,
                    cursor: "pointer"
                  }}
                >
                  <option value="WIP">WIP</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.late, margin: "0 0 8px", fontFamily: "Manrope, sans-serif" }}>Danger Zone</h3>
            <p style={{ color: COLORS.muted, fontSize: 12.5, margin: "0 0 14px" }}>Remove this project permanently from the delivery database.</p>
            <button 
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${project.projectName}?`)) {
                  onDelete(project.id);
                }
              }} 
              style={{ 
                width: "100%", 
                background: COLORS.late + "22", 
                color: COLORS.late, 
                border: `1px solid ${COLORS.late}44`, 
                borderRadius: 8, 
                padding: "10px 0", 
                fontWeight: 600, 
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.late; e.currentTarget.style.color = "#1a0d0d"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.late + "22"; e.currentTarget.style.color = COLORS.late; }}
            >
              Delete Project
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: WORKSPACE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* MILESTONES & WORKSPACE */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: "Manrope, sans-serif" }}>Delivery Milestones</h3>
                <p style={{ color: COLORS.muted, fontSize: 12.5, margin: "4px 0 0" }}>Check off tasks as the project progresses</p>
              </div>
              <div className="mono" style={{ fontSize: 12.5, color: COLORS.accent, fontWeight: 600, background: COLORS.accent + "1A", padding: "4px 10px", borderRadius: 8 }}>
                {completedCount}/{totalCount} Completed ({progressPct}%)
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ width: "100%", background: COLORS.panel2, height: 6, borderRadius: 99, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ 
                width: `${progressPct}%`, 
                background: COLORS.accent, 
                height: "100%", 
                borderRadius: 99, 
                transition: "width 0.4s ease" 
              }} />
            </div>

            {/* MILESTONE LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {subtasks.map((task) => (
                <div key={task.id} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  background: COLORS.panel2, 
                  border: `1px solid ${task.completed ? COLORS.accent + "33" : COLORS.border}`, 
                  borderRadius: 10, 
                  padding: "10px 14px",
                  transition: "all 0.2s ease"
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                    <input 
                      type="checkbox" 
                      checked={task.completed} 
                      onChange={() => handleToggleSubtask(task.id)}
                      style={{ 
                        accentColor: COLORS.accent, 
                        width: 16, 
                        height: 16, 
                        cursor: "pointer" 
                      }} 
                    />
                    <span style={{ 
                      fontSize: 13.5, 
                      color: task.completed ? COLORS.muted : COLORS.text,
                      textDecoration: task.completed ? "line-through" : "none",
                      transition: "all 0.15s ease"
                    }}>
                      {task.text}
                    </span>
                  </label>
                  <button 
                    onClick={() => handleDeleteSubtask(task.id)} 
                    style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 4 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = COLORS.late}
                    onMouseLeave={(e) => e.currentTarget.style.color = COLORS.muted}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {totalCount === 0 && (
                <div style={{ textAlign: "center", padding: "16px", color: COLORS.muted, fontSize: 13 }}>
                  No milestones added yet. Add one below!
                </div>
              )}
            </div>

            {/* ADD MILESTONE FORM */}
            <form onSubmit={handleAddSubtask} style={{ display: "flex", gap: 8 }}>
              <input 
                type="text" 
                placeholder="Add custom milestone..." 
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                style={{ 
                  flex: 1, 
                  background: COLORS.panel2, 
                  border: `1px solid ${COLORS.border}`, 
                  borderRadius: 8, 
                  padding: "9px 12px", 
                  color: COLORS.text, 
                  fontSize: 13.5 
                }} 
              />
              <button type="submit" style={{ 
                background: COLORS.accent, 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "0 14px", 
                fontWeight: 600, 
                fontSize: 13.5, 
                display: "flex", 
                alignItems: "center", 
                gap: 4,
                cursor: "pointer"
              }}>
                <Plus size={16} strokeWidth={2.5} /> Add
              </button>
            </form>
          </div>

          {/* PROJECT NOTES */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: "Manrope, sans-serif" }}>Developer Notes</h3>
                <p style={{ color: COLORS.muted, fontSize: 12.5, margin: "4px 0 0" }}>Internal logs, requirements or updates</p>
              </div>
              {saveStatus && (
                <span style={{ fontSize: 12, color: COLORS.delivered, fontWeight: 600 }}>{saveStatus}</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {notes.map((note) => <div key={note.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}><span style={{ flex: 1, fontSize: 13, whiteSpace: "pre-wrap" }}>{note.text}</span><button type="button" onClick={() => handleDeleteNote(note.id)} style={{ border: 0, background: "none", color: COLORS.muted, padding: 0 }}><Trash2 size={14} /></button></div>)}
            </div>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a developer note…" style={{ width: "100%", height: 90, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, color: COLORS.text, fontFamily: "Manrope, sans-serif", fontSize: 13.5, resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
            <button onClick={handleAddNote} style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><FileText size={15} /> Add note</button>
          </div>

        </div>
      </div>

      </div>
    </div>
  );
}
