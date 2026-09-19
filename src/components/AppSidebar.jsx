import { useState } from "react";
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
  User,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import {
  roleLabel,
  canConnectGoogle,
  canSyncGoogle,
  canImportFullBackup,
} from "../lib/roles";

const EXPANDED_W = 240;
const COLLAPSED_W = 72;

function formatSyncTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function NavButton({
  as: Component = "button",
  icon: Icon,
  label,
  showLabel,
  active,
  onClick,
  disabled,
  title,
  iconClassName,
  tint,
  children,
}) {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);

  const isHighlighted = active;
  const textColor = isHighlighted
    ? colors.onAccent
    : hovered
      ? (tint || colors.text)
      : (tint || colors.muted);

  const bgColor = isHighlighted
    ? colors.accent
    : hovered
      ? (tint ? `${tint}16` : colors.panel2)
      : "transparent";

  const isCollapsed = !showLabel;

  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={Component === "button" ? disabled : undefined}
      title={title || (isCollapsed ? label : undefined)}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isCollapsed ? "center" : "flex-start",
        gap: 11,
        width: isCollapsed ? 42 : "100%",
        height: 40,
        margin: isCollapsed ? "0 auto" : 0,
        padding: isCollapsed ? 0 : "0 13px",
        background: bgColor,
        border: "none",
        borderRadius: 14,
        color: textColor,
        fontWeight: isHighlighted ? 750 : 600,
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "all 0.16s ease",
        boxSizing: "border-box",
        boxShadow: isHighlighted ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
        position: "relative",
      }}
    >
      <Icon
        size={17}
        strokeWidth={isHighlighted ? 2.4 : 2}
        className={iconClassName}
        style={{ flexShrink: 0, color: textColor, transition: "color 0.16s ease" }}
      />
      {!isCollapsed ? (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: -0.2,
          }}
        >
          {label}
        </span>
      ) : null}
      {children}
    </Component>
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
  onOpenProfile,
  onSync,
  onConnectGoogle,
  onExport,
  onImport,
  onLogout,
  onCloseMobile,
}) {
  const { colors, mode, toggleTheme } = useTheme();
  const [userHovered, setUserHovered] = useState(false);
  const showLabel = isMobile || !collapsed;
  const railWidth = showLabel ? EXPANDED_W : COLLAPSED_W;
  const connected = Boolean(googleStatus?.connected);
  const configured = Boolean(googleStatus?.configured);
  const lastSync = formatSyncTime(googleStatus?.lastSyncAt);

  const isSuper = canConnectGoogle(currentUser);
  const canSync = canSyncGoogle(currentUser);

  let statusLabel = isSuper ? "Google: checking…" : "";
  let statusColor = colors.muted;
  if (isSuper && googleStatus) {
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

  const hasSystemSection =
    (isSuper && statusLabel) ||
    (isSuper && (configured || connected)) ||
    (canSync && connected) ||
    isAdmin ||
    canImportFullBackup(currentUser);

  return (
    <div
      style={{
        width: isMobile ? 0 : railWidth + (isMobile ? 0 : 14),
        flexShrink: 0,
        transition: isMobile ? undefined : "width .22s cubic-bezier(0.4, 0, 0.2, 1)",
        padding: isMobile ? 0 : "12px 0 12px 14px",
        boxSizing: "border-box",
      }}
    >
      <aside
        style={{
          position: isMobile ? "fixed" : "sticky",
          top: isMobile ? 0 : 12,
          left: 0,
          zIndex: 80,
          width: isMobile ? 270 : railWidth,
          height: isMobile ? "100vh" : "calc(100vh - 24px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: showLabel ? "16px 12px" : "16px 8px",
          background: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: isMobile ? "0 24px 24px 0" : 24,
          boxShadow: isMobile ? "0 20px 40px rgba(0,0,0,0.2)" : colors.shadowSoft,
          transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform .22s ease, width .22s cubic-bezier(0.4, 0, 0.2, 1), padding .22s ease",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: showLabel ? "flex-start" : "center",
            padding: showLabel ? "4px 8px 12px" : "4px 0 12px",
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: 6,
          }}
        >
          <div
            onClick={() => go(onGoDashboard)}
            title="Projects Ops"
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: colors.accent,
              color: colors.onAccent || "#FFFFFF",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
              letterSpacing: -0.3,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            Ops
          </div>
          {showLabel ? (
            <div
              onClick={() => go(onGoDashboard)}
              style={{ cursor: "pointer", overflow: "hidden", minWidth: 0 }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: -0.4,
                  lineHeight: 1.2,
                  color: colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Projects Ops
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 10.5,
                  color: colors.muted,
                  letterSpacing: 0.2,
                }}
              >
                Operations Dock
              </div>
            </div>
          ) : null}
        </div>

        {/* Section: Menu */}
        {showLabel ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: colors.muted,
              padding: "4px 10px 4px",
            }}
          >
            Menu
          </div>
        ) : (
          <div style={{ height: 1, background: colors.border, margin: "2px 8px 4px" }} />
        )}

        {/* Navigation Links */}
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

        <NavButton
          icon={User}
          label="Profile"
          showLabel={showLabel}
          active={activeView === "profile"}
          onClick={() => go(onOpenProfile)}
        />

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* Section: System / Integrations */}
        {hasSystemSection ? (
          <>
            {showLabel ? (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: colors.muted,
                  padding: "8px 10px 4px",
                }}
              >
                Data & Sync
              </div>
            ) : (
              <div style={{ height: 1, background: colors.border, margin: "6px 8px" }} />
            )}

            {/* Google Status Indicator (SUPER ADMIN ONLY) */}
            {isSuper && statusLabel ? (
              showLabel ? (
                <div
                  title={[statusLabel, connected && lastSync ? `Last sync ${lastSync}` : null].filter(Boolean).join(" · ")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 12px",
                    marginBottom: 4,
                    borderRadius: 14,
                    background: colors.panel2,
                    border: `1px solid ${colors.border}`,
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor,
                      boxShadow: connected ? `0 0 6px ${statusColor}` : "none",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: colors.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel}
                    </div>
                    {connected && lastSync ? (
                      <div style={{ color: colors.muted, fontWeight: 500, fontSize: 10, marginTop: 1 }}>
                        Last sync {lastSync}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  title={[statusLabel, connected && lastSync ? `Last sync ${lastSync}` : null].filter(Boolean).join(" · ")}
                  style={{
                    width: 42,
                    height: 32,
                    margin: "0 auto 4px",
                    borderRadius: 10,
                    background: colors.panel2,
                    border: `1px solid ${colors.border}`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor,
                      boxShadow: connected ? `0 0 6px ${statusColor}` : "none",
                    }}
                  />
                </div>
              )
            ) : null}

            {/* Reconnect Google Button (SUPER ADMIN ONLY - ALWAYS SHOWN) */}
            {isSuper && (configured || connected) ? (
              <NavButton
                icon={Link2}
                label={connected ? "Reconnect Google" : "Connect Google"}
                showLabel={showLabel}
                onClick={() => go(onConnectGoogle)}
                title={connected ? "Reconnect Google Sheets OAuth" : "Connect Google Sheets OAuth"}
                tint={colors.wip}
              />
            ) : null}

            {/* Sync Now Button (SUPER ADMIN ONLY) */}
            {canSync && connected ? (
              <NavButton
                icon={RefreshCw}
                label={syncing ? "Syncing…" : "Sync now"}
                showLabel={showLabel}
                onClick={() => onSync?.()}
                disabled={syncing}
                title={syncing ? "Syncing from Sheets…" : "Sync now from Google Sheets"}
                iconClassName={syncing ? "spin" : undefined}
              />
            ) : null}

            {/* Export Backup */}
            {isAdmin ? (
              <NavButton
                icon={Download}
                label="Export"
                showLabel={showLabel}
                onClick={onExport}
                title="Export database backup JSON"
              />
            ) : null}

            {/* Restore Backup (SUPER ADMIN ONLY) */}
            {canImportFullBackup(currentUser) ? (
              <NavButton
                as="label"
                icon={Upload}
                label="Restore Backup"
                showLabel={showLabel}
                title={!showLabel ? "Restore Backup JSON" : undefined}
              >
                <input type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
              </NavButton>
            ) : null}
          </>
        ) : null}

        {/* Section: Preferences & Account */}
        {showLabel ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: colors.muted,
              padding: "8px 10px 4px",
            }}
          >
            Preferences
          </div>
        ) : (
          <div style={{ height: 1, background: colors.border, margin: "6px 8px" }} />
        )}

        {/* Theme Toggle */}
        <NavButton
          icon={mode === "dark" ? Sun : Moon}
          label={mode === "dark" ? "Light Mode" : "Dark Mode"}
          showLabel={showLabel}
          onClick={toggleTheme}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        />

        {/* User Profile & Logout */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {currentUser ? (
            <div
              onClick={() => go(onOpenProfile)}
              title={`${currentUser.name} (${roleLabel(currentUser.role)})`}
              onMouseEnter={() => setUserHovered(true)}
              onMouseLeave={() => setUserHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: showLabel ? "flex-start" : "center",
                padding: showLabel ? "7px 10px" : "6px 0",
                margin: showLabel ? "0" : "0 auto",
                width: showLabel ? "100%" : 42,
                borderRadius: 14,
                cursor: "pointer",
                background: userHovered ? colors.panel2 : "transparent",
                transition: "all 0.16s ease",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9999,
                  background: colors.accentSoft,
                  color: "#16171B",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11.5,
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {String(currentUser.name || "?").slice(0, 1).toUpperCase()}
              </span>
              {showLabel ? (
                <span style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      display: "block",
                      color: colors.text,
                      fontWeight: 700,
                      fontSize: 12.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentUser.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      color: colors.muted,
                      fontWeight: 500,
                      fontSize: 11,
                    }}
                  >
                    {roleLabel(currentUser.role)}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}

          <NavButton
            icon={LogOut}
            label="Logout"
            showLabel={showLabel}
            onClick={onLogout}
            tint={colors.late}
            title="Logout of session"
          />
        </div>
      </aside>
    </div>
  );
}

export { EXPANDED_W, COLLAPSED_W };
