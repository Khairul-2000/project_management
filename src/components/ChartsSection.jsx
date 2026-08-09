import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useTheme } from "../lib/theme";

export default function ChartsSection({ byStack, statusPie, timeline }) {
  const { colors, card } = useTheme();
  const tooltipStyle = {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    fontSize: 12.5,
    boxShadow: colors.shadowSoft,
    color: colors.text,
  };

  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 16 }}
        className="charts-grid"
      >
        <div style={{ ...card, padding: "16px 18px" }}>
          <div className="disp" style={{ fontWeight: 750, fontSize: 15, marginBottom: 10, letterSpacing: -0.2 }}>
            Delivery progress by department
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={byStack} barSize={22}>
              <CartesianGrid stroke={colors.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={{ stroke: colors.border }} tickLine={false} />
              <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.text }} />
              <Bar dataKey="delivered" stackId="s" fill={colors.delivered} name="Delivered" radius={[0, 0, 0, 0]} />
              <Bar dataKey="wip" stackId="s" fill={colors.wip} name="WIP" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...card, padding: "16px 18px" }}>
          <div className="disp" style={{ fontWeight: 750, fontSize: 15, marginBottom: 10, letterSpacing: -0.2 }}>
            Status split
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                {statusPie.map((s, i) => (
                  <Cell key={i} fill={s.color} stroke={colors.panel} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: colors.muted }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <div className="disp" style={{ fontWeight: 750, fontSize: 15, marginBottom: 10, letterSpacing: -0.2 }}>
          Project intake over time
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={timeline}>
            <defs>
              <linearGradient id="intake" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accentSoft} stopOpacity={0.55} />
                <stop offset="100%" stopColor={colors.accentSoft} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.border} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={{ stroke: colors.border }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="count" name="New projects" stroke={colors.accent} fill="url(#intake)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
