import { formatRupiah } from "../../utils/formatCurrency";

const cards = [
  {
    title: "Total Pengeluaran",
    key: "totalPengeluaran",
    bg: "bg-blue-800",
    currency: true,
  },
  {
    title: "Jumlah Transaksi",
    key: "jumlahTransaksi",
    bg: "bg-blue-800",
  },
  {
    title: "Total GL Account",
    key: "totalGLAccount",
    bg: "bg-blue-800",
  },
  {
    title: "Total Cost Center",
    key: "totalCostCenter",
    bg: "bg-blue-800",
  },
  {
    title: "Rata-rata Pengeluaran",
    key: "rataPengeluaran",
    bg: "bg-blue-800",
    currency: true,
  },
];

export default function KPICard({ data = {} }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6" style={{ marginBottom: "15px", paddingLeft: "20px", paddingRight: "20px" }}>

      {cards.map((item) => {

        const value = data[item.key];

        return (

          <div
            key={item.key}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition overflow-hidden"
          >

            {/* Garis Atas */}
            <div className={`${item.bg} h-2`}></div>

            <div className="p-5 text-center">

              <p className="text-sm text-gray-500 font-medium">
                {item.title}
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mt-3">

                {value !== undefined && value !== null
                  ? item.currency
                    ? formatRupiah(value)
                    : value
                  : "-"}

              </h2>

            </div>

          </div>

        );

      })}

    </div>
  );
}