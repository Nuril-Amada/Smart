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

export default function CostCenterChart({ data = [] }) {

  const average =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.total, 0) / data.length
      : 0;

  const maxValue =
    data.length > 0
      ? Math.max(...data.map((item) => item.total))
      : 0;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      style={{ marginRight: "20px", marginBottom: "20px" }}
    >
      <h3 className="text-lg font-semibold text-gray-700 text-center" style={{ marginTop: "10px" }}>
        Pengeluaran Cost Center Tertinggi
      </h3>

      <p className="text-sm font-normal text-gray-600 text-center mb-2" style={{ marginTop: "5px" }}>
        Jumlah Pengeluaran: {formatRupiah(maxValue)}
      </p>

      {data.length === 0 ? (

        <div className="h-[320px] flex items-center justify-center text-gray-400">

          Belum ada data

        </div>

      ) : (

        <ResponsiveContainer width="100%" height={320}>

          <BarChart
            data={data}
            margin={{
              left: 15,
              right: 15,
              bottom: 15,
              top: 15,
            }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
            />

            <YAxis
              tickFormatter={(value) => `${value / 1000000}M`}
              tick={{ fontSize: 12 }}
            />

            <Tooltip
              formatter={(value) => formatRupiah(value)}
            />

            {/* <ReferenceLine
              y={average}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 3"
            /> */}

            <Bar
              dataKey="total"
              radius={[8, 8, 0, 0]}
            >

              {data.map((entry, index) => (

                <Cell
                  key={index}
                  fill={
                    entry.total === maxValue
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