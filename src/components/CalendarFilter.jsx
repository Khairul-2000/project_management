import { MONTHS } from "../lib/constants";
import { useTheme } from "../lib/theme";

export default function CalendarFilter({
  availableYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  mode = "date",
}) {
  const { colors, card } = useTheme();
  const bySheetTab = mode === "sheetTab";

  function segBtn(active) {
    return {
      background: active ? colors.accent : "transparent",
      color: active ? colors.onAccent : colors.muted,
      border: "none",
      borderRadius: 10,
      padding: "6px 11px",
      fontSize: 12.5,
      fontWeight: 650,
      cursor: "pointer",
      transition: "all 0.15s ease",
      whiteSpace: "nowrap",
    };
  }

  return (
    <div style={{ ...card, padding: "14px 16px", marginBottom: 16 }}>
      {bySheetTab && (
        <div style={{ fontSize: 12, color: colors.muted, marginBottom: 10, fontWeight: 500 }}>
          Viewing by sheet tab (STA Month Year) — same grouping as Google Sheets
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Year
          </span>
          <div
            style={{
              display: "flex",
              background: colors.panel2,
              borderRadius: 12,
              padding: 4,
              border: `1px solid ${colors.border}`,
            }}
          >
            {["All", ...availableYears].map((yr) => (
              <button
                key={yr}
                onClick={() => onYearChange(yr === "All" ? "All" : Number(yr))}
                style={segBtn(selectedYear === yr)}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end", minWidth: 260 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Month
          </span>
          <div
            className="month-scroll"
            style={{
              display: "flex",
              background: colors.panel2,
              borderRadius: 12,
              padding: 4,
              border: `1px solid ${colors.border}`,
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            <button onClick={() => onMonthChange("All")} style={segBtn(selectedMonth === "All")}>
              All
            </button>
            {MONTHS.map((m, idx) => {
              const monthNum = idx + 1;
              return (
                <button key={m} onClick={() => onMonthChange(monthNum)} style={segBtn(selectedMonth === monthNum)}>
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
