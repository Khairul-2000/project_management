import { useRef } from "react";
import { Search, X, Download, Upload } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function ProjectSearch({
  value,
  onChange,
  resultCount,
  onExportCsv,
  onImportCsv,
}) {
  const { colors, card } = useTheme();
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string" && onImportCsv) {
        onImportCsv(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          ...card,
          flex: 1,
          minWidth: 240,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: 9999,
        }}
      >
        <Search size={15} color={colors.muted} />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search project, order ID, sales, team, profile, phase…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: colors.text,
            fontSize: 13,
            minWidth: 0,
            fontWeight: 500,
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Clear search"
            style={{
              display: "flex",
              alignItems: "center",
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: colors.muted,
              padding: 3,
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {value ? (
        <span style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>
          {resultCount} match{resultCount === 1 ? "" : "es"}
        </span>
      ) : null}

      {/* CSV Export and Import quick actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {onExportCsv ? (
          <button
            type="button"
            onClick={onExportCsv}
            title="Export filtered projects to CSV spreadsheet"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 9999,
              border: `1px solid ${colors.border}`,
              background: colors.panel,
              color: colors.text,
              fontSize: 12,
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <Download size={13} /> Export CSV
          </button>
        ) : null}

        {onImportCsv ? (
          <>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Import projects from CSV spreadsheet"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 9999,
                border: `1px solid ${colors.border}`,
                background: colors.panel,
                color: colors.text,
                fontSize: 12,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Upload size={13} /> Import CSV
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
