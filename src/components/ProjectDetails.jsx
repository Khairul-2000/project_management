import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Calendar, User, DollarSign, Tag, CheckSquare, 
  Trash2, Plus, Clock, Clock3, FileText, CheckCircle2, AlertTriangle, Users, ExternalLink
} from "lucide-react";

const COLORS = {
  bg: "#0D1117",
  panel: "#141A22",
  panel2: "#1A212B",
  border: "#232B37",
  text: "#E7EBF1",
  muted: "#7C8798",
  delivered: "#3ECF8E",
  wip: "#F2B84B",
  late: "#F0635A",
  accent: "#8C7CFF",
};

const STACK_COLOR = {
  Backend: "#7C9CFF",
  Frontend: "#FF9F6B",
  "UI/UX": "#C792F0",
  Automation: "#5FD0D6",
  Deploy: "#E8D45F",
  Other: "#7C8798",
};

const PROFILE_SHORT = {
  code_muse_Fiverr: "CodeMuse",
  Web_Chrome_Fiverr: "WebChrome",
  binary_bards_fiverr: "BinaryBards",
  Ui_verse_Fiverr: "UiVerse",
  SparkFlow_Fiverr: "SparkFlow",
};

function statusOf(p) {
  const lead = String(p.teamLeadStatus || "").trim().toLowerCase();
  if (lead === "delivered") return "delivered";
  return "wip";
}

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

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
    "linear-gradient(135deg, #7C9CFF, #4C6CFF)", // blue
    "linear-gradient(135deg, #FF9F6B, #FF6F2B)", // orange
    "linear-gradient(135deg, #C792F0, #9A4CE0)", // purple
    "linear-gradient(135deg, #5FD0D6, #2BA6AD)", // teal
    "linear-gradient(135deg, #E8D45F, #B8A31F)", // yellow
    "linear-gradient(135deg, #FF7C7C, #E04C4C)"  // red
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "UI/UX Designer",
  "DevOps Engineer",
  "QA Engineer",
  "Project Lead"
];

export default function ProjectDetails({ project, onBack, onUpdate, onDelete }) {
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState(ROLES[0]);
  const [notesText, setNotesText] = useState(project.notes || "");
  const [saveStatus, setSaveStatus] = useState("");

  // Sync notes when project ID changes
  useEffect(() => {
    setNotesText(project.notes || "");
    setSaveStatus("");
  }, [project.id, project.notes]);

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
  const stackColor = STACK_COLOR[project.stack] || STACK_COLOR.Other;

  const defaultTeam = useMemo(() => [
    { id: "m1", name: "Alex Chen", role: "Project Lead" },
    { id: "m2", name: "Elena Rostova", role: "UI/UX Designer" }
  ], []);
  const team = project.teamMembers || defaultTeam;

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
    if (!newMemberName.trim()) return;
    const newMember = {
      id: `member-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole
    };
    onUpdate({
      ...project,
      teamMembers: [...team, newMember]
    });
    setNewMemberName("");
  };

  const handleRemoveMember = (memberId) => {
    const updatedTeam = team.filter(m => m.id !== memberId);
    onUpdate({
      ...project,
      teamMembers: updatedTeam
    });
  };

  const handleSaveNotes = () => {
    onUpdate({
      ...project,
      notes: notesText
    });
    setSaveStatus("Saved!");
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleStatusChange = (field, val) => {
    onUpdate({
      ...project,
      [field]: val
    });
  };

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
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100%", fontFamily: "Inter, sans-serif", padding: "28px 24px 60px" }}>
      
      {/* BREADCRUMB & BACK BUTTON */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 6, 
          background: COLORS.panel2, 
          color: COLORS.text, 
          border: `1px solid ${COLORS.border}`, 
          borderRadius: 8, 
          padding: "8px 14px", 
          fontWeight: 600, 
          fontSize: 13,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.border; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.panel2; }}
        >
          <ArrowLeft size={16} /> Back to Console
        </button>
        <div style={{ color: COLORS.muted, fontSize: 13 }}>
          Console &nbsp;/&nbsp; Projects &nbsp;/&nbsp; <span style={{ color: COLORS.text, fontWeight: 500 }}>{project.projectName}</span>
        </div>
      </div>

      {/* HEADER BLOCK */}
      <div style={{ 
        background: COLORS.panel, 
        border: `1px solid ${COLORS.border}`, 
        borderRadius: 14, 
        padding: "24px 28px", 
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
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
              {project.stack}
            </span>
            {badge(statusOf(project))}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>
            {project.projectName}
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "6px 0 0" }}>
            ID: <span className="mono" style={{ color: COLORS.accent }}>{project.id}</span> &middot; Phase: {project.phase || "—"}
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
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", fontFamily: "Space Grotesk, sans-serif" }}>Metadata & Details</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Sales Person", value: project.salesPerson, Icon: User },
                { label: "Team", value: project.teamName || "—", Icon: Users },
                { label: "Intake Date", value: project.date, Icon: Calendar },
                { label: "Fiverr Profile", value: PROFILE_SHORT[project.profile] || project.profile, Icon: Tag },
                { label: "Timeline / Dateline", value: project.dateline || "—", Icon: Clock },
                { label: "Supervisor", value: project.supervisor || "—", Icon: User },
                { label: "Shift", value: project.shift || "—", Icon: Clock3 },
                { label: "Possibility", value: project.possibility || "—", Icon: AlertTriangle },
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

          {/* TEAM MEMBERS CARD */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users size={18} style={{ color: COLORS.accent }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>Assigned Team</h3>
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
                      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>{m.role}</div>
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
              <input 
                type="text" 
                placeholder="Developer name..." 
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                style={{ 
                  background: COLORS.panel2, 
                  border: `1px solid ${COLORS.border}`, 
                  borderRadius: 8, 
                  padding: "8px 10px", 
                  color: COLORS.text, 
                  fontSize: 13 
                }} 
              />
              <div style={{ display: "flex", gap: 8 }}>
                <select 
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  style={{ 
                    flex: 1,
                    background: COLORS.panel2, 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: 8, 
                    padding: "8px 10px", 
                    color: COLORS.text, 
                    fontSize: 13,
                    cursor: "pointer"
                  }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="submit" style={{ 
                  background: COLORS.accent, 
                  color: "#0D1117", 
                  border: "none", 
                  borderRadius: 8, 
                  padding: "0 14px", 
                  fontWeight: 600, 
                  fontSize: 13, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  cursor: "pointer"
                }}>
                  <Plus size={15} strokeWidth={2.5} /> Assign
                </button>
              </div>
            </form>
          </div>

          {/* STATUS CONTROLLER */}
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", fontFamily: "Space Grotesk, sans-serif" }}>Pipeline Status</h3>
            
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
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.late, margin: "0 0 8px", fontFamily: "Space Grotesk, sans-serif" }}>Danger Zone</h3>
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
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>Delivery Milestones</h3>
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
                color: "#0D1117", 
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
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>Developer Notes</h3>
                <p style={{ color: COLORS.muted, fontSize: 12.5, margin: "4px 0 0" }}>Internal logs, requirements or updates</p>
              </div>
              {saveStatus && (
                <span style={{ fontSize: 12, color: COLORS.delivered, fontWeight: 600 }}>{saveStatus}</span>
              )}
            </div>

            <textarea 
              value={notesText} 
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Type meeting notes, deployment requirements, credentials structure, or general logs for the delivery team..."
              style={{ 
                width: "100%", 
                height: 120, 
                background: COLORS.panel2, 
                border: `1px solid ${COLORS.border}`, 
                borderRadius: 10, 
                padding: 12, 
                color: COLORS.text, 
                fontFamily: "Inter, sans-serif", 
                fontSize: 13.5, 
                resize: "vertical", 
                boxSizing: "border-box",
                marginBottom: 12
              }} 
            />

            <button 
              onClick={handleSaveNotes} 
              style={{ 
                background: COLORS.panel2, 
                color: COLORS.text, 
                border: `1px solid ${COLORS.border}`, 
                borderRadius: 8, 
                padding: "9px 16px", 
                fontWeight: 600, 
                fontSize: 13.5,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = COLORS.border}
              onMouseLeave={(e) => e.currentTarget.style.background = COLORS.panel2}
            >
              <FileText size={15} /> Save Notes
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
