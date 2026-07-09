import { formatRupiah } from "../../utils/formatCurrency";

const cards = [
  {
    title: "Total Pengeluaran",
    key: "totalPengeluaran",
    bg: "bg-gray-600",
    currency: true,
  },
  {
    title: "Jumlah Transaksi",
    key: "jumlahTransaksi",
    bg: "bg-gray-600",
  },
  {
    title: "Total Cost Center",
    key: "totalCostCenter",
    bg: "bg-gray-600",
  },
  {
    title: "Rata-rata Pengeluaran",
    key: "rataPengeluaran",
    bg: "bg-gray-600",
    currency: true,
  },
];

export default function KPICard({ data = {} }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6" style={{ marginBottom: "15px", paddingLeft: "20px", paddingRight: "20px" }}>

      {cards.map((item) => {

        const value = data[item.key];

        return (

          <div
            key={item.key}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition overflow-hidden"
          >

            {/* Garis Atas */}
            <div className={`${item.bg} h-2`}></div>

            <div className="p-6 text-center min-h-[70px] flex flex-col justify-center gap-2">

              <p className="text-sm text-gray-500 font-medium">
                {item.title}
              </p>

              <h2 className="text-lg font-bold text-gray-800">
                {value !== undefined && value !== null
                  ? item.currency
                    ? formatRupiah(value)
                    : value
                  : "-"}
              </h2>

            </div>

          </div >

        );

      })}

    </div >
  );
}