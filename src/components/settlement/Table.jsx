const data = [
  {
    date: "12/06/2025",
    type: "Reimbursement",
    request: "REQ-0056",
    employee: "Budi Santoso",
    amount: "Rp1.250.000",
    status: "Approved",
  },
  {
    date: "11/06/2025",
    type: "Advance",
    request: "ADV-0042",
    employee: "Andi Setiawan",
    amount: "Rp850.000",
    status: "Approved",
  },
  {
    date: "10/06/2025",
    type: "Advance",
    request: "ADV-0037",
    employee: "Rina Wati",
    amount: "Rp1.500.000",
    status: "Pending",
  },
];

export default function RecentSettlementTable() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold text-gray-700">
          Recent Settlement
        </h2>

        <button className="text-blue-600 text-sm hover:underline">
          View All
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Tanggal</th>
            <th className="p-3 text-left">Jenis</th>
            <th className="p-3 text-left">Request No</th>
            <th className="p-3 text-left">Employee</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b hover:bg-gray-50"
            >
              <td className="p-3">{row.date}</td>
              <td className="p-3">{row.type}</td>
              <td className="p-3">{row.request}</td>
              <td className="p-3">{row.employee}</td>
              <td className="p-3">{row.amount}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    row.status === "Approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}