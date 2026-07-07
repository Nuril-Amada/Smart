import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

const data = [
  { month: "Jan", total: 25 },
  { month: "Feb", total: 20 },
  { month: "Mar", total: 15 },
  { month: "Apr", total: 30 },
  { month: "Mei", total: 28 },
  { month: "Jun", total: 35 },
];

export default function SettlementBarChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-700 mb-5">
        Settlement Trend (6 Bulan)
      </h2>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="month" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="total"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}