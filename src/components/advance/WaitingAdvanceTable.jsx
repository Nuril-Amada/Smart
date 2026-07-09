const data = [
    {
        request: "ADV-021",
        employee: "Budi Santoso",
        amount: "Rp 3.250.000",
        requestDate: "12 Jun 2025",
        dueDate: "19 Jun 2025",
        status: "Waiting",
    },
    {
        request: "ADV-022",
        employee: "Rina Putri",
        amount: "Rp 1.850.000",
        requestDate: "13 Jun 2025",
        dueDate: "20 Jun 2025",
        status: "Waiting",
    },
    {
        request: "ADV-023",
        employee: "Ahmad Rizki",
        amount: "Rp 2.100.000",
        requestDate: "14 Jun 2025",
        dueDate: "21 Jun 2025",
        status: "Overdue",
    },
    {
        request: "ADV-024",
        employee: "Siti Aminah",
        amount: "Rp 980.000",
        requestDate: "15 Jun 2025",
        dueDate: "22 Jun 2025",
        status: "Waiting",
    },
];

export default function WaitingAdvanceTable() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-700">
                    Waiting Settlement
                </h2>

                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All
                </button>
            </div>

            <div className="overflow-x-auto">

                <table className="w-full text-sm">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="p-3 text-left">Request No</th>

                            <th className="p-3 text-left">Employee</th>

                            <th className="p-3 text-left">Amount</th>

                            <th className="p-3 text-left">Request Date</th>

                            <th className="p-3 text-left">Due Date</th>

                            <th className="p-3 text-center">Status</th>

                        </tr>

                    </thead>

                    <tbody>

                        {data.map((item, index) => (

                            <tr
                                key={index}
                                className="border-b hover:bg-gray-50"
                            >

                                <td className="p-3 font-medium text-blue-600">
                                    {item.request}
                                </td>

                                <td className="p-3">
                                    {item.employee}
                                </td>

                                <td className="p-3">
                                    {item.amount}
                                </td>

                                <td className="p-3">
                                    {item.requestDate}
                                </td>

                                <td className="p-3">
                                    {item.dueDate}
                                </td>

                                <td className="p-3 text-center">

                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === "Waiting"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {item.status}
                                    </span>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}