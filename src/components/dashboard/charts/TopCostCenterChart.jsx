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
  totalExpense = 0,
  loading = false,
}) {

  // ==========================
  // Top 10 Cost Center
  // ==========================

  const chartData = [...data]
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 10);

  // ==========================
  // Average
  // ==========================

  const average =
    chartData.length > 0
      ? chartData.reduce(
        (sum, item) => sum + item.total_amount,
        0
      ) / chartData.length
      : 0;

  // ==========================
  // Max Value
  const maxValue =
    chartData.length > 0
      ? Math.max(
        ...chartData.map(item => item.total_amount)
      )
      : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 h-[520px] flex items-center justify-center">
        Memuat data...
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      style={{
        marginLeft: "20px",
        marginBottom: "20px",
      }}
    >
      <h3
        className="text-lg font-semibold text-center mb-5"
        style={{ marginTop: "10px" }}
      >
        Top 10 Expense By Cost Center
      </h3>

      {chartData.length === 0 ? (

        <div className="h-[420px] flex items-center justify-center text-gray-400">
          Belum ada data
        </div>

      ) : (

        <ResponsiveContainer
          width="100%"
          height={430}
        >

          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 40,
              left: 10,
              bottom: 10,
            }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              type="number"
              tickFormatter={(value) =>
                `${(value / 1000000).toFixed(0)} Juta`
              }
              tick={{
                fontSize: 11,
              }}
            />

            <YAxis
              type="category"
              dataKey="cost_center"
              width={110}
              tick={{
                fontSize: 11,
              }}
            />

            <Tooltip
              allowEscapeViewBox={{ x: false, y: false }}
              offset={10}
              wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
              content={({ active, payload, label }) => {

                if (!active || !payload?.length) return null;

                const value = Number(payload[0].value);

                const percentage =
                  totalExpense > 0
                    ? ((value / totalExpense) * 100).toFixed(2)
                    : "0.00";

                return (
                  <div
                    className="bg-white border border-gray-300 rounded-lg shadow-md"
                    style={{
                      margin: "10px",
                      padding: "10px",
                      maxWidth: "260px",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                    }}
                  >

                    <p className="font-medium text-[14px] text-gray-700">
                      Cost Center : {label}
                    </p>

                    <p className="text-gray-600 mt-1 text-[14px]">
                      Expense : {formatRupiah(value)}
                    </p>

                    <p className="text-gray-600 mt-1 text-[14px]">
                      Persentase : {percentage}%
                    </p>

                  </div>
                );

              }}
            />

            {/* <ReferenceLine
              x={average}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: "Avg",
                position: "top",
                fill: "#ef4444",
              }}
            /> */}

            <Bar
              dataKey="total_amount"
              radius={[0, 8, 8, 0]}
            >

              {chartData.map((item, index) => (

                <Cell
                  key={index}
                  fill={
                    item.total_amount === maxValue
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