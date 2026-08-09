import { Plus, Download, Upload, RefreshCw, Link2, Sun, Moon, LogOut, Users } from "lucide-react";
import { useTheme } from "../lib/theme";

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
  currentUser,
  isAdmin,
  onSync,
  onConnectGoogle,
  onExport,
  onImport,
  onAdd,
  onLogout,
  onOpenUsers,
}) {
  const { colors, card, mode, toggleTheme } = useTheme();
  const connected = Boolean(googleStatus?.connected);
  const configured = Boolean(googleStatus?.configured);
  const lastSync = formatSyncTime(googleStatus?.lastSyncAt);

  let badgeLabel = isAdmin ? "Google: checking…" : "";
  let badgeColor = colors.muted;
  let badgeBg = colors.panel2;
  if (isAdmin && googleStatus) {
    if (!configured) {
      badgeLabel = "Google: missing .env";
      badgeColor = colors.wip;
    } else if (connected) {
      badgeLabel = `Google: connected${googleStatus.email ? ` · ${googleStatus.email}` : ""}`;
      badgeColor = colors.delivered;
      badgeBg = "rgba(31, 157, 99, 0.12)";
    } else {
      badgeLabel = "Google: not connected — click Connect Google";
      badgeColor = colors.wip;
      badgeBg = "rgba(217, 161, 23, 0.14)";
    }
  }

  const btnSecondary = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: colors.panel,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: 13,
    boxShadow: colors.shadowSoft,
  };

  return (
    <div
      style={{
        ...card,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 18,
        padding: "20px 22px",
        marginBottom: 18,
      }}
    >
      <div>
        <div style={{ color: colors.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, marginBottom: 6 }}>
          Pritom team · Fiverr delivery pipeline
        </div>
        <h1 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.4, color: colors.text }}>
          Delivery Ops Console
        </h1>
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: saveState.includes("fail") || saveState.includes("Read-only") ? colors.wip : colors.muted,
            fontWeight: 500,
          }}
        >
          {currentUser ? (
            <>
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.role})
              {saveState ? ` · ${saveState}` : ""}
            </>
          ) : (
            <>DB: projects.json{saveState ? ` · ${saveState}` : canWriteDb ? " · writable" : " · read-only"}</>
          )}
        </div>
        {isAdmin && badgeLabel ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              padding: "7px 12px",
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              background: badgeBg,
              color: badgeColor,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: badgeColor, flexShrink: 0 }} />
            {badgeLabel}
            {connected && lastSync ? (
              <span style={{ color: colors.muted, fontWeight: 500 }}>· last sync {lastSync}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={toggleTheme}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{ ...btnSecondary, padding: "10px 12px" }}
        >
          {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {mode === "dark" ? "Light" : "Dark"}
        </button>
        {isAdmin && (
          <button onClick={onOpenUsers} style={btnSecondary}>
            <Users size={15} /> Users
          </button>
        )}
        {isAdmin && configured && !connected && (
          <button
            onClick={onConnectGoogle}
            style={{
              ...btnSecondary,
              background: colors.accentSoft,
              border: "none",
              color: colors.onAccent === "#FFFFFF" ? colors.accent : colors.onAccent,
            }}
          >
            <Link2 size={15} /> Connect Google
          </button>
        )}
        {isAdmin && connected && (
          <button onClick={onSync} disabled={syncing} style={{ ...btnSecondary, opacity: syncing ? 0.7 : 1 }}>
            <RefreshCw size={15} className={syncing ? "spin" : undefined} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        )}
        {isAdmin && (
          <button onClick={onExport} style={btnSecondary}>
            <Download size={15} /> Export
          </button>
        )}
        {isAdmin && (
          <label style={{ ...btnSecondary, cursor: "pointer" }}>
            <Upload size={15} /> Import
            <input type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
          </label>
        )}
        {isAdmin && (
          <button
            onClick={onAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: colors.accent,
              color: colors.onAccent,
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: 13.5,
              boxShadow: colors.shadowSoft,
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> New project
          </button>
        )}
        <button onClick={onLogout} style={btnSecondary}>
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );
}
