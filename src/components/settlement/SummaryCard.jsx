import {
    FaWallet,
    FaMoneyBillWave,
    FaExchangeAlt,
    FaCoins,
} from "react-icons/fa";

const cards = [
    {
        title: "Total Settlement",
        value: "180",
        subtitle: "Transaksi",
        color: "bg-blue-50",
        icon: <FaWallet className="text-blue-600 text-xl" />,
    },
    {
        title: "Advance Settlement",
        value: "35",
        subtitle: "Transaksi",
        color: "bg-green-50",
        icon: <FaMoneyBillWave className="text-green-600 text-xl" />,
    },
    {
        title: "Reimbursement",
        value: "145",
        subtitle: "Transaksi",
        color: "bg-pink-50",
        icon: <FaExchangeAlt className="text-pink-600 text-xl" />,
    },
    {
        title: "Total Amount",
        value: "Rp 285.750.000",
        subtitle: "Total Nominal",
        color: "bg-white",
        icon: <FaCoins className="text-yellow-500 text-xl" />,
    },
];

export default function SummaryCard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className={`${card.color} rounded-xl shadow-sm border border-gray-200 p-5`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-sm">{card.title}</p>

                            <h2 className="text-3xl font-bold mt-2 text-gray-800">
                                {card.value}
                            </h2>

                            <p className="text-xs text-gray-400 mt-1">
                                {card.subtitle}
                            </p>
                        </div>

                        <div className="bg-white shadow rounded-full w-12 h-12 flex items-center justify-center">
                            {card.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}