import { useEffect, useState } from "react";
import {
    FaClipboardList,
    FaFileInvoiceDollar,
    FaReceipt,
    FaCalendarAlt,
} from "react-icons/fa";

// Mapping tampilan (icon, warna, title) berdasarkan "key".
// Nanti backend FastAPI cukup kirim value + subtitle per key ini,
// jadi style tetap diatur di frontend, tidak perlu dikirim dari API.
const CARD_META = {
    total: {
        title: "Total Settlement",
        border: "border-blue-300",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        icon: <FaClipboardList />,
    },
    advance: {
        title: "Advance Settlement",
        border: "border-green-300",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        icon: <FaFileInvoiceDollar />,
    },
    reimbursement: {
        title: "Reimbursement Settlement",
        border: "border-purple-300",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        icon: <FaReceipt />,
    },
    this_month: {
        title: "This Month Settlement",
        border: "border-orange-300",
        iconBg: "bg-orange-100",
        iconColor: "text-orange-600",
        icon: <FaCalendarAlt />,
    },
};

// ======================================================================
// DUMMY DATA — GANTI BAGIAN INI SAJA NANTI KALAU BACKEND SUDAH SIAP.
//
// Struktur data dibuat sama persis seperti response yang nantinya
// akan dikirim oleh FastAPI, supaya waktu diganti ke fetch() asli,
// komponen di bawah TIDAK PERLU diubah sama sekali.
//
// Contoh nanti tinggal ganti isi function ini jadi:
//
//   async function fetchSummaryData() {
//     const res = await fetch(`${API_BASE_URL}/api/settlement/summary`);
//     if (!res.ok) throw new Error("Gagal mengambil data");
//     return res.json();
//   }
// ======================================================================
async function fetchSummaryData() {
    // simulasi delay network biar kelihatan behavior loading-nya
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
        { key: "total", value: 215, subtitle: "Transactions" },
        { key: "advance", value: 140, subtitle: "Transactions" },
        { key: "reimbursement", value: 75, subtitle: "Transactions" },
        { key: "this_month", value: 23, subtitle: "Transactions" },
    ];
}

function CardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse">
            <div className="flex items-center gap-2" style={{ paddingLeft: "5px" }}>
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                    <div className="h-2 w-20 bg-gray-200 rounded" />
                </div>
            </div>
        </div>
    );
}

export default function SummaryCard() {
    const [cards, setCards] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const data = await fetchSummaryData();

                if (isMounted) setCards(data);
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
        <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 m-5"
            style={{ marginBottom: "20px", marginTop: "20px", paddingLeft: "20px", paddingRight: "20px" }}
        >
            {loading &&
                Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}

            {!loading && error && (
                <div className="col-span-full text-center py-6 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    Gagal memuat data ringkasan: {error}
                </div>
            )}

            {!loading &&
                !error &&
                cards?.map((card) => {
                    const meta = CARD_META[card.key] ?? {
                        title: card.title || card.key,
                        border: "border-gray-300",
                        iconBg: "bg-gray-100",
                        iconColor: "text-gray-600",
                        icon: <FaClipboardList />,
                    };

                    return (
                        <div
                            key={card.key}
                            className={`bg-white rounded-xl border ${meta.border} shadow-sm p-5 hover:shadow-md transition-all duration-300`}
                        >
                            <div className="flex items-center gap-2" style={{ paddingLeft: "5px" }}>
                                {/* Icon */}
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${meta.iconBg} ${meta.iconColor}`}
                                >
                                    {meta.icon}
                                </div>

                                {/* Text */}
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">
                                        {meta.title}
                                    </p>

                                    <h2 className="text-3xl font-bold text-gray-800 leading-tight mt-1">
                                        {card.value}
                                    </h2>

                                    <p className="text-xs text-gray-400">
                                        {card.subtitle}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}