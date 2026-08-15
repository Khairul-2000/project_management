import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Users,
  RefreshCw,
  Link2,
  Download,
  Upload,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "../lib/theme";

const EXPANDED_W = 240;
const COLLAPSED_W = 72;

function formatSyncTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function NavButton({
  icon: Icon,
  label,
  showLabel,
  active,
  onClick,
  disabled,
  title,
  iconClassName,
}) {
  const { colors } = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || (!showLabel ? label : undefined)}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = colors.panel2;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? colors.panel2 : "transparent";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        justifyContent: showLabel ? "flex-start" : "center",
        padding: showLabel ? "9px 12px" : "10px 0",
        background: active ? colors.panel2 : "transparent",
        border: "none",
        borderRadius: 10,
        color: active ? colors.text : colors.muted,
        fontWeight: active ? 700 : 600,
        fontSize: 13,
        opacity: disabled ? 0.65 : 1,
        textAlign: "left",
      }}
    >
      <Icon size={16} strokeWidth={2.25} className={iconClassName} style={{ flexShrink: 0 }} />
      {showLabel ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span> : null}
    </button>
  );
}

export default function AppSidebar({
  collapsed,
  mobileOpen,
  isMobile,
  currentUser,
  isAdmin,
  activeView,
  googleStatus,
  syncing,
  onGoDashboard,
  onOpenAnalytics,
  onOpenClientProjects,
  onOpenUsers,
  onSync,
  onConnectGoogle,
  onExport,
  onImport,
  onLogout,
  onCloseMobile,
}) {
  const { colors, mode, toggleTheme } = useTheme();
  const showLabel = isMobile || !collapsed;
  const railWidth = showLabel ? EXPANDED_W : COLLAPSED_W;
  const connected = Boolean(googleStatus?.connected);
  const configured = Boolean(googleStatus?.configured);
  const lastSync = formatSyncTime(googleStatus?.lastSyncAt);

  let statusLabel = isAdmin ? "Google: checking…" : "";
  let statusColor = colors.muted;
  if (isAdmin && googleStatus) {
    if (!configured) {
      statusLabel = "Google: missing .env";
      statusColor = colors.wip;
    } else if (connected) {
      statusLabel = googleStatus.email ? `Google · ${googleStatus.email}` : "Google: connected";
      statusColor = colors.delivered;
    } else {
      statusLabel = "Google: not connected";
      statusColor = colors.wip;
    }
  }

  function go(fn) {
    fn?.();
    if (isMobile) onCloseMobile?.();
  }

  const itemWrap = {
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        width: isMobile ? 0 : railWidth,
        flexShrink: 0,
        transition: isMobile ? undefined : "width .2s ease",
      }}
    >
      <aside
        style={{
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: 80,
          width: railWidth,
          height: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: showLabel ? "16px 12px" : "16px 8px",
          background: colors.panel,
          borderRight: `1px solid ${colors.border}`,
          boxShadow: isMobile ? colors.shadow : "none",
          transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform .2s ease, width .2s ease, padding .2s ease",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: showLabel ? "flex-start" : "center",
            padding: showLabel ? "4px 8px 12px" : "4px 0 12px",
            marginBottom: 4,
          }}
        >
          <span
            title="Projects Ops"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: colors.accentSoft,
              color: colors.onAccent === "#FFFFFF" ? colors.accent : colors.onAccent,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
              letterSpacing: -0.3,
            }}
          >
            Ops
          </span>
          {showLabel ? (
            <div className="disp" style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3, lineHeight: 1.2 }}>
              Projects Ops
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <NavButton
            icon={LayoutDashboard}
            label="Dashboard"
            showLabel={showLabel}
            active={activeView === "dashboard"}
            onClick={() => go(onGoDashboard)}
          />
        ) : null}
        {isAdmin ? (
          <NavButton
            icon={BarChart3}
            label="Analytics"
            showLabel={showLabel}
            active={activeView === "analytics"}
            onClick={() => go(onOpenAnalytics)}
          />
        ) : null}
        <NavButton
          icon={FolderKanban}
          label="Projects"
          showLabel={showLabel}
          active={
            activeView === "clientProjects" ||
            activeView === "clientProjectDetail" ||
            (!isAdmin && activeView === "dashboard")
          }
          onClick={() => go(onOpenClientProjects)}
        />
        {isAdmin ? (
          <NavButton
            icon={Users}
            label="Users"
            showLabel={showLabel}
            active={activeView === "users"}
            onClick={() => go(onOpenUsers)}
          />
        ) : null}

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* {isAdmin && statusLabel ? (
          <div
            title={[statusLabel, connected && lastSync ? `Last sync ${lastSync}` : null].filter(Boolean).join(" · ")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: showLabel ? "flex-start" : "center",
              padding: showLabel ? "8px 12px" : "8px 0",
              marginBottom: 4,
              borderRadius: 10,
              background: colors.panel2,
              color: statusColor,
              fontSize: 11.5,
              fontWeight: 650,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
            {showLabel ? (
              <span style={{ overflow: "hidden", minWidth: 0 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {statusLabel}
                </span>
                {connected && lastSync ? (
                  <span style={{ display: "block", color: colors.muted, fontWeight: 500, fontSize: 10.5 }}>
                    Last sync {lastSync}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}*/}

        {isAdmin && configured && !connected ? (
          <div style={itemWrap}>
            <NavButton
              icon={Link2}
              label="Connect Google"
              showLabel={showLabel}
              onClick={() => go(onConnectGoogle)}
            />
          </div>
        ) : null}
        {isAdmin && connected ? (
          <NavButton
            icon={RefreshCw}
            label={syncing ? "Syncing…" : "Sync now"}
            showLabel={showLabel}
            onClick={() => onSync?.()}
            disabled={syncing}
            title={syncing ? "Syncing…" : "Sync now"}
            iconClassName={syncing ? "spin" : undefined}
          />
        ) : null}
        {isAdmin ? (
          <NavButton icon={Download} label="Export" showLabel={showLabel} onClick={onExport} />
        ) : null}
        {isAdmin ? (
          <label
            title={!showLabel ? "Import" : undefined}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.panel2;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              justifyContent: showLabel ? "flex-start" : "center",
              padding: showLabel ? "9px 12px" : "10px 0",
              borderRadius: 10,
              color: colors.muted,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              boxSizing: "border-box",
              background: "transparent",
            }}
          >
            <Upload size={16} strokeWidth={2.25} style={{ flexShrink: 0 }} />
            {showLabel ? "Import" : null}
            <input type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
          </label>
        ) : null}

        <NavButton
          icon={mode === "dark" ? Sun : Moon}
          label={mode === "dark" ? "Light" : "Dark"}
          showLabel={showLabel}
          onClick={toggleTheme}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        />

        <div
          style={{
            marginTop: 8,
            paddingTop: 10,
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {currentUser ? (
            <div
              title={`${currentUser.name} (${currentUser.role})`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: showLabel ? "flex-start" : "center",
                padding: showLabel ? "6px 12px" : "6px 0",
                color: colors.muted,
                fontSize: 12,
                fontWeight: 600,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  display: "grid",
                  placeItems: "center",
                  color: colors.text,
                  fontSize: 11,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {String(currentUser.name || "?").slice(0, 1).toUpperCase()}
              </span>
              {showLabel ? (
                <span style={{ overflow: "hidden", minWidth: 0 }}>
                  <span style={{ display: "block", color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentUser.name}
                  </span>
                  <span style={{ display: "block", fontWeight: 500, textTransform: "capitalize" }}>{currentUser.role}</span>
                </span>
              ) : null}
            </div>
          ) : null}
          <NavButton icon={LogOut} label="Logout" showLabel={showLabel} onClick={onLogout} />
        </div>
      </aside>
    </div>
  );
}

export { EXPANDED_W, COLLAPSED_W };
