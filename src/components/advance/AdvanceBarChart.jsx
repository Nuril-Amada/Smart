import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
} from "recharts";

const data = [
    {
        request: "ADV-001",
        overdue: 5,
    },
    {
        request: "ADV-008",
        overdue: 4,
    },
    {
        request: "ADV-014",
        overdue: 3,
    },
    {
        request: "ADV-020",
        overdue: 2,
    },
];

const COLORS = [
    "#EF4444",
    "#F97316",
    "#F59E0B",
    "#FACC15",
];

export default function AdvanceBarChart() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            <h2 className="text-lg font-semibold text-gray-700 mb-5">
                Overdue Advance
            </h2>

            <div className="h-72">

                <ResponsiveContainer width="100%" height="100%">

                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{
                            top: 5,
                            right: 20,
                            left: 20,
                            bottom: 5,
                        }}
                    >

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            type="number"
                            allowDecimals={false}
                        />

                        <YAxis
                            type="category"
                            dataKey="request"
                        />

                        <Tooltip />

                        <Bar
                            dataKey="overdue"
                            radius={[0, 8, 8, 0]}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={COLORS[index]}
                                />
                            ))}
                        </Bar>

                    </BarChart>

                </ResponsiveContainer>

            </div>

        </div>
    );
}