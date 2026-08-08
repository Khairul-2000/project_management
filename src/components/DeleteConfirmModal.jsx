import { COLORS } from "../lib/constants";

export default function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000AA",
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
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: 22,
          width: 340,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this project?</div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 18 }}>This can't be undone.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: COLORS.panel2,
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 9,
              padding: "10px 0",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: COLORS.late,
              color: "#1a0d0d",
              border: "none",
              borderRadius: 9,
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
