import { fmtMoney } from "../lib/utils";
import { useTheme } from "../lib/theme";

export default function ProfileWorkload({ byProfile }) {
  const { colors, card } = useTheme();
  return (
    <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
      <div className="disp" style={{ fontWeight: 750, fontSize: 15, marginBottom: 12, letterSpacing: -0.2 }}>
        Workload by Fiverr profile
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {byProfile.map((pf) => (
          <div
            key={pf.profile}
            style={{
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: "12px 14px",
              minWidth: 140,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{pf.name}</div>
            <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 3, fontWeight: 500 }}>
              {pf.total} orders · {fmtMoney(pf.value)}
            </div>
            <div style={{ fontSize: 11, color: colors.delivered, marginTop: 3, fontWeight: 650 }}>
              {pf.delivered} delivered
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
