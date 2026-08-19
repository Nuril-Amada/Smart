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

export default function CostCenterChart({
  data = [],
  costCenter = null,
  loading = false,
}) {

  // ==========================
  // Data (Tertinggi → Terendah)
  // ==========================

  const chartData = data;

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
  // Nilai Terbesar
  // ==========================

  const maxValue =
    chartData.length > 0
      ? Math.max(
        ...chartData.map(
          (item) => item.total_amount
        )
      )
      : 0;
  const totalExpense = chartData.reduce(
    (sum, item) => sum + item.total_amount,
    0
  );
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 h-[500px] flex items-center justify-center">
        Memuat data...
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      style={{
        marginRight: "20px",
        marginBottom: "20px",
      }}
    >
      <h3
        className="text-lg font-semibold text-center mb-5"
        style={{ marginTop: "10px" }}
      >
        Highest Cost Center Detail
      </h3>

      <p className="text-sm font-normal text-gray-600 text-center mb-2" style={{ marginTop: "5px" }}>
        Cost Center : {costCenter || "-"}
      </p>

      {chartData.length === 0 ? (

        <div className="h-[420px] flex items-center justify-center text-gray-400">
          Belum ada data
        </div>

      ) : (

        <ResponsiveContainer
          width="100%"
          height={450}
        >

          <BarChart
            layout="vertical"
            data={chartData}
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
              dataKey="gl_name"
              width={170}
              tick={{
                fontSize: 11,
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {

                if (!active || !payload?.length) return null;

                const value = payload[0].value;

                const percentage =
                  totalExpense > 0
                    ? ((value / totalExpense) * 100).toFixed(2)
                    : 0;

                return (
                  <div className="bg-white border border-gray-300 rounded-lg shadow-md p-3" style={{ margin: "10px", padding: "10px" }}>

                    <p className="font-medium text-[14px] text-gray-700">
                      GL Account : {label}
                    </p>

                    <p className="text-gray-600 text-[14px]">
                      Expense : {formatRupiah(value)}
                    </p>

                    <p className="text-gray-600 text-[14px]">
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
                value: "Average",
                position: "insideTopRight",
                fill: "#ef4444",
                fontSize: 12,
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