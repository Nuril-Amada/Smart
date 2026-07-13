import { useEffect, useState } from "react";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";

// ======================================================================
// TEMPLATE FETCH — GANTI ISI FUNCTION INI KALAU BACKEND SUDAH SIAP.
//
// PENTING: endpoint GET ini nantinya me-return data GABUNGAN dari 2 sumber
// (digabungkan oleh backend, bukan frontend):
//   1. Baris dari tabel Advance yang statusnya sudah "Settled"
//      → source: "Advance"
//   2. Baris yang diinput manual lewat form di halaman ini
//      → source: "Reimbursement"
//
// Frontend TIDAK PERLU tahu atau memproses penggabungan ini — cukup
// tampilkan apa pun yang dikembalikan endpoint /api/settlement,
// termasuk field "source" yang sudah ditentukan backend.
//
// Ganti isi function ini jadi:
//
//   async function fetchSettlements({ page, filters }) {
//     const params = new URLSearchParams({ page, ...filters });
//     const res = await fetch(`${API_BASE_URL}/api/settlement?${params}`);
//     if (!res.ok) throw new Error("Gagal mengambil data");
//     return res.json();
//   }
//
// Format response yang diharapkan dari FastAPI:
// {
//   "data": [
//     {
//       "tanggal": "2026-07-09",
//       "no_ppc": "PPC-0001",
//       "nama_user": "Andi Pratama",
//       "email": "andi.pratama@company.com",
//       "cost_center": "Marketing",
//       "keterangan": "Reimbursement transport dinas",
//       "total_amount": 3500000,
//       "source": "Reimbursement"   // "Advance" | "Reimbursement"
//     },
//     ...
//   ],
//   "total": 215,
//   "page": 1,
//   "per_page": 7
// }
//
// Untuk sekarang (belum ada backend), function ini sengaja return
// data kosong — supaya tabel tampil sebagai template kosong, bukan
// data pura-pura.
// ======================================================================
async function fetchSettlements() {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    data: [],
    total: 0,
    page: 1,
    per_page: 7,
  };
}

// ======================================================================
// PENTING — LOGIC BISNIS SOURCE:
//
// Kolom "source" di tabel ini menandakan asal data settlement:
//   - "Advance"       → masuk OTOMATIS dari fitur Advance, begitu status
//                        advance itu berubah jadi "Settled" di sana.
//                        Baris dengan source ini TIDAK dibuat lewat form
//                        Manual Input di halaman ini.
//   - "Reimbursement" → dibuat lewat form "Manual Input" di halaman ini,
//                        karena reimbursement tidak melalui alur Advance.
//
// Makanya form Manual Input di bawah TIDAK punya pilihan dropdown Source
// — nilainya di-hardcode "Reimbursement", karena satu-satunya jalan data
// sampai ke form ini ya lewat input manual reimbursement.
//
// Nanti di backend, endpoint POST manual input HARUS otomatis set
// source = "Reimbursement" (jangan percaya nilai dari client), dan baris
// dengan source "Advance" hanya boleh muncul dari proses settle otomatis
// di endpoint Advance, bukan dari endpoint manual input ini.
// ======================================================================
async function submitManualInput(formData) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("Submit manual input:", formData);
  return { success: true };
}

const SOURCE_STYLE = {
  Advance: "bg-green-100 text-green-700",
  Reimbursement: "bg-purple-100 text-purple-700",
};

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="p-3">
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

const initialForm = {
  tanggal: "",
  no_ppc: "",
  nama_user: "",
  email: "",
  cost_center: "",
  keterangan: "",
  total_amount: "",
  source: "Reimbursement", // fixed — manual input selalu untuk Reimbursement
};

export default function RecentSettlementTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(7);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state — nanti dikirim sebagai query param ke API
  const [filterUser, setFilterUser] = useState("All User");
  const [filterCostCenter, setFilterCostCenter] = useState("All Cost Center");

  // Modal Manual Input — inline, gak pakai file/komponen terpisah
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualForm, setManualForm] = useState(initialForm);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchSettlements({
        page,
        filters: { filterUser, filterCostCenter },
      });

      setRows(result.data);
      setTotal(result.total);
      setPerPage(result.per_page);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!isMounted) return;
      await loadData();
    }

    run();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Handler untuk form Manual Input
  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleManualClose = () => {
    setManualForm(initialForm);
    setManualError(null);
    setManualInputOpen(false);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();

    try {
      setManualSubmitting(true);
      setManualError(null);

      await submitManualInput({
        ...manualForm,
        total_amount: Number(manualForm.total_amount),
      });

      handleManualClose();
      loadData(); // refresh tabel setelah berhasil simpan
    } catch (err) {
      setManualError(err.message || "Gagal menyimpan data");
    } finally {
      setManualSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, total);

  // Hitung nomor halaman yang ditampilkan secara dinamis, bukan hardcode.
  // Maksimal 3 nomor halaman ditampilkan langsung, sisanya "..." + halaman terakhir.
  const maxVisiblePages = 3;
  let visiblePages = [];

  if (totalPages <= maxVisiblePages) {
    visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    visiblePages = [1, 2, 3];
  }

  const showEllipsis = totalPages > maxVisiblePages;
  const showLastPage = totalPages > maxVisiblePages;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5" style={{ marginRight: "20px", marginLeft: "20px" }}>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center" style={{ marginTop: "10px" }}>Nama User</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ marginLeft: "20px", marginBottom: "10px" }}
          >
            <option>All User</option>
            {[...new Set(rows.map((r) => r.nama_user))].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center">Cost Center</label>
          <select
            value={filterCostCenter}
            onChange={(e) => setFilterCostCenter(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ marginBottom: "10px" }}
          >
            <option>All Cost Center</option>
            {[...new Set(rows.map((r) => r.cost_center))].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Manual Input — buka modal (inline, di file yang sama) */}
        <button
          type="button"
          onClick={() => setManualInputOpen(true)}
          className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ marginRight: "20px", marginBottom: "10px", padding: "5px 12px" }}
        >
          Manual Input
        </button>
      </div>

      {/* Table — 8 kolom: Tanggal, No PPC, Nama User, Email, Cost Center, Keterangan, Total Amount, Source */}
      <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
        <table className="w-full text-sm border border-gray-300 text-center">
          <thead>
            <tr className="text-xs uppercase tracking-wide bg-gray-50">
              <th className="p-3 font-medium border border-gray-300 text-center">Tanggal</th>
              <th className="p-3 font-medium border border-gray-300 text-center">No PPC</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Nama User</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Email</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Cost Center</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Keterangan</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Total Amount</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Source</th>
            </tr>
          </thead>

          {loading && <TableSkeleton />}

          {!loading && !error && rows.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400 border border-gray-300">
                  Belum ada data settlement
                </td>
              </tr>
            </tbody>
          )}

          {!loading && !error && rows.length > 0 && (
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                    {formatDate(row.tanggal)}
                  </td>
                  <td className="p-3 text-gray-700 border border-gray-300">{row.no_ppc}</td>
                  <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
                  <td className="p-3 text-gray-700 border border-gray-300">{row.email}</td>
                  <td className="p-3 text-gray-700 border border-gray-300">{row.cost_center}</td>
                  <td className="p-3 text-gray-700 border border-gray-300">{row.keterangan}</td>
                  <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                    {formatRupiah(row.total_amount)}
                  </td>
                  <td className="p-3 border border-gray-300">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${SOURCE_STYLE[row.source] || "bg-gray-100 text-gray-600"
                        }`}
                    >
                      {row.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {!loading && error && (
          <div className="text-center py-6 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl mt-3">
            Gagal memuat data: {error}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500" style={{ marginLeft: "10px", marginRight: "10px", marginTop: "10px", marginBottom: "10px" }}>
          <span>
            Showing {startEntry} to {endEntry} of {total} entries
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
            >
              <FaChevronLeft className="text-xs" />
            </button>

            {visiblePages.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${page === p
                  ? "bg-gray-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {p}
              </button>
            ))}

            {showEllipsis && <span className="px-1 text-gray-400">...</span>}

            {showLastPage && (
              <button
                onClick={() => setPage(totalPages)}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${page === totalPages
                  ? "bg-gray-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {totalPages}
              </button>
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
            >
              <FaChevronRight className="text-xs" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Manual Input — inline, tanpa file terpisah */}
      {manualInputOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200" style={{ marginRight: "20px" }}>
              <h3 className="text-lg font-semibold text-gray-700" style={{ marginLeft: "20px" }}>Rembuisement</h3>
              <button
                type="button"
                onClick={handleManualClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleManualSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "10px" }}>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  name="tanggal"
                  value={manualForm.tanggal}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">No PPC</label>
                <input
                  type="text"
                  name="no_ppc"
                  value={manualForm.no_ppc}
                  onChange={handleManualChange}
                  placeholder="PPC-0001"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Nama User</label>
                <input
                  type="text"
                  name="nama_user"
                  value={manualForm.nama_user}
                  onChange={handleManualChange}
                  placeholder="Andi Pratama"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={manualForm.email}
                  onChange={handleManualChange}
                  placeholder="nama@company.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Cost Center</label>
                <input
                  type="text"
                  name="cost_center"
                  value={manualForm.cost_center}
                  onChange={handleManualChange}
                  placeholder="Marketing"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Keterangan</label>
                <textarea
                  name="keterangan"
                  value={manualForm.keterangan}
                  onChange={handleManualChange}
                  rows={3}
                  placeholder="Contoh: Reimbursement transport dinas"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Total Amount</label>
                <input
                  type="number"
                  name="total_amount"
                  value={manualForm.total_amount}
                  onChange={handleManualChange}
                  placeholder="0"
                  min="0"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Source</label>
                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                  Reimbursement
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Manual input hanya untuk data Reimbursement. Data Advance masuk otomatis dari fitur Advance setelah status "Settled".
                  </span>
                </div>
              </div>

              {manualError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {manualError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleManualClose}
                  disabled={manualSubmitting}
                  className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40" style={{ padding: "1px 15px", marginRight: "5px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2" style={{ padding: "1px 10px" }}
                >
                  {manualSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}