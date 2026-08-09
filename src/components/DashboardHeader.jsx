import { Plus, Download, Upload, RefreshCw, Link2 } from "lucide-react";
import { COLORS } from "../lib/constants";

function formatSyncTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function DashboardHeader({
  saveState,
  canWriteDb,
  googleStatus,
  syncing,
  onSync,
  onConnectGoogle,
  onExport,
  onImport,
  onAdd,
}) {
  const connected = Boolean(googleStatus?.connected);
  const configured = Boolean(googleStatus?.configured);
  const lastSync = formatSyncTime(googleStatus?.lastSyncAt);

  let badgeLabel = "Google: checking…";
  let badgeColor = COLORS.muted;
  let badgeBg = COLORS.panel2;
  if (googleStatus) {
    if (!configured) {
      badgeLabel = "Google: missing .env";
      badgeColor = COLORS.wip;
    } else if (connected) {
      badgeLabel = `Google: connected${googleStatus.email ? ` · ${googleStatus.email}` : ""}`;
      badgeColor = COLORS.delivered;
      badgeBg = "rgba(62, 207, 142, 0.12)";
    } else {
      badgeLabel = "Google: not connected — click Connect Google";
      badgeColor = COLORS.wip;
      badgeBg = "rgba(242, 184, 75, 0.12)";
    }
  }

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
        <div
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: badgeBg,
            color: badgeColor,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: badgeColor,
              flexShrink: 0,
            }}
          />
          {badgeLabel}
          {connected && lastSync ? (
            <span style={{ color: COLORS.muted, fontWeight: 500 }}>· last sync {lastSync}</span>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {configured && !connected && (
          <button
            onClick={onConnectGoogle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: COLORS.wip,
              color: "#0D1117",
              border: "none",
              borderRadius: 10,
              padding: "11px 14px",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <Link2 size={15} /> Connect Google
          </button>
        )}
        {connected && (
          <button
            onClick={onSync}
            disabled={syncing}
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
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={15} className={syncing ? "spin" : undefined} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        )}
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
