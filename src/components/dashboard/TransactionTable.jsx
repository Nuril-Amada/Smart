// import { formatRupiah } from "../../utils/formatCurrency";

// export default function TransactionTable({ data }) {
//   return (
//     <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

//       {/* Header */}

//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

//         <div>

//           <h3 className="text-lg font-semibold text-gray-700">
//             Riwayat Transaksi
//           </h3>

//           <p className="text-sm text-gray-500">
//             Daftar transaksi berdasarkan filter tanggal
//           </p>

//         </div>

//         <button
//           className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
//         >
//           Export Excel
//         </button>

//       </div>

//       {/* Table */}

//       <div className="overflow-x-auto">

//         <table className="w-full border-collapse">

//           <thead>

//             <tr className="bg-gray-100 text-gray-700">

//               <th className="text-left p-4">Tanggal</th>

//               <th className="text-left p-4">Vendor</th>

//               <th className="text-left p-4">GL Account</th>

//               <th className="text-left p-4">Cost Center</th>

//               <th className="text-right p-4">Nominal</th>

//             </tr>

//           </thead>

//           <tbody>

//             {data.length === 0 ? (

//               <tr>

//                 <td
//                   colSpan={5}
//                   className="text-center py-8 text-gray-500"
//                 >
//                   Tidak ada data transaksi
//                 </td>

//               </tr>

//             ) : (

//               data.map((item, index) => (

//                 <tr
//                   key={index}
//                   className="border-b hover:bg-gray-50 transition"
//                 >

//                   <td className="p-4">

//                     {item.tanggal}

//                   </td>

//                   <td className="p-4">

//                     {item.vendor}

//                   </td>

//                   <td className="p-4">

//                     {item.gl}

//                   </td>

//                   <td className="p-4">

//                     {item.costCenter}

//                   </td>

//                   <td className="p-4 text-right font-semibold">

//                     {formatRupiah(item.nominal)}

//                   </td>

//                 </tr>

//               ))

//             )}

//           </tbody>

//         </table>

//       </div>

//     </div>
//   );
// }