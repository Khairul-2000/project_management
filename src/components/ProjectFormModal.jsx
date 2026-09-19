import { useState, useEffect, useMemo } from "react";
import { X, Info, Calendar, GitBranch } from "lucide-react";
import { STACKS, DEFAULT_PROFILES, formatProfileName } from "../lib/constants";
import { useTheme } from "../lib/theme";

const TABS = [
  { id: "general", label: "General Info", icon: Info },
  { id: "timeline", label: "Timeline & Status", icon: Calendar },
  { id: "team", label: "Team & Repos", icon: GitBranch },
];

export default function ProjectFormModal({ editingId, form, availableProfiles = [], onChange, onClose, onSave }) {
  const { colors, card } = useTheme();
  const [activeTab, setActiveTab] = useState("general");
  const [errors, setErrors] = useState({});

  const profileOptions = useMemo(() => {
    const set = new Set(availableProfiles || []);
    if (form.profile) set.add(form.profile);
    (DEFAULT_PROFILES || []).forEach((pf) => set.add(pf));
    return Array.from(set);
  }, [availableProfiles, form.profile]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSaveClick();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form]);

  function validate() {
    const errs = {};
    if (!form.projectName || !form.projectName.trim()) {
      errs.projectName = "Project name is required";
    }
    if (form.price !== "" && isNaN(Number(form.price))) {
      errs.price = "Price must be a valid number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSaveClick() {
    if (!validate()) {
      setActiveTab("general");
      return;
    }
    onSave();
  }

  const fieldStyle = (hasError) => ({
    width: "100%",
    background: colors.panel2,
    border: `1px solid ${hasError ? colors.late : colors.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: colors.text,
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
  });

  const labelStyle = {
    fontSize: 11.5,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: 700,
    display: "block",
  };

  return (
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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...card,
          width: "100%",
          maxWidth: 580,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: colors.shadow,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div className="disp" style={{ fontWeight: 800, fontSize: 18 }}>
              {editingId ? "Edit Project Phase" : "New Project Phase"}
            </div>
            <div style={{ fontSize: 12, color: colors.muted }}>
              Fill in the phase specifications, timeline, and repository links.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: colors.muted,
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.panel2,
            padding: "4px 16px 0",
            gap: 6,
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  border: "none",
                  borderBottom: `2px solid ${active ? colors.accent : "transparent"}`,
                  background: "none",
                  color: active ? colors.text : colors.muted,
                  fontWeight: active ? 750 : 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>
                  Project Name <span style={{ color: colors.late }}>*</span>
                </label>
                <input
                  placeholder="e.g. Acme Mobile & Web App"
                  value={form.projectName || ""}
                  onChange={(e) => onChange({ ...form, projectName: e.target.value })}
                  style={fieldStyle(errors.projectName)}
                />
                {errors.projectName ? (
                  <span style={{ fontSize: 11, color: colors.late, marginTop: 2, display: "block" }}>
                    {errors.projectName}
                  </span>
                ) : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Phase Name</label>
                  <input
                    placeholder="e.g. Mobile App Backend"
                    value={form.phase || ""}
                    onChange={(e) => onChange({ ...form, phase: e.target.value })}
                    style={fieldStyle(false)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Fiverr Profile</label>
                  <select
                    value={form.profile}
                    onChange={(e) => onChange({ ...form, profile: e.target.value })}
                    style={fieldStyle(false)}
                  >
                    {profileOptions.map((pf) => (
                      <option key={pf} value={pf}>
                        {formatProfileName(pf)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Order ID</label>
                  <input
                    placeholder="e.g. FO829A105B"
                    value={form.orderId || ""}
                    onChange={(e) => onChange({ ...form, orderId: e.target.value })}
                    style={fieldStyle(false)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Price (USD)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={form.price ?? ""}
                    onChange={(e) => onChange({ ...form, price: e.target.value })}
                    style={fieldStyle(errors.price)}
                  />
                  {errors.price ? (
                    <span style={{ fontSize: 11, color: colors.late, marginTop: 2, display: "block" }}>
                      {errors.price}
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Order URL</label>
                <input
                  placeholder="https://www.fiverr.com/orders/..."
                  value={form.orderUrl || ""}
                  onChange={(e) => onChange({ ...form, orderUrl: e.target.value })}
                  style={fieldStyle(false)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Intake Date</label>
                  <input
                    placeholder="e.g. 7/12/2026"
                    value={form.date || ""}
                    onChange={(e) => onChange({ ...form, date: e.target.value })}
                    style={fieldStyle(false)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sales Person</label>
                  <input
                    placeholder="e.g. Direct"
                    value={form.salesPerson || ""}
                    onChange={(e) => onChange({ ...form, salesPerson: e.target.value })}
                    style={fieldStyle(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Dateline (Days or Notes)</label>
                  <input
                    placeholder="e.g. 5 Days or Order Late"
                    value={form.dateline || ""}
                    onChange={(e) => onChange({ ...form, dateline: e.target.value })}
                    style={fieldStyle(false)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Shift</label>
                  <select
                    value={form.shift || "Day"}
                    onChange={(e) => onChange({ ...form, shift: e.target.value })}
                    style={fieldStyle(false)}
                  >
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Team Lead Status</label>
                  <select
                    value={form.teamLeadStatus || "WIP"}
                    onChange={(e) => onChange({ ...form, teamLeadStatus: e.target.value })}
                    style={fieldStyle(false)}
                  >
                    <option value="WIP">WIP</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Sales Status</label>
                  <select
                    value={form.salesStatus || "WIP"}
                    onChange={(e) => onChange({ ...form, salesStatus: e.target.value })}
                    style={fieldStyle(false)}
                  >
                    <option value="WIP">WIP</option>
                    <option value="Delivered">Delivered</option>
                    <option value="NRA">NRA</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Possible to Deliver?</label>
                <select
                  value={form.possibility === "Yes" ? "Yes" : "No"}
                  onChange={(e) => onChange({ ...form, possibility: e.target.value })}
                  style={fieldStyle(false)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Department (Stack)</label>
                  <select
                    value={form.stack || STACKS[0]}
                    onChange={(e) => onChange({ ...form, stack: e.target.value })}
                    style={fieldStyle(false)}
                  >
                    {STACKS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Supervisor</label>
                  <input
                    placeholder="e.g. Khairul"
                    value={form.supervisor || ""}
                    onChange={(e) => onChange({ ...form, supervisor: e.target.value })}
                    style={fieldStyle(false)}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Team Name / Lead</label>
                <input
                  placeholder="e.g. Pritom"
                  value={form.teamName || ""}
                  onChange={(e) => onChange({ ...form, teamName: e.target.value })}
                  style={fieldStyle(false)}
                />
              </div>

              <div>
                <label style={labelStyle}>GitHub Repository URL</label>
                <input
                  placeholder="https://github.com/organization/repo"
                  value={form.githubUrl || ""}
                  onChange={(e) => onChange({ ...form, githubUrl: e.target.value })}
                  style={fieldStyle(false)}
                />
              </div>

              <div>
                <label style={labelStyle}>GitLab Repository URL</label>
                <input
                  placeholder="https://gitlab.com/organization/repo"
                  value={form.gitlabUrl || ""}
                  onChange={(e) => onChange({ ...form, gitlabUrl: e.target.value })}
                  style={fieldStyle(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${colors.border}`,
            background: colors.panel2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11.5, color: colors.muted }}>
            Press <strong style={{ color: colors.text }}>Ctrl+Enter</strong> to save
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: colors.panel,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: "8px 14px",
                fontWeight: 650,
                color: colors.text,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              style={{
                background: colors.accent,
                color: colors.onAccent,
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {editingId ? "Save Changes" : "Create Phase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
