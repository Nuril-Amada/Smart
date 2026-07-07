import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

import { formatRupiah } from "../../../utils/formatCurrency";

export default function GLAccountChart({ data = [] }) {

  // Hitung rata-rata
  const average =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.total, 0) / data.length
      : 0;

  // Cari nilai terbesar
  const maxValue =
    data.length > 0
      ? Math.max(...data.map((item) => item.total))
      : 0;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      style={{ marginLeft: "20px", marginBottom: "20px" }}
    >
      <h3 className="text-lg font-semibold text-gray-700 text-center mb-5">
        Top 10 Pengeluaran GL Account
      </h3>

      {data.length === 0 ? (

        <div className="h-[320px] flex items-center justify-center text-gray-400">
          Belum ada data
        </div>

      ) : (

        <ResponsiveContainer width="100%" height={320}>

          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 20,
              bottom: 10,
            }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
            />

            <YAxis
              tickFormatter={(value) =>
                `${(value / 1000000).toFixed(0)}M`
              }
              tick={{ fontSize: 11 }}
            />

            <Tooltip
              formatter={(value) => formatRupiah(value)}
            />

            <ReferenceLine
              y={average}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
            />

            <Bar
              dataKey="total"
              radius={[8, 8, 0, 0]}
            >

              {data.map((item, index) => (

                <Cell
                  key={index}
                  fill={
                    item.total === maxValue
                      ? "#1d4ed8"
                      : "#60a5fa"
                  }
                />

              ))}

            </Bar>

          </BarChart>

        </ResponsiveContainer>

      )}

    </div>
  );
}