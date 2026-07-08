import {
    FaMoneyCheckAlt,
    FaClock,
    FaExclamationTriangle,
    FaWallet,
} from "react-icons/fa";

const cards = [
    {
        title: "Total Advance",
        value: "125",
        subtitle: "(Request)",
        icon: <FaMoneyCheckAlt />,
        bg: "bg-sky-50",
        iconBg: "bg-sky-100",
        iconColor: "text-sky-600",
    },
    {
        title: "Waiting Settlement",
        value: "8",
        subtitle: "(Request)",
        icon: <FaClock />,
        bg: "bg-amber-50",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
    },
    {
        title: "Overdue (>2 Hari)",
        value: "3",
        subtitle: "(Request)",
        icon: <FaExclamationTriangle />,
        bg: "bg-red-50",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
    },
    {
        title: "Nominal Outstanding",
        value: "Rp 12.500.000",
        subtitle: "",
        icon: <FaWallet />,
        bg: "bg-green-50",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
    },
];

export default function SummaryCard() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className={`${card.bg} rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">{card.title}</p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-3">
                                {card.value}
                            </h2>

                            {card.subtitle && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {card.subtitle}
                                </p>
                            )}
                        </div>

                        <div
                            className={`${card.iconBg} ${card.iconColor} w-12 h-12 rounded-full flex items-center justify-center text-xl`}
                        >
                            {card.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}