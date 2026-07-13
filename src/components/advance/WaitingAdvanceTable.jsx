import { useEffect, useState } from "react";
import {
    FaSearch,
    FaPlus,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";

// ======================================================================
// TEMPLATE FETCH — GANTI ISI FUNCTION INI KALAU BACKEND SUDAH SIAP.
//
// PENTING — LOGIC BISNIS STATUS (kolom "pembayaran"):
//
//   - "Active"  → default status saat request advance baru dibuat.
//                 Berlaku selama BELUM melewati 2 hari sejak tanggal
//                 request awal ("tanggal"). Ini murni soal waktu,
//                 jadi idealnya dihitung di backend (scheduled job/cron)
//                 dengan membandingkan tanggal sekarang vs "tanggal" + 2 hari.
//
//   - "Settled" → status berubah begitu user MENYELESAIKAN reimbursement
//                 dari advance tersebut. Begitu status jadi "Settled",
//                 baris ini OTOMATIS pindah/muncul juga di tabel
//                 fitur Settlement (source: "Advance") — proses ini
//                 dilakukan backend, frontend tabel Advance ini TIDAK
//                 perlu melakukan apa pun untuk itu.
//
//   - "Overdue" → status berubah otomatis kalau sudah lewat 2 hari sejak
//                 tanggal request TAPI belum "Settled". Begitu masuk
//                 status ini, backend WAJIB otomatis mengirim email
//                 reminder ke user yang bersangkutan (bukan tugas
//                 frontend, ini side-effect di server/cron job).
//
//   Status "Waiting Settlement" SUDAH DIHAPUS dari sistem — tidak
//   dipakai lagi, jangan dikirim dari backend.
//
// Ganti isi function ini jadi:
//
//   async function fetchAdvances({ page, filters }) {
//     const params = new URLSearchParams({ page, ...filters });
//     const res = await fetch(`${API_BASE_URL}/api/advance?${params}`);
//     if (!res.ok) throw new Error("Gagal mengambil data");
//     return res.json();
//   }
//
// PENTING soal search No PPC: parameter "searchNoPPC" nanti tinggal
// dikirim sebagai query param ("search") ke endpoint FastAPI, logic-nya:
//   WHERE no_ppc ILIKE '%' || :search || '%'
//
// Format response yang diharapkan dari FastAPI:
// {
//   "data": [
//     {
//       "tanggal": "2026-07-08",
//       "no_ppc": "PPC-0001",
//       "nama_user": "Andi Pratama",
//       "email": "andi.pratama@company.com",
//       "cost_center": "Finance",
//       "keterangan": "Advance perjalanan dinas",
//       "total_amount": 500000,
//       "due_date": "2026-07-08",
//       "pembayaran": "Active"   // "Active" | "Settled" | "Overdue"
//     },
//     ...
//   ],
//   "total": 110,
//   "page": 1,
//   "per_page": 5
// }
//
// Untuk sekarang (belum ada backend), function ini sengaja return
// data kosong — supaya tabel tampil sebagai template kosong, bukan
// data pura-pura.
// ======================================================================
async function fetchAdvances() {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
        data: [],
        total: 0,
        page: 1,
        per_page: 5,
    };
}

// ======================================================================
// Nanti kalau backend FastAPI sudah siap, tinggal ganti isi function ini:
//
//   async function submitNewRequest(formData) {
//     const res = await fetch(`${API_BASE_URL}/api/advance`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(formData),
//     });
//     if (!res.ok) throw new Error("Gagal menyimpan data");
//     return res.json();
//   }
//
// Catatan: field "pembayaran" saat request baru dibuat HARUS di-set
// backend jadi "Active" secara default — jangan percaya nilai dari
// client untuk status awal ini juga.
// ======================================================================
async function submitNewRequest(formData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Submit new request:", formData);
    return { success: true };
}

const STATUS_STYLE = {
    Active: "bg-blue-100 text-blue-700",
    Settled: "bg-green-100 text-green-700",
    Overdue: "bg-red-100 text-red-700",
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
            {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="p-3">
                            <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
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
    due_date: "",
    pembayaran: "Active",
};

export default function WaitingAdvanceTable() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(5);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter state
    const [filterUser, setFilterUser] = useState("All Employee");
    const [filterStatus, setFilterStatus] = useState("All Status");

    // Search No PPC — dipisah jadi input (langsung, biar responsif diketik)
    // dan versi debounced (yang beneran dipakai buat fetch/filter data).
    const [searchInput, setSearchInput] = useState("");
    const [searchNoPPC, setSearchNoPPC] = useState("");

    // Debounce: tunggu user berhenti ngetik 400ms sebelum fetch,
    // biar gak nge-fetch/nge-hit API tiap 1 huruf diketik.
    useEffect(() => {
        const timeout = setTimeout(() => {
            setSearchNoPPC(searchInput);
            setPage(1);
        }, 400);

        return () => clearTimeout(timeout);
    }, [searchInput]);

    // Modal New Request — inline, tanpa file/halaman baru
    const [requestOpen, setRequestOpen] = useState(false);
    const [requestForm, setRequestForm] = useState(initialForm);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestError, setRequestError] = useState(null);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);

            const result = await fetchAdvances({
                page,
                filters: { filterUser, filterStatus, searchNoPPC },
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
    }, [page, filterUser, filterStatus, searchNoPPC]);

    // Handler form New Request
    const handleRequestChange = (e) => {
        const { name, value } = e.target;
        setRequestForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleRequestClose = () => {
        setRequestForm(initialForm);
        setRequestError(null);
        setRequestOpen(false);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();

        try {
            setRequestSubmitting(true);
            setRequestError(null);

            await submitNewRequest({
                ...requestForm,
                total_amount: Number(requestForm.total_amount),
            });

            handleRequestClose();
            loadData(); // refresh tabel setelah berhasil simpan
        } catch (err) {
            setRequestError(err.message || "Gagal menyimpan data");
        } finally {
            setRequestSubmitting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);

    // Nomor halaman pagination dihitung dinamis, bukan hardcode.
    const maxVisiblePages = 3;
    const visiblePages =
        totalPages <= maxVisiblePages
            ? Array.from({ length: totalPages }, (_, i) => i + 1)
            : [1, 2, 3];
    const showEllipsis = totalPages > maxVisiblePages;
    const showLastPage = totalPages > maxVisiblePages;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5" style={{ marginRight: "20px", marginLeft: "20px" }}>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 mb-5">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 text-center">Nama User</label>
                    <select
                        value={filterUser}
                        onChange={(e) => {
                            setFilterUser(e.target.value);
                            setPage(1);
                        }}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ marginLeft: "20px", marginBottom: "10px" }}
                    >
                        <option>All Employee</option>
                        {[...new Set(rows.map((r) => r.nama_user))].map((name) => (
                            <option key={name}>{name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 text-center">Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setPage(1);
                        }}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ marginBottom: "10px" }}
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Settled</option>
                        <option>Overdue</option>
                    </select>
                </div>

                <div className="flex-1" />

                {/* Search No PPC */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 invisible">Search</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search No PPC..."
                            className="border border-gray-200 rounded-lg text-sm pl-3 pr-9 py-2 text-gray-700 w-56 focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ marginBottom: "10px", padding: "5px 10px" }}
                        />
                        <FaSearch className="absolute right-3 top-4 -translate-y-1/2 text-gray-400 text-xs" />
                    </div>
                </div>

                {/* New Request — buka modal form */}
                <button
                    type="button"
                    onClick={() => setRequestOpen(true)}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ marginBottom: "10px", marginRight: "20px", padding: "5px 10px" }}
                >
                    <FaPlus className="text-xs" />
                    New Request
                </button>
            </div>

            {/* Table — 9 kolom: Tanggal, No PPC, Nama User, Email, Cost Center, Keterangan, Total Amount, Due Date, Status */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-300 text-center" style={{ marginLeft: "10px", marginRight: "10px" }}>
                    <thead>
                        <tr className="text-xs uppercase tracking-wide bg-gray-50">
                            <th className="p-3 font-medium border border-gray-300">Tanggal</th>
                            <th className="p-3 font-medium border border-gray-300">No PPC</th>
                            <th className="p-3 font-medium border border-gray-300">Nama User</th>
                            <th className="p-3 font-medium border border-gray-300">Email</th>
                            <th className="p-3 font-medium border border-gray-300">Cost Center</th>
                            <th className="p-3 font-medium border border-gray-300">Keterangan</th>
                            <th className="p-3 font-medium border border-gray-300">Total Amount</th>
                            <th className="p-3 font-medium border border-gray-300">Due Date</th>
                            <th className="p-3 font-medium border border-gray-300">Status</th>
                        </tr>
                    </thead>

                    {loading && <TableSkeleton />}

                    {!loading && !error && rows.length === 0 && (
                        <tbody>
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-gray-400 border border-gray-300">
                                    {searchNoPPC
                                        ? `Tidak ada data yang cocok dengan pencarian "${searchNoPPC}"`
                                        : "Belum ada data advance"}
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
                                    <td className="p-3 text-gray-600 border border-gray-300">
                                        {row.no_ppc}
                                    </td>
                                    <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
                                    <td className="p-3 text-gray-700 border border-gray-300">{row.email}</td>
                                    <td className="p-3 text-gray-700 border border-gray-300">{row.cost_center}</td>
                                    <td className="p-3 text-gray-700 border border-gray-300">{row.keterangan}</td>
                                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                        {formatRupiah(row.total_amount)}
                                    </td>
                                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                        {formatDate(row.due_date)}
                                    </td>
                                    <td className="p-3 border border-gray-300">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[row.pembayaran] || "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {row.pembayaran}
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

            {/* Modal New Request — inline, tanpa halaman/file terpisah */}
            {requestOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200" style={{ marginRight: "20px" }}>
                            <h3 className="text-lg font-semibold text-gray-700" style={{ marginLeft: "20px" }}>New Request</h3>
                            <button
                                type="button"
                                onClick={handleRequestClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleRequestSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "10px" }}>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                                <input
                                    type="date"
                                    name="tanggal"
                                    value={requestForm.tanggal}
                                    onChange={handleRequestChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">No PPC</label>
                                <input
                                    type="text"
                                    name="no_ppc"
                                    value={requestForm.no_ppc}
                                    onChange={handleRequestChange}
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
                                    value={requestForm.nama_user}
                                    onChange={handleRequestChange}
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
                                    value={requestForm.email}
                                    onChange={handleRequestChange}
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
                                    value={requestForm.cost_center}
                                    onChange={handleRequestChange}
                                    placeholder="Finance"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Keterangan</label>
                                <textarea
                                    name="keterangan"
                                    value={requestForm.keterangan}
                                    onChange={handleRequestChange}
                                    rows={3}
                                    placeholder="Contoh: Advance perjalanan dinas"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Total Amount</label>
                                <input
                                    type="number"
                                    name="total_amount"
                                    value={requestForm.total_amount}
                                    onChange={handleRequestChange}
                                    placeholder="0"
                                    min="0"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    name="due_date"
                                    value={requestForm.due_date}
                                    onChange={handleRequestChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Status</label>
                                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                                    Active
                                    <span className="block text-xs text-gray-400 mt-0.5">
                                        Request baru selalu dimulai dengan status Active. Status akan berubah otomatis oleh sistem (Settled saat reimbursement selesai, Overdue jika melewati 2 hari).
                                    </span>
                                </div>
                            </div>

                            {requestError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    {requestError}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleRequestClose}
                                    disabled={requestSubmitting}
                                    className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40" style={{ padding: "1px 15px", marginRight: "5px" }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={requestSubmitting}
                                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2" style={{ padding: "1px 10px" }}
                                >
                                    {requestSubmitting ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}