import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatRupiah } from "../../../utils/formatCurrency";

const AverageLabel = ({ viewBox, average }) => {
  const { x, y, width } = viewBox;

  // Geser label ke dalam area chart
  const labelX = x + width - 80;

  return (
    <g>
      <text
        x={labelX}
        y={y - 6}
        fill="#ef4444"
        fontSize="13"
        fontWeight="600"
      >
        Average
      </text>

      <text
        x={labelX}
        y={y + 12}
        fill="#ef4444"
        fontSize="11"
      >
        {formatRupiah(average)}
      </text>
    </g>
  );
};

export default function TrendChart({
  data = [],
  loading = false,
  filterPeriod,
  onChangePeriod,
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

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 h-[500px] flex items-center justify-center">
        Memuat data...
      </div>
    );
  }

  return (

    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative"
      style={{
        marginRight: "20px",
        marginBottom: "20px",
      }}
    >

      {/* ==========================
          Header
      ========================== */}

      <div className="mb-5">

        <h3
          className="text-lg font-semibold text-center"
          style={{ marginTop: "10px" }}
        >
          Expenses Trend
        </h3>

        <div
          className="flex justify-end"
          style={{
            marginTop: "12px",
            paddingRight: "22px",
          }}
        >

          <select
            value={filterPeriod}
            onChange={(e) =>
              onChangePeriod(e.target.value)
            }
            className="
              border
              border-gray-300
              rounded-md
              px-2
              py-1
              text-sm
            "
          >
            <option value="day">Hari</option>
            <option value="month">Bulan</option>
            <option value="year">Tahun</option>
          </select>

        </div>

      </div>

      {/* ==========================
          Chart
      ========================== */}

      <ResponsiveContainer
        width="100%"
        height={330}
      >

        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 40,
            left: 10,
            bottom: 10,
          }}
        >

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="period"
            tick={{
              fontSize: 12,
            }}
          />

          <YAxis
            tickFormatter={(value) =>
              `${(value / 1000000).toFixed(0)} Juta`
            }
            tick={{
              fontSize: 12,
            }}
          />

          <Tooltip
            allowEscapeViewBox={{ x: false, y: false }}
            offset={10}
            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;

              const value = Number(payload[0].value);

              const totalTrendExpense =
                totalExpense > 0
                  ? totalExpense
                  : data.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

              const percentage =
                totalTrendExpense > 0
                  ? ((value / totalTrendExpense) * 100).toFixed(2)
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
                    Periode : {label}
                  </p>

                  <p className="text-gray-600 mt-1 text-[14px]">
                    Expense : {formatRupiah(value)}
                  </p>
                </div>
              );
            }}
          />

          {/* Average */}

          <ReferenceLine
            y={average}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 6"
            label={
              <AverageLabel
                average={average}
              />
            }
          />

          {/* Trend */}

          <Line
            type="monotone"
            dataKey="total_amount"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

        </LineChart>

      </ResponsiveContainer>
    </div>

  );
}