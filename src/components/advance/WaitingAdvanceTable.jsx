import { useEffect, useRef, useState } from "react";
import {
    FaCalendarAlt,
    FaSearch,
    FaPlus,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";

// ======================================================================
// DUMMY DATA — GANTI BAGIAN INI SAJA NANTI KALAU BACKEND SUDAH SIAP.
//
// Contoh nanti tinggal ganti isi function ini jadi:
//
//   async function fetchAdvances({ page, filters }) {
//     const params = new URLSearchParams({ page, ...filters });
//     const res = await fetch(`${API_BASE_URL}/api/advance?${params}`);
//     if (!res.ok) throw new Error("Gagal mengambil data");
//     return res.json();
//   }
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
//       "pembayaran": "Active"   // Active | Waiting Settlement | Settled | Overdue
//     },
//     ...
//   ],
//   "total": 110,
//   "page": 1,
//   "per_page": 5
// }
// ======================================================================
async function fetchAdvances() {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
        data: [
            {
                tanggal: "2026-07-01",
                no_ppc: "PPC-0001",
                nama_user: "Andi Pratama",
                email: "andi.pratama@company.com",
                cost_center: "Finance",
                keterangan: "Advance perjalanan dinas",
                total_amount: 500000,
                due_date: "2026-07-08",
                pembayaran: "Active",
            },
            {
                tanggal: "2026-07-02",
                no_ppc: "PPC-0002",
                nama_user: "Budi Santoso",
                email: "budi.santoso@company.com",
                cost_center: "Project",
                keterangan: "Advance pembelian material",
                total_amount: 3500000,
                due_date: "2026-07-10",
                pembayaran: "Waiting Settlement",
            },
            {
                tanggal: "2026-06-28",
                no_ppc: "PPC-0003",
                nama_user: "Rina Marlina",
                email: "rina.marlina@company.com",
                cost_center: "Marketing",
                keterangan: "Advance cetak materi promosi",
                total_amount: 900000,
                due_date: "2026-07-05",
                pembayaran: "Settled",
            },
            {
                tanggal: "2026-06-20",
                no_ppc: "PPC-0004",
                nama_user: "Sinta Dewi",
                email: "sinta.dewi@company.com",
                cost_center: "Finance",
                keterangan: "Advance operasional kantor cabang",
                total_amount: 2200000,
                due_date: "2026-06-30",
                pembayaran: "Overdue",
            },
            {
                tanggal: "2026-07-01",
                no_ppc: "PPC-0005",
                nama_user: "Yoga Saputra",
                email: "yoga.saputra@company.com",
                cost_center: "Operation",
                keterangan: "Advance konsumsi rapat lapangan",
                total_amount: 750000,
                due_date: "2026-07-02",
                pembayaran: "Active",
            },
        ],
        total: 110,
        page: 1,
        per_page: 5,
    };
}

const STATUS_STYLE = {
    Active: "bg-blue-100 text-blue-700",
    "Waiting Settlement": "bg-orange-100 text-orange-700",
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

function formatDisplayDate(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
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
    const [searchNoPPC, setSearchNoPPC] = useState("");

    // Filter Due Date Range
    const [startDate, setStartDate] = useState("2026-07-01");
    const [endDate, setEndDate] = useState("2026-07-31");
    const [tempStart, setTempStart] = useState(startDate);
    const [tempEnd, setTempEnd] = useState(endDate);
    const [dateOpen, setDateOpen] = useState(false);
    const dateWrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (dateWrapperRef.current && !dateWrapperRef.current.contains(e.target)) {
                setDateOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleApplyDate = () => {
        setStartDate(tempStart);
        setEndDate(tempEnd);
        setDateOpen(false);
        setPage(1);
    };

    const handleClearDate = () => {
        setTempStart("");
        setTempEnd("");
        setStartDate("");
        setEndDate("");
        setDateOpen(false);
        setPage(1);
    };

    const dateRangeText =
        startDate && endDate
            ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
            : "Pilih Tanggal";

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const result = await fetchAdvances({
                    page,
                    filters: { filterUser, filterStatus, searchNoPPC, startDate, endDate },
                });

                if (isMounted) {
                    setRows(result.data);
                    setTotal(result.total);
                    setPerPage(result.per_page);
                }
            } catch (err) {
                if (isMounted) setError(err.message || "Terjadi kesalahan saat mengambil data");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate]);

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5" style={{ marginRight: "20px", marginLeft: "20px" }}>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 mb-5">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 text-center">Nama User</label>
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ marginLeft: "20px", marginBottom: "10px" }}
                    >
                        <option>All Employee</option>
                        {[...new Set(rows.map((r) => r.nama_user))].map((name) => (
                            <option key={name}>{name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 text-center">Pembayaran</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ marginBottom: "10px" }}
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Waiting Settlement</option>
                        <option>Settled</option>
                        <option>Overdue</option>
                    </select>
                </div>

                {/* Due Date Range */}
                <div className="flex flex-col gap-1 relative" ref={dateWrapperRef}>
                    <label className="text-xs font-medium text-gray-500 text-center">Due Date Range</label>
                    <button
                        type="button"
                        onClick={() => {
                            setTempStart(startDate);
                            setTempEnd(endDate);
                            setDateOpen((prev) => !prev);
                        }}
                        className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[220px] hover:border-gray-300" style={{ marginBottom: "10px" }}
                    >
                        <span className={startDate && endDate ? "" : "text-gray-400"}>
                            {dateRangeText}
                        </span>
                        <FaCalendarAlt className="absolute right-2 text-gray-400" />
                    </button>

                    {dateOpen && (
                        <div className="absolute top-full mt-2 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-72 p-4">
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={tempStart}
                                        max={tempEnd || undefined}
                                        onChange={(e) => setTempStart(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={tempEnd}
                                        min={tempStart || undefined}
                                        onChange={(e) => setTempEnd(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>

                                <div className="flex justify-between gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={handleClearDate}
                                        className="flex-1 border border-gray-300 rounded-lg text-sm py-2 text-gray-600 hover:bg-gray-50"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyDate}
                                        disabled={!tempStart || !tempEnd}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm py-2"
                                    >
                                        Terapkan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1" />

                {/* Search No PPC */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 invisible">Search</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchNoPPC}
                            onChange={(e) => {
                                setSearchNoPPC(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search No PPC..."
                            className="border border-gray-200 rounded-lg text-sm pl-3 pr-9 py-2 text-gray-700 w-56 focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ marginBottom: "10px", padding: "5px 10px" }}
                        />
                        <FaSearch className="absolute right-3 top-4 -translate-y-1/2 text-gray-400 text-xs" />
                    </div>
                </div>

                {/* New Request */}
                <button className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ marginBottom: "10px", marginRight: "20px", padding: "5px 10px" }}>
                    <FaPlus className="text-xs" />
                    New Request
                </button>
            </div>

            {/* Table — 9 kolom sesuai kebutuhan + Reminder & Action */}
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
                            <th className="p-3 font-medium border border-gray-300">Pembayaran</th>
                        </tr>
                    </thead>

                    {loading && <TableSkeleton />}

                    {!loading && !error && (
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

                        {[1, 2, 3].map((p) => (
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

                        <span className="px-1 text-gray-400">...</span>

                        <button
                            onClick={() => setPage(totalPages)}
                            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${page === totalPages
                                ? "bg-blue-600 text-white"
                                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {totalPages}
                        </button>

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
        </div>
    );
}