import { COLORS, MONTHS } from "../lib/constants";

export default function CalendarFilter({
  availableYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  mode = "date",
}) {
  const bySheetTab = mode === "sheetTab";

  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "12px 18px",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {bySheetTab && (
        <div className="mono" style={{ fontSize: 11.5, color: COLORS.muted }}>
          Viewing by sheet tab (STA Month Year) — same grouping as Google Sheets
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Year:
        </span>
        <div style={{ display: "flex", background: COLORS.panel2, borderRadius: 8, padding: 3, border: `1px solid ${COLORS.border}` }}>
          {["All", ...availableYears].map((yr) => (
            <button
              key={yr}
              onClick={() => onYearChange(yr === "All" ? "All" : Number(yr))}
              style={{
                background: selectedYear === yr ? COLORS.accent : "transparent",
                color: selectedYear === yr ? "#0D1117" : COLORS.muted,
                border: "none",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end", minWidth: 280 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Month:
        </span>
        <div
          className="month-scroll"
          style={{
            display: "flex",
            background: COLORS.panel2,
            borderRadius: 8,
            padding: 3,
            border: `1px solid ${COLORS.border}`,
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          <button
            onClick={() => onMonthChange("All")}
            style={{
              background: selectedMonth === "All" ? COLORS.accent : "transparent",
              color: selectedMonth === "All" ? "#0D1117" : COLORS.muted,
              border: "none",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            All
          </button>
          {MONTHS.map((m, idx) => {
            const monthNum = idx + 1;
            const isSelected = selectedMonth === monthNum;
            return (
              <button
                key={m}
                onClick={() => onMonthChange(monthNum)}
                style={{
                  background: isSelected ? COLORS.accent : "transparent",
                  color: isSelected ? "#0D1117" : COLORS.muted,
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
