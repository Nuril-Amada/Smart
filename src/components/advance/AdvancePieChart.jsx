import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const data = [
    {
        name: "Settled",
        value: 114,
    },
    {
        name: "Waiting",
        value: 8,
    },
    {
        name: "Overdue",
        value: 3,
    },
];

const COLORS = [
    "#3B82F6",
    "#38BDF8",
    "#F59E0B",
];

export default function AdvancePieChart() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            {/* Header */}

            <h2 className="text-lg font-semibold text-gray-700 mb-5">
                Status Advance
            </h2>

            <div className="h-72">

                <ResponsiveContainer width="100%" height="100%">

                    <PieChart>

                        <Pie
                            data={data}
                            cx="40%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                            paddingAngle={2}
                        >

                            {data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={COLORS[index]}
                                />
                            ))}

                        </Pie>

                        <Tooltip />

                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                        />

                    </PieChart>

                </ResponsiveContainer>

            </div>

        </div>
    );
}