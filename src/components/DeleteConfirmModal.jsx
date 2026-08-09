import { useTheme } from "../lib/theme";

export default function DeleteConfirmModal({ onCancel, onConfirm }) {
  const { colors } = useTheme();
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
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 24,
          width: 340,
          boxShadow: colors.shadow,
          color: colors.text,
        }}
      >
        <div className="disp" style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
          Delete this project?
        </div>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
          This can't be undone.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: colors.panel2,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "10px 0",
              fontWeight: 650,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: colors.late,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 0",
              fontWeight: 700,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
