import { STACK_COLOR } from "../lib/constants";
import { fmtMoney } from "../lib/utils";
import { useTheme } from "../lib/theme";
import RadialGauge from "./RadialGauge";

export default function StackWorkload({ byStack }) {
  const { colors, card } = useTheme();
  return (
    <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
      <div className="disp" style={{ fontWeight: 750, fontSize: 15, marginBottom: 12, letterSpacing: -0.2 }}>
        Workload by department
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {byStack.length === 0 ? (
          <div style={{ color: colors.muted, fontSize: 13, padding: "8px 0" }}>
            No active workloads for the selected timeframe.
          </div>
        ) : (
          byStack.map((d) => (
            <div
              key={d.stack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 200,
                background: colors.panel2,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: "10px 12px",
              }}
            >
              <div style={{ position: "relative", width: 68, height: 68 }}>
                <RadialGauge percent={d.pct} color={STACK_COLOR[d.stack]} size={68} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="disp" style={{ fontSize: 14, fontWeight: 800 }}>
                    {d.pct}%
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: STACK_COLOR[d.stack], display: "inline-block" }} />
                  {d.name}
                </div>
                <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 3, fontWeight: 500 }}>
                  {d.total} orders · {fmtMoney(d.value)}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: colors.delivered, fontWeight: 650 }}>{d.delivered} delivered</span>
                  <span style={{ fontSize: 11, color: colors.wip, fontWeight: 650 }}>{d.wip} WIP</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
