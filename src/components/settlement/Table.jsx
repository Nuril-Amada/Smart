import { useEffect, useRef, useState } from "react";
import {
  FaEye,
  FaUpload,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// ======================================================================
// DUMMY DATA — GANTI BAGIAN INI SAJA NANTI KALAU BACKEND SUDAH SIAP.
//
// Contoh nanti tinggal ganti isi function ini jadi:
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
//       "type": "Advance",
//       "employee": "Andi Pratama",
//       "request_no": "ADV001",
//       "amount": 3500000,
//       "payment": "Check",
//       "sap_doc_no": "5100000012",
//       "date": "2026-07-09",
//       "source": "Upload Excel"
//     },
//     ...
//   ],
//   "total": 215,
//   "page": 1,
//   "per_page": 5
// }
// ======================================================================
async function fetchSettlements() {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: [
      {
        type: "Advance",
        employee: "Andi Pratama",
        request_no: "ADV001",
        amount: 3500000,
        payment: "Check",
        sap_doc_no: "5100000012",
        date: "2026-07-09",
        source: "Upload Excel",
      },
      {
        type: "Advance",
        employee: "Yoga Saputra",
        request_no: "ADV005",
        amount: 900000,
        payment: "Petty Cash",
        sap_doc_no: "5100000015",
        date: "2026-07-09",
        source: "Manual Input",
      },
      {
        type: "Reimbursement",
        employee: "Rina Marlina",
        request_no: "-",
        amount: 850000,
        payment: "Petty Cash",
        sap_doc_no: "5100000018",
        date: "2026-07-10",
        source: "Upload Excel",
      },
      {
        type: "Reimbursement",
        employee: "Budi Santoso",
        request_no: "-",
        amount: 2400000,
        payment: "Check",
        sap_doc_no: "5100000020",
        date: "2026-07-10",
        source: "Upload Excel",
      },
      {
        type: "Advance",
        employee: "Sinta Dewi",
        request_no: "ADV004",
        amount: 2200000,
        payment: "Check",
        sap_doc_no: "5100000021",
        date: "2026-07-10",
        source: "Upload Excel",
      },
    ],
    total: 215,
    page: 1,
    per_page: 5,
  };
}

const TYPE_STYLE = {
  Advance: "bg-green-100 text-green-700",
  Reimbursement: "bg-purple-100 text-purple-700",
};

const PAYMENT_STYLE = {
  Check: "bg-blue-100 text-blue-700",
  "Petty Cash": "bg-green-100 text-green-700",
};

const SOURCE_STYLE = {
  "Upload Excel": "bg-blue-100 text-blue-700",
  "Manual Input": "bg-orange-100 text-orange-700",
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

function Badge({ text, styleMap }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${styleMap[text] || "bg-gray-100 text-gray-600"
        }`}
    >
      {text}
    </span>
  );
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="p-3">
              <div className="h-4 bg-gray-200 rounded w-20" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function RecentSettlementTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state — nanti dikirim sebagai query param ke API
  const [filterType, setFilterType] = useState("All Type");
  const [filterEmployee, setFilterEmployee] = useState("All Employee");
  const [filterPayment, setFilterPayment] = useState("All Payment");

  // Filter tanggal — diganti dari string statis jadi 2 state date beneran
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-31");
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [dateOpen, setDateOpen] = useState(false);
  const dateWrapperRef = useRef(null);

  // Tutup popover kalender kalau klik di luar area-nya
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
    setPage(1); // reset ke halaman 1 setiap filter berubah
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

        const result = await fetchSettlements({
          page,
          filters: { filterType, filterEmployee, filterPayment, startDate, endDate },
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5" style={{ marginRight: "20px" }}>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center" style={{ marginTop: "10px" }}>Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-200 
            " style={{ marginLeft: "20px" }}
          >
            <option>All Type</option>
            <option>Advance</option>
            <option>Reimbursement</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center">Employee</label>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option>All Employee</option>
            {[...new Set(rows.map((r) => r.employee))].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center">Payment</label>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-200"

          >
            <option>All Payment</option>
            <option>Check</option>
            <option>Petty Cash</option>
          </select>
        </div>

        {/* Date Range — sekarang fungsional & connect ke kalender native */}
        <div className="flex flex-col gap-1 relative" ref={dateWrapperRef}>
          <label className="text-xs font-medium text-gray-500 text-center">Date Range</label>
          <button
            type="button"
            onClick={() => {
              setTempStart(startDate);
              setTempEnd(endDate);
              setDateOpen((prev) => !prev);
            }}
            className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[220px] hover:border-gray-300" style={{ marginLeft: "20px", marginBottom: "10px" }}
          >
            <span className={startDate && endDate ? "" : "text-gray-400"}>
              {dateRangeText}
            </span>
            <FaCalendarAlt className="text-gray-400" />
          </button>

          {dateOpen && (
            <div className="absolute top-full mt-2 left-5 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72" style={{ padding: "5px 12px" }}>
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
                    className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm py-2"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ marginBottom: "10px", padding: "5px 12px" }}>
          <FaUpload className="text-xs" />
          Upload Excel
        </button>

        <button className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ marginRight: "20px", marginBottom: "10px", padding: "5px 12px" }}>
          Manual Input
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Employee</th>
              <th className="p-3 font-medium">Request No</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Payment</th>
              <th className="p-3 font-medium">SAP Doc No</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Source</th>
              <th className="p-3 font-medium text-center">Action</th>
            </tr>
          </thead>

          {loading && <TableSkeleton />}

          {!loading && !error && (
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-3">
                    <Badge text={row.type} styleMap={TYPE_STYLE} />
                  </td>
                  <td className="p-3 text-gray-700">{row.employee}</td>
                  <td className="p-3 text-gray-700">{row.request_no}</td>
                  <td className="p-3 text-gray-700 whitespace-nowrap">
                    {formatRupiah(row.amount)}
                  </td>
                  <td className="p-3">
                    <Badge text={row.payment} styleMap={PAYMENT_STYLE} />
                  </td>
                  <td className="p-3 text-gray-700">{row.sap_doc_no}</td>
                  <td className="p-3 text-gray-700 whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="p-3">
                    <Badge text={row.source} styleMap={SOURCE_STYLE} />
                  </td>
                  <td className="p-3 text-center">
                    <button className="text-blue-600 hover:text-blue-800">
                      <FaEye />
                    </button>
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
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
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
                  ? "bg-blue-600 text-white"
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