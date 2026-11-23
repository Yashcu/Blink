import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface DeviceData {
  type: string;
  count: number;
}

/* Chart colors from design system --chart-1 through --chart-5 CSS variables
   Lead series (chart-1) is the accent cyan, others are muted supporting hues */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function DeviceChart({ data }: { data: DeviceData[] }) {
  const chartData = data.map((d) => ({
    name: d.type || "Unknown",
    value: d.count,
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={80}
          paddingAngle={4}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--popover-foreground)",
            fontSize: "12px",
            fontFamily: "inherit",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
            value ?? 0,
            `${name ?? "Unknown"} — ${total > 0 && typeof value === "number" ? ((value / total) * 100).toFixed(1) : 0}%`,
          ]}
          labelStyle={{ color: "var(--muted-foreground)", fontWeight: 500 }}
        />
        <Legend
          verticalAlign="bottom"
          height={40}
          formatter={(value) => (
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}