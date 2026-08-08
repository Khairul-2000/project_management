import { COLORS } from "../lib/constants";
import { fmtMoney } from "../lib/utils";

export default function ProfileWorkload({ byProfile }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
      <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
        Workload by Fiverr profile
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        {byProfile.map((pf) => (
          <div
            key={pf.profile}
            style={{
              background: COLORS.panel2,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "10px 14px",
              minWidth: 150,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{pf.name}</div>
            <div className="mono" style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>
              {pf.total} orders · {fmtMoney(pf.value)}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: COLORS.delivered, marginTop: 2 }}>
              {pf.delivered} delivered
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
