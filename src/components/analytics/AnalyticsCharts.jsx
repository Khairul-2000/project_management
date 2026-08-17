import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "../../lib/utils";
import { useTheme } from "../../lib/theme";
import AnalyticsCard from "./AnalyticsCard";

const STATUS_COLORS = ["#1F9D63", "#D9A117", "#E24B4A"];

function useChartStyle() {
  const { colors } = useTheme();
  return {
    colors,
    tooltip: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      color: colors.text,
      fontSize: 12,
      boxShadow: colors.shadowSoft,
    },
    axis: { fill: colors.muted, fontSize: 11 },
  };
}

function ChartTooltip({ active, payload, label, rows }) {
  const { colors, tooltip } = useChartStyle();
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload || {};

  return (
    <div style={{ ...tooltip, padding: "10px 12px", minWidth: 168 }}>
      <div style={{ fontWeight: 750, marginBottom: 8, color: colors.text }}>{label}</div>
      {rows.map(({ key, label: rowLabel, format }) => {
        if (!(key in point)) return null;
        const raw = point[key];
        const display = format ? format(raw) : raw;
        return (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 4,
              color: colors.muted,
              fontSize: 12,
            }}
          >
            <span>{rowLabel}</span>
            <span style={{ fontWeight: 700, color: colors.text }}>{display}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyPerformanceChart({ data }) {
  const { colors, axis } = useChartStyle();
  return (
    <AnalyticsCard title="Monthly intake and value">
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="value"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(n) => `$${Math.round(n / 1000)}k`}
          />
          <YAxis yAxisId="count" orientation="right" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            content={
              <ChartTooltip
                rows={[
                  { key: "projects", label: "Projects" },
                  { key: "value", label: "Intake value", format: fmtMoney },
                ]}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="value" dataKey="value" name="Project value" fill="#4F7CFF" radius={[5, 5, 0, 0]} />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="projects"
            name="Projects"
            stroke={colors.accent}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

export function MonthlyDeliveryChart({ data }) {
  const { colors, axis } = useChartStyle();
  return (
    <AnalyticsCard title="Monthly delivery">
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="value"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(n) => `$${Math.round(n / 1000)}k`}
          />
          <YAxis yAxisId="count" orientation="right" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            content={
              <ChartTooltip
                rows={[
                  { key: "delivered", label: "Projects delivered" },
                  { key: "deliveredValue", label: "Delivery value", format: fmtMoney },
                ]}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="value" dataKey="deliveredValue" name="Delivery value" fill="#1F9D63" radius={[5, 5, 0, 0]} />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="delivered"
            name="Projects delivered"
            stroke={colors.delivered}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

export function ProjectTimelineChart({ data }) {
  const { colors, axis } = useChartStyle();
  return (
    <AnalyticsCard title="Project intake and delivery over time">
      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
          <Tooltip
            content={
              <ChartTooltip
                rows={[
                  { key: "projects", label: "Projects received" },
                  { key: "value", label: "Intake value", format: fmtMoney },
                  { key: "delivered", label: "Projects delivered" },
                  { key: "deliveredValue", label: "Delivery value", format: fmtMoney },
                ]}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="projects"
            name="Projects received"
            stroke="#4F7CFF"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="delivered"
            name="Projects delivered"
            stroke={colors.delivered}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

export function StatusChart({ data }) {
  const { colors, tooltip } = useChartStyle();
  return (
    <AnalyticsCard title="Workflow status">
      <ResponsiveContainer width="100%" height={270}>
        <PieChart>
          <Pie data={data.filter((item) => item.value)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3}>
            {data.map((item, index) => (
              <Cell key={item.name} fill={STATUS_COLORS[index]} stroke={colors.panel} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

export function RankedValueChart({ title, data, limit = 8 }) {
  const { colors, tooltip, axis } = useChartStyle();
  const rows = data.slice(0, limit).map((row) => ({
    ...row,
    label: row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name,
  }));
  return (
    <AnalyticsCard title={title}>
      <ResponsiveContainer width="100%" height={Math.max(230, rows.length * 34)}>
        <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 18 }}>
          <CartesianGrid stroke={colors.border} horizontal={false} />
          <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(n) => `$${Math.round(n / 1000)}k`} />
          <YAxis type="category" dataKey="label" width={125} tick={axis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltip} formatter={(value) => [fmtMoney(value), "Project value"]} />
          <Bar dataKey="value" fill="#2BB8BE" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}
