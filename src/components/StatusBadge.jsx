import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function StatusBadge({ status, compact = false }) {
  const { colors } = useTheme();
  const map = {
    delivered: { c: colors.delivered, l: "Delivered", short: "Done", Icon: CheckCircle2, bg: "rgba(31, 157, 99, 0.14)" },
    wip: { c: colors.wip, l: "WIP", short: "WIP", Icon: Clock3, bg: "rgba(217, 161, 23, 0.16)" },
    late: { c: colors.late, l: "Late", short: "Late", Icon: AlertTriangle, bg: "rgba(226, 75, 74, 0.14)" },
  };
  const { c, l, short, Icon, bg } = map[status] || map.wip;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 3 : 5,
        color: c,
        background: bg,
        border: `1px solid ${c}33`,
        borderRadius: compact ? 8 : 10,
        padding: compact ? "2px 6px" : "4px 9px",
        fontSize: compact ? 10.5 : 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
      title={l}
    >
      <Icon size={compact ? 11 : 12} strokeWidth={2.5} /> {compact ? short : l}
    </span>
  );
}
