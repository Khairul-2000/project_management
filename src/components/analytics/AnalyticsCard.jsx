import { useTheme } from "../../lib/theme";

export default function AnalyticsCard({ title, children, action }) {
  const { colors, card } = useTheme();
  return (
    <section style={{ ...card, padding: "18px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <h2 className="disp" style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: -0.2, color: colors.text }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
