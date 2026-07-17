import {
    FaMoneyCheckAlt,
    FaClock,
    FaExclamationTriangle,
    FaWallet,
} from "react-icons/fa";

// cards didefinisikan statis di sini (sama seperti pola SummaryCard Settlement),
// jadi urutan & jumlah card SELALU tampil 4 buah, apa pun isi `data`-nya.
// Backend/API cukup kirim value per "key" ini, style tetap diatur di frontend.
const cards = [
    {
        title: "Total Advance",
        key: "total_advance",
        subtitle: "(Request)",
        icon: <FaMoneyCheckAlt />,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        currency: false,
    },
    {
        title: "Active Advance",
        key: "active_advance",
        subtitle: "(Request)",
        icon: <FaClock />,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        currency: false,
    },
    {
        title: "Overdue (>2 Hari)",
        key: "overdue",
        subtitle: "(Request)",
        icon: <FaExclamationTriangle />,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        currency: false,
    },
    {
        title: "Nominal Outstanding",
        key: "nominal_outstanding",
        subtitle: "Rupiah",
        icon: <FaWallet />,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        currency: true,
    },
];

function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);
}

// ======================================================================
// data yang diharapkan komponen ini (dikirim lewat props `data`),
// berbentuk OBJECT (bukan array), key-nya HARUS cocok dengan `key`
// di array `cards` di atas:
//
// {
//   "total_advance": 125,
//   "waiting_settlement": 8,
//   "overdue": 3,
//   "nominal_outstanding": 12500000000
// }
//
// Kalau field dari backend namanya beda, tinggal mapping dulu
// sebelum dikirim sebagai prop `data` ke komponen ini.
// ======================================================================

export default function SummaryCard({ data = {} }) {
    return (
        <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6"
            style={{ marginBottom: "20px", marginTop: "20px", paddingLeft: "20px", paddingRight: "20px" }}
        >
            {cards.map((item) => {
                const value = data[item.key];
                const displayValue =
                    value !== undefined && value !== null
                        ? item.currency
                            ? formatRupiah(value)
                            : value
                        : "-";

                return (
                    <div
                        key={item.key}
                        className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all"
                    >
                        <div
                            className="flex justify-between items-start"
                            style={{ marginLeft: "10px", marginTop: "10px", marginBottom: "10px" }}
                        >
                            <div>
                                <p className="text-gray-500 text-sm">{item.title}</p>

                                <h2 className="text-xl font-bold text-gray-800 mt-3">
                                    {displayValue}
                                </h2>

                                {item.subtitle && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {item.subtitle}
                                    </p>
                                )}
                            </div>

                            <div
                                className={`${item.iconBg} ${item.iconColor} w-12 h-12 rounded-full flex items-center justify-center text-xl`}
                                style={{ marginTop: "10px", marginRight: "5px" }}
                            >
                                {item.icon}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}