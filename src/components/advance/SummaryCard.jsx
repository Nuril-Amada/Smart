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
        bg: "bg-gray-50",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
    },
    {
        title: "Waiting Settlement",
        value: "8",
        subtitle: "(Request)",
        icon: <FaClock />,
        bg: "bg-gray-50",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
    },
    {
        title: "Overdue (>2 Hari)",
        value: "3",
        subtitle: "(Request)",
        icon: <FaExclamationTriangle />,
        bg: "bg-gray-50",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
    },
    {
        title: "Nominal Outstanding",
        value: "Rp 12.500.000.000",
        subtitle: "",
        icon: <FaWallet />,
        bg: "bg-gray-50",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
    },
];

export default function SummaryCard() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6" style={{ marginBottom: "20px", marginTop: "20px", paddingLeft: "20px", paddingRight: "20px" }}>
            {cards.map((card) => (
                <div
                    key={card.title}
                    className={`${card.bg} rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all`}
                >
                    <div className="flex justify-between items-start" style={{ marginLeft: "10px", marginTop: "10px", marginBottom: "10px" }}>
                        <div>
                            <p className="text-gray-500 text-sm">{card.title}</p>

                            <h2 className="text-xl font-bold text-gray-800 mt-3">
                                {card.value}
                            </h2>

                            {card.subtitle && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {card.subtitle}
                                </p>
                            )}
                        </div>

                        <div
                            className={`${card.iconBg} ${card.iconColor} w-12 h-12 rounded-full flex items-center justify-center text-xl`} style={{ marginTop: "10px", marginRight: "5px" }}
                        >
                            {card.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}