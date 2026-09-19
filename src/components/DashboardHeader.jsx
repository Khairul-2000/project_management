import { Plus, Menu, ChevronsLeft, ChevronsRight, UserCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";
import { roleLabel } from "../lib/roles";

export default function DashboardHeader({
  title,
  saveState,
  canWriteDb,
  currentUser,
  isAdmin,
  showNewProject,
  collapsed,
  isMobile,
  mobileOpen,
  onToggleSidebar,
  onAdd,
  memberOnlyView = false,
  onToggleMemberOnlyView,
  activeView = "dashboard",
  onNavigate,
}) {
  const { colors, mode, toggleTheme } = useTheme();
  const warn = Boolean(saveState && (saveState.includes("fail") || saveState.includes("Read-only")));
  const subtitle = saveState
    ? saveState
    : currentUser
      ? `Signed in as ${currentUser.name}`
      : "Client Workspace";

  let ToggleIcon = Menu;
  let toggleTitle = "Open menu";
  if (!isMobile) {
    ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
    toggleTitle = collapsed ? "Expand sidebar" : "Collapse sidebar";
  } else if (mobileOpen) {
    toggleTitle = "Close menu";
  }

  // Navigation tabs matching the Crextio floating pill nav
  const navTabs = [
    ...(isAdmin ? [{ key: "dashboard", label: "Dashboard" }] : []),
    { key: "clientProjects", label: "Projects" },
    ...(isAdmin ? [{ key: "analytics", label: "Analytics" }] : []),
    ...(isAdmin ? [{ key: "users", label: "Users" }] : []),
    { key: "profile", label: "Profile" },
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "12px 24px",
        background: "transparent",
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* Left: Brand Pill Capsule + Mobile Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          title={toggleTitle}
          aria-label={toggleTitle}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            flexShrink: 0,
            background: colors.panel,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 9999,
            cursor: "pointer",
            boxShadow: colors.shadowSoft,
          }}
        >
          <ToggleIcon size={15} />
        </button>

        {/* Brand Pill Capsule matching Crextio reference */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 16px",
            borderRadius: 9999,
            border: `1.5px solid ${colors.text}`,
            background: colors.panel,
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: -0.3,
            color: colors.text,
            boxShadow: colors.shadowSoft,
          }}
        >
          Crextio
        </div>
      </div>

      {/* Center: Floating Pill Navigation Tabs */}
      {onNavigate && !isMobile ? (
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: 9999,
            padding: "4px 5px",
            gap: 2,
            boxShadow: colors.shadowSoft,
          }}
        >
          {navTabs.map((tab) => {
            const isActive =
              activeView === tab.key ||
              (tab.key === "clientProjects" && (activeView === "clientProjectDetail" || (!isAdmin && activeView === "dashboard")));
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onNavigate(tab.key)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 9999,
                  border: "none",
                  background: isActive ? (colors.accent || "#1A1B20") : "transparent",
                  color: isActive ? "#FFFFFF" : colors.muted,
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      {/* Right Action Pills: Member View Toggle, New Project, Theme, Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Member filter toggle (My Projects vs All Projects) */}
        {!isAdmin && onToggleMemberOnlyView ? (
          <button
            type="button"
            onClick={onToggleMemberOnlyView}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 9999,
              border: `1px solid ${memberOnlyView ? (colors.accentSoft || "#F7CE46") : colors.border}`,
              background: memberOnlyView ? (colors.accentSoft || "#F7CE46") : colors.panel,
              color: memberOnlyView ? "#1A1B20" : colors.text,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: colors.shadowSoft,
            }}
          >
            <UserCheck size={13} strokeWidth={2.2} />
            {memberOnlyView ? "My Assigned Projects" : "All Projects"}
          </button>
        ) : null}

        {/* New Project Button */}
        {showNewProject ? (
          <button
            type="button"
            onClick={onAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: colors.accent || "#1A1B20",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 9999,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              boxShadow: colors.shadowSoft,
              flexShrink: 0,
            }}
          >
            <Plus size={15} strokeWidth={2.5} /> New project
          </button>
        ) : null}

        {/* Theme Toggle Circular Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: colors.shadowSoft,
          }}
        >
          {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User Profile Avatar */}
        {currentUser ? (
          <div
            onClick={() => onNavigate?.("profile")}
            title={`${currentUser.name} (${roleLabel(currentUser.role)})`}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: colors.panel2,
              border: `1.5px solid ${colors.border}`,
              display: "grid",
              placeItems: "center",
              color: colors.text,
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: colors.shadowSoft,
            }}
          >
            {String(currentUser.name || "?").slice(0, 1).toUpperCase()}
          </div>
        ) : null}
      </div>
    </header>
  );
}
