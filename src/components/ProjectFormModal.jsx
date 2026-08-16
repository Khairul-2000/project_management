import { X } from "lucide-react";
import { STACKS, PROFILES, PROFILE_SHORT } from "../lib/constants";
import { useTheme } from "../lib/theme";

export default function ProjectFormModal({ editingId, form, onChange, onClose, onSave }) {
  const { colors } = useTheme();
  const fieldStyle = {
    width: "100%",
    background: colors.panel2,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: "9px 11px",
    color: colors.text,
    fontSize: 13.5,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: colors.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 24,
          width: 440,
          maxWidth: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: colors.shadow,
          color: colors.text,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="disp" style={{ fontWeight: 700, fontSize: 17 }}>
            {editingId ? "Edit project" : "New project"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: colors.muted }}>
            <X size={18} />
          </button>
        </div>
        {[
          ["date", "Date", "text", "e.g. 7/12/2026"],
          ["salesPerson", "Sales person", "text", ""],
          ["teamName", "Team name", "text", "e.g. Pritom"],
          ["projectName", "Project name", "text", ""],
          ["phase", "Phase", "text", "e.g. Mobile App Backend"],
          ["orderUrl", "Order URL / ID", "text", "https://www.fiverr.com/orders/..."],
          ["price", "Price (USD)", "number", ""],
          ["dateline", "Dateline", "text", "e.g. 5 Days / Order Late"],
          ["supervisor", "Supervisor", "text", "e.g. Khairul"],
          ["shift", "Shift", "text", "e.g. Day"],
        ].map(([key, label, type, ph]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <input
              type={type}
              placeholder={ph}
              value={form[key] || ""}
              onChange={(e) => onChange({ ...form, [key]: e.target.value })}
              style={fieldStyle}
            />
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 4, fontWeight: 600 }}>Department (stack)</div>
            <select
              value={form.stack}
              onChange={(e) => onChange({ ...form, stack: e.target.value })}
              style={fieldStyle}
            >
              {STACKS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 4, fontWeight: 600 }}>Fiverr profile</div>
            <select
              value={form.profile}
              onChange={(e) => onChange({ ...form, profile: e.target.value })}
              style={fieldStyle}
            >
              {PROFILES.map((pf) => (
                <option key={pf} value={pf}>
                  {PROFILE_SHORT[pf]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 4, fontWeight: 600 }}>Possible</div>
          <select
            value={form.possibility === "Yes" ? "Yes" : "No"}
            onChange={(e) => onChange({ ...form, possibility: e.target.value })}
            style={fieldStyle}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 4, fontWeight: 600 }}>Sales status</div>
            <select
              value={form.salesStatus}
              onChange={(e) => onChange({ ...form, salesStatus: e.target.value })}
              style={fieldStyle}
            >
              <option value="WIP">WIP</option>
              <option value="NRA">NRA</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 4, fontWeight: 600 }}>Team lead status</div>
            <select
              value={form.teamLeadStatus}
              onChange={(e) => onChange({ ...form, teamLeadStatus: e.target.value })}
              style={fieldStyle}
            >
              <option value="WIP">WIP</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
        </div>
        <button
          onClick={onSave}
          style={{
            width: "100%",
            background: colors.accent,
            color: colors.onAccent,
            border: "none",
            borderRadius: 12,
            padding: "11px 0",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {editingId ? "Save changes" : "Add project"}
        </button>
      </div>
    </div>
  );
}
