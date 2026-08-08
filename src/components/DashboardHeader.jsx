import { Plus, Download, Upload } from "lucide-react";
import { COLORS } from "../lib/constants";

export default function DashboardHeader({
  saveState,
  canWriteDb,
  onExport,
  onImport,
  onAdd,
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
      <div>
        <div className="mono" style={{ color: COLORS.accent, fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>
          PRITOM TEAM · FIVERR DELIVERY PIPELINE
        </div>
        <h1 className="disp" style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Delivery Ops Console</h1>
        <div
          className="mono"
          style={{
            marginTop: 6,
            fontSize: 11.5,
            color: saveState.includes("fail") || saveState.includes("Read-only") ? COLORS.wip : COLORS.muted,
          }}
        >
          DB: public/data/projects.json{saveState ? ` · ${saveState}` : canWriteDb ? " · writable" : " · read-only"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={onExport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: COLORS.panel2,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "11px 14px",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Download size={15} /> Export
        </button>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: COLORS.panel2,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "11px 14px",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Upload size={15} /> Import
          <input type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
        </label>
        <button
          onClick={onAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: COLORS.accent,
            color: "#0D1117",
            border: "none",
            borderRadius: 10,
            padding: "11px 18px",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Plus size={16} strokeWidth={2.5} /> New project
        </button>
      </div>
    </div>
  );
}
