import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { COLORS } from "../lib/constants";

export default function StatusBadge({ status }) {
  const map = {
    delivered: { c: COLORS.delivered, l: "Delivered", Icon: CheckCircle2 },
    wip: { c: COLORS.wip, l: "In progress", Icon: Clock3 },
    late: { c: COLORS.late, l: "Late", Icon: AlertTriangle },
  };
  const { c, l, Icon } = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: c,
        background: c + "1A",
        border: `1px solid ${c}44`,
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Icon size={12} strokeWidth={2.5} /> {l}
    </span>
  );
}
