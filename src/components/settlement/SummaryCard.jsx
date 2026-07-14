import {
    FaClipboardList,
    FaFileInvoiceDollar,
    FaReceipt,
    FaMoneyBillWave,
} from "react-icons/fa";
import { formatRupiah } from "../../utils/formatCurrency";

// cards didefinisikan statis di sini (sama seperti pola KPICard.jsx),
// jadi urutan & jumlah card SELALU tampil 4 buah, apa pun isi `data`-nya.
// Backend/API cukup kirim value per "key" ini, style tetap diatur di frontend.
const cards = [
    {
        title: "Total Settlement",
        key: "total",
        border: "border-gray-300",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        icon: <FaClipboardList />,
        subtitle: "Transactions",
        currency: false,
    },
    {
        title: "Advance Settlement",
        key: "advance",
        border: "border-gray-300",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        icon: <FaFileInvoiceDollar />,
        subtitle: "Transactions",
        currency: false,
    },
    {
        title: "Reimbursement Settlement",
        key: "reimbursement",
        border: "border-gray-300",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        icon: <FaReceipt />,
        subtitle: "Transactions",
        currency: false,
    },
    {
        title: "Total Amount Settlement",
        key: "totalAmount",
        border: "border-gray-300",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        icon: <FaMoneyBillWave />,
        subtitle: "Rupiah",
        currency: true,
    },
];

// ======================================================================
// data yang diharapkan komponen ini (dikirim lewat props `data`),
// berbentuk OBJECT (bukan array), key-nya HARUS cocok dengan `key`
// di array `cards` di atas:
//
// {
//   "total": 215,
//   "advance": 140,
//   "reimbursement": 75,
//   "this_month": 23
// }
//
// Kalau field dari backend namanya beda, tinggal mapping dulu
// sebelum dikirim sebagai prop `data` ke komponen ini.
// ======================================================================

export default function SummaryCard({ data = {} }) {
    return (
        <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 m-5"
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
                        className={`bg-white rounded-xl border ${item.border} shadow-sm p-6 hover:shadow-md transition-all duration-300`}
                    >
                        <div className="flex items-center gap-2" style={{ marginLeft: "10px", marginTop: "10px", marginBottom: "10px" }}>
                            {/* Icon */}
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${item.iconBg} ${item.iconColor}`}
                            >
                                {item.icon}
                            </div>

                            {/* Text */}
                            <div>
                                <p className="text-sm font-semibold text-gray-700">
                                    {item.title}
                                </p>

                                <h2 className="text-xl font-bold text-gray-800 leading-tight mt-1">
                                    {displayValue}
                                </h2>

                                <p className="text-xs text-gray-400">
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}