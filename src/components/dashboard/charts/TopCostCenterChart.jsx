import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

import { formatRupiah } from "../../../utils/formatCurrency";

export default function TopCostCenterChart({
  data = [],
  loading = false,
}) {

  const average =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.total, 0) / data.length
      : 0;

  const maxValue =
    data.length > 0
      ? Math.max(...data.map((item) => item.total))
      : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 h-[420px] flex items-center justify-center">
        Memuat data...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" style={{ marginLeft: "20px", marginBottom: "20px" }}>

      <h3 className="text-lg font-semibold text-center mb-5" style={{ marginTop: "10px" }}>
        Top 10 Pengeluaran Cost Center
      </h3>

      {data.length === 0 ? (

        <div className="h-[320px] flex items-center justify-center text-gray-400">
          Belum ada data
        </div>

      ) : (

        <ResponsiveContainer width="100%" height={330}>

          <BarChart
            data={data}
            margin={{
              top: 15,
              right: 15,
              left: 15,
              bottom: 15,
            }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="name"
              angle={-30}
              textAnchor="end"
              interval={0}
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

            {/* <ReferenceLine
              y={average}
              stroke="#ef4444"
              strokeDasharray="5 5"
            /> */}

            <Bar
              dataKey="total"
              radius={[8, 8, 0, 0]}
            >

              {data.map((item, index) => (

                <Cell
                  key={index}
                  fill={
                    item.total === maxValue
                      ? "#899097"
                      : "#c5c3c6"
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