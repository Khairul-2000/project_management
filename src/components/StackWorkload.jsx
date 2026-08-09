import { COLORS, STACK_COLOR } from "../lib/constants";
import { fmtMoney } from "../lib/utils";
import RadialGauge from "./RadialGauge";

export default function StackWorkload({ byStack }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
      <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
        Workload by department (stack)
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
        {byStack.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13, padding: "12px 0" }}>
            No active workloads for the selected timeframe.
          </div>
        ) : (
          byStack.map((d) => (
            <div key={d.stack} style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 210 }}>
              <div style={{ position: "relative", width: 84, height: 84 }}>
                <RadialGauge percent={d.pct} color={STACK_COLOR[d.stack]} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>
                    {d.pct}%
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: STACK_COLOR[d.stack], display: "inline-block" }} />
                  {d.name}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 3 }}>
                  {d.total} orders · {fmtMoney(d.value)}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: COLORS.delivered }}>{d.delivered} delivered</span>
                  <span className="mono" style={{ fontSize: 10.5, color: COLORS.wip }}>{d.wip} WIP</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
