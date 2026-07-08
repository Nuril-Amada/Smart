import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// ======================================================================
// DUMMY DATA — GANTI BAGIAN INI SAJA NANTI KALAU BACKEND SUDAH SIAP.
//
// Contoh nanti tinggal ganti isi function ini jadi:
//
//   async function fetchTrendData() {
//     const res = await fetch(`${API_BASE_URL}/api/settlement/trend`);
//     if (!res.ok) throw new Error("Gagal mengambil data");
//     return res.json();
//   }
//
// Format response yang diharapkan dari FastAPI:
// [
//   { "month": "Jan", "value": 65 },
//   { "month": "Feb", "value": 90 },
//   ...
// ]
// ======================================================================
async function fetchTrendData() {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
        { month: "Jan", value: 65 },
        { month: "Feb", value: 95 },
        { month: "Mar", value: 140 },
        { month: "Apr", value: 170 },
        { month: "May", value: 185 },
        { month: "Jun", value: 150 },
        { month: "Jul", value: 120 },
        { month: "Aug", value: 100 },
        { month: "Sep", value: 90 },
        { month: "Oct", value: 75 },
        { month: "Nov", value: 80 },
        { month: "Dec", value: 120 },
    ];
}

function ChartSkeleton() {
    return (
        <div className="h-72 flex items-end gap-3 px-2 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    className="flex-1 bg-gray-200 rounded-t"
                    style={{ height: `${30 + ((i * 13) % 70)}%` }}
                />
            ))}
        </div>
    );
}

export default function SettlementTrendChart() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const result = await fetchTrendData();

                if (isMounted) setData(result);
            } catch (err) {
                if (isMounted) setError(err.message || "Terjadi kesalahan saat mengambil data");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" style={{ marginLeft: "20px" }}>
            <h2 className="font-semibold text-gray-700 text-center mb-5" style={{ marginTop: "10px" }}>
                Settlement Trend (Monthly)
            </h2>

            {loading && <ChartSkeleton />}

            {!loading && error && (
                <div className="h-72 flex items-center justify-center text-center text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl">
                    Gagal memuat data trend: {error}
                </div>
            )}

            {!loading && !error && (
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#E5E7EB"
                            />

                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={50}
                                interval={0}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                            />

                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #E5E7EB",
                                    fontSize: 12,
                                }}
                            />

                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3B82F6"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}