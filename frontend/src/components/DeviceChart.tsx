import { PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444"];

export function DeviceChart({
    data
}: {
    data: { type: string; count: number }[];
}) {
    if (data.length === 0) {
        return <div className="text-sm">No device data</div>;
    }

    return (
        <PieChart width={300} height={200}>
            <Pie
                data={data}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
            >
                {data.map((_, index) => (
                    <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                    />
                ))}
            </Pie>
            <Tooltip />
        </PieChart>
    );
}