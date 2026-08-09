import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { COLORS } from "../lib/constants";

export default function ChartsSection({ byStack, statusPie, timeline }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>
            Delivery progress by department
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byStack} barSize={26}>
              <CartesianGrid stroke={COLORS.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 11.5 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.muted, fontSize: 11.5 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12.5 }}
                labelStyle={{ color: COLORS.text }}
              />
              <Bar dataKey="delivered" stackId="s" fill={COLORS.delivered} name="Delivered" radius={[0, 0, 0, 0]} />
              <Bar dataKey="wip" stackId="s" fill={COLORS.wip} name="WIP" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>
            Status split
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                {statusPie.map((s, i) => (
                  <Cell key={i} fill={s.color} stroke={COLORS.panel} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12.5 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: COLORS.muted }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>
          Project intake over time
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={timeline}>
            <defs>
              <linearGradient id="intake" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: COLORS.muted, fontSize: 11.5 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12.5 }} />
            <Area type="monotone" dataKey="count" name="New projects" stroke={COLORS.accent} fill="url(#intake)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
