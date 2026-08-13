import { Plus, Menu, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTheme } from "../lib/theme";

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
}) {
  const { colors } = useTheme();
  const warn = Boolean(saveState && (saveState.includes("fail") || saveState.includes("Read-only")));
  const subtitle = saveState
    ? saveState
    : currentUser
      ? `Signed in as ${currentUser.name} (${currentUser.role})`
      : `DB: projects.json${canWriteDb ? " · writable" : " · read-only"}`;

  let ToggleIcon = Menu;
  let toggleTitle = "Open menu";
  if (!isMobile) {
    ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
    toggleTitle = collapsed ? "Expand sidebar" : "Collapse sidebar";
  } else if (mobileOpen) {
    toggleTitle = "Close menu";
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        padding: "12px 20px",
        borderBottom: `1px solid ${colors.border}`,
        background: colors.panel,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
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
            background: colors.panel2,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
          }}
        >
          <ToggleIcon size={16} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1
            className="disp"
            style={{
              fontSize: 18,
              fontWeight: 800,
              margin: 0,
              letterSpacing: -0.3,
              color: colors.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </h1>
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              color: warn ? colors.wip : colors.muted,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      {isAdmin && showNewProject ? (
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: colors.accent,
            color: colors.onAccent,
            border: "none",
            borderRadius: 12,
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: 13.5,
            boxShadow: colors.shadowSoft,
            flexShrink: 0,
          }}
        >
          <Plus size={16} strokeWidth={2.5} /> New project
        </button>
      ) : null}
    </div>
  );
}
