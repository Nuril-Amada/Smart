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

export default function GLAccountChart({
  data = [],
  totalExpense = 0,
}) {
  // ==========================
  // Average
  // ==========================

  const average =
    data.length > 0
      ? data.reduce(
        (sum, item) => sum + item.total_amount,
        0
      ) / data.length
      : 0;

  // Maximum Value
  const maxValue =
    data.length > 0
      ? Math.max(
        ...data.map((item) => item.total_amount)
      )
      : 0;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      style={{
        marginLeft: "20px",
        marginBottom: "20px",
      }}
    >
      <h3
        className="text-lg font-semibold text-gray-700 text-center mb-5"
        style={{ marginTop: "10px" }}
      >
        Top 10 Expense By GL Account
      </h3>

      {data.length === 0 ? (
        <div className="h-[360px] flex items-center justify-center text-gray-400">
          Belum ada data
        </div>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={360}
        >
          <BarChart
            layout="vertical"
            data={data}
            margin={{
              top: 20,
              right: 40,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            {/* Sumbu X (Nominal) */}
            <XAxis
              type="number"
              tickFormatter={(value) =>
                `${(value / 1000000).toFixed(0)} Juta`
              }
              tick={{
                fontSize: 11,
              }}
            />

            {/* Sumbu Y (Nama GL) */}
            <YAxis
              type="category"
              dataKey="gl_name"
              width={180}
              tick={{
                fontSize: 11,
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {

                if (!active || !payload?.length) return null;

                const value = Number(payload[0].value);

                const percentage =
                  totalExpense > 0
                    ? ((value / totalExpense) * 100).toFixed(2)
                    : "0.00";

                return (
                  <div className="bg-white border border-gray-300 rounded-lg shadow-md p-3" style={{ margin: "10px", padding: "10px" }}>

                    <p className="font-medium text-gray-700 text-[14px]">
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

            {/* Average */}
            {/* <ReferenceLine
              x={average}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: "Average",
                position: "top",
                fill: "#ef4444",
                fontSize: 12,
              }}
            /> */}

            {/* Bar */}
            <Bar
              dataKey="total_amount"
              radius={[0, 8, 8, 0]}
            >
              {data.map((item, index) => (
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