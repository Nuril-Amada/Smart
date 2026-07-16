import { useEffect, useMemo, useState } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// STYLE
const SOURCE_STYLE = {
  Advance: "bg-green-100 text-green-700",
  Reimbursement: "bg-purple-100 text-purple-700",
};

// HELPER
function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="border p-3">
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// INITIAL FORM
const initialForm = {
  settlement_date: "",
  no_ppc: "",
  nama_user: "",
  email: "",
  cost_center: "",
  description: "",
  settlement_amount: "",
};

// COMPONENT
export default function Table({
  startDate,
  endDate,
  refreshKey,
}) {

  // TABLE
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const perPage = 15;

  // FILTER
  const [filterUser, setFilterUser] = useState("");
  const [filterCostCenter, setFilterCostCenter] =
    useState("");

  // Dropdown saran untuk search Nama User & Cost Center
  const [userSuggestOpen, setUserSuggestOpen] = useState(false);
  const [ccSuggestOpen, setCcSuggestOpen] = useState(false);

  // MODAL
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualForm, setManualForm] = useState(initialForm);

  // LOAD DATA
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const result =
        await getSettlementList({
          start_date:
            startDate || undefined,
          end_date:
            endDate || undefined,
        });
      const data = result.map((item) => ({
        tanggal:
          item.settlement_date,
        no_ppc:
          item.ppc_no,
        nama_user:
          item.employee_name,
        email:
          item.employee_email,
        cost_center:
          item.cost_center,
        description:
          item.description,
        settlement_amount:
          Number(item.settlement_amount),
        source:
          item.source === "ADVANCE"
            ? "Advance"
            : "Reimbursement",
      }));

      setRows(data);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        "Gagal memuat settlement."
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [

    startDate,
    endDate,
    refreshKey,
  ]);

  // MANUAL INPUT
  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleManualClose = () => {
    setManualInputOpen(false);
    setManualForm(initialForm);
    setManualError("");
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      setManualSubmitting(true);
      setManualError("");
      await createReimbursement({
        settlement_date:
          manualForm.settlement_date,
        ppc_no:
          manualForm.no_ppc,
        employee_name:
          manualForm.nama_user,
        email:
          manualForm.email,
        cost_center:
          manualForm.cost_center,
        description:
          manualForm.description,
        settlement_amount:
          Number(
            manualForm.settlement_amount
          ),
      });

      handleManualClose();
      loadData();

    } catch (err) {
      console.error(err);
      setManualError(
        err.response?.data?.detail ||
        "Gagal menyimpan reimbursement."
      );

    } finally {
      setManualSubmitting(false);
    }

  };

  // FILTER
  const filteredRows = useMemo(() => {

    return rows.filter((row) => {

      const userMatch =
        !filterUser ||
        (row.nama_user || "")
          .toLowerCase()
          .includes(filterUser.toLowerCase());

      const ccMatch =
        !filterCostCenter ||
        (row.cost_center || "")
          .toLowerCase()
          .includes(filterCostCenter.toLowerCase());

      return userMatch && ccMatch;

    });

  }, [

    rows,

    filterUser,

    filterCostCenter,

  ]);

  // SARAN PENCARIAN (dropdown transparan di bawah input)
  const userSuggestions = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.nama_user).filter(Boolean))];
    if (!filterUser) return unique;
    return unique.filter((u) =>
      u.toLowerCase().includes(filterUser.toLowerCase())
    );
  }, [rows, filterUser]);

  const costCenterSuggestions = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.cost_center).filter(Boolean))];
    if (!filterCostCenter) return unique;
    return unique.filter((c) =>
      c.toLowerCase().includes(filterCostCenter.toLowerCase())
    );
  }, [rows, filterCostCenter]);

  // PAGINATION
  const total = filteredRows.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / perPage)
  );

  const currentRows = filteredRows.slice(

    (page - 1) * perPage,

    page * perPage

  );

  const startEntry =
    total === 0
      ? 0
      : (page - 1) * perPage + 1;

  const endEntry = Math.min(
    page * perPage,
    total
  );

  const visiblePages = [];

  for (
    let i = 1;
    i <= totalPages;
    i++
  ) {

    visiblePages.push(i);

  }

  // JSX
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
      style={{
        marginLeft: "20px",
        marginRight: "20px",
      }}
    >

      {/* ================= FILTER ================= */}

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center" style={{ marginTop: "10px" }}>
            Nama User
          </label>

          <div className="relative" style={{ marginLeft: "20px", marginBottom: "10px" }}>
            <input
              type="text"
              value={filterUser}
              onChange={(e) =>
                setFilterUser(e.target.value)
              }
              onFocus={() => setUserSuggestOpen(true)}
              onBlur={() =>
                setTimeout(() => setUserSuggestOpen(false), 150)
              }
              placeholder="Cari Nama User..."
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] w-full focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
            />

            {userSuggestOpen && userSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {userSuggestions.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFilterUser(u);
                      setUserSuggestOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/80"
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex flex-col gap-1">

          <label className="text-xs font-medium text-gray-500 text-center">
            Cost Center
          </label>

          <div className="relative" style={{ marginBottom: "10px" }}>
            <input
              type="text"
              value={filterCostCenter}
              onChange={(e) =>
                setFilterCostCenter(
                  e.target.value
                )
              }
              onFocus={() => setCcSuggestOpen(true)}
              onBlur={() =>
                setTimeout(() => setCcSuggestOpen(false), 150)
              }
              placeholder="Cari Cost Center..."
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] w-full focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
            />

            {ccSuggestOpen && costCenterSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {costCenterSuggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFilterCostCenter(c);
                      setCcSuggestOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/80"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() =>
            setManualInputOpen(true)
          }
          className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ marginRight: "20px", marginBottom: "10px", marginTop: "10px", padding: "5px 12px" }}
        >
          Manual Input
        </button>

      </div>

      {/* ================= TABLE ================= */}
      <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
        <table className="w-full text-sm border border-gray-300 text-center">
          <thead>
            <tr className="text-xs uppercase tracking-wide bg-gray-50">
              <th className="p-3 font-medium border border-gray-300 text-center">Tanggal</th>
              <th className="p-3 font-medium border border-gray-300 text-center">No PPC</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Nama User</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Email</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Cost Center</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Description</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Amount</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Source</th>
            </tr>
          </thead>

          {loading && <TableSkeleton />}

          {!loading && !error && currentRows.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400 border border-gray-300" >
                  Belum ada data settlement.
                </td>
              </tr>
            </tbody>
          )}

          {!loading && !error && currentRows.length > 0 && (
            <tbody>
              {currentRows.map(
                (row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                      {formatDate(row.tanggal)}
                    </td>
                    <td className="p-3 text-gray-700 border border-gray-300">{row.no_ppc}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{row.email}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{row.cost_center}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{row.description}</td>
                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                      {formatRupiah(row.settlement_amount)}
                    </td>
                    <td className="p-3 border border-gray-300">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${SOURCE_STYLE[
                          row.source
                        ]
                          }`}
                      >
                        {row.source}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          )}
        </table>
      </div>
      {!loading && error && (
        <div className="text-center py-6 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl mt-3">
          Gagal memuat data: {error}
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      {!loading && !error && (
        <div
          className="flex items-center justify-between mt-4 text-sm text-gray-500"
          style={{
            marginLeft: "10px",
            marginRight: "10px",
            marginTop: "10px",
            marginBottom: "10px",
          }}
        >
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

      {/* ================= MODAL ================= */}
      {manualInputOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
              style={{ marginRight: "20px" }}
            >
              <h3
                className="text-lg font-semibold text-gray-700"
                style={{ marginLeft: "20px" }}
              >
                Reimbursement
              </h3>

              <button
                type="button"
                onClick={handleManualClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleManualSubmit}
              className="px-6 py-5 flex flex-col gap-4"
              style={{
                marginRight: "20px",
                marginLeft: "20px",
                marginBottom: "10px",
              }}
            >

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Settlement Date
                </label>

                <input
                  type="date"
                  name="settlement_date"
                  value={manualForm.settlement_date}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  No PPC
                </label>

                <input
                  type="text"
                  name="no_ppc"
                  value={manualForm.no_ppc}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Nama User
                </label>

                <input
                  type="text"
                  name="nama_user"
                  value={manualForm.nama_user}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={manualForm.email}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Cost Center
                </label>

                <input
                  type="text"
                  name="cost_center"
                  value={manualForm.cost_center}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Description
                </label>

                <textarea
                  rows={3}
                  name="description"
                  value={manualForm.description}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Settlement Amount
                </label>

                <input
                  type="number"
                  min="0"
                  name="settlement_amount"
                  value={manualForm.settlement_amount}
                  onChange={handleManualChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Source
                </label>

                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                  Reimbursement
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Manual input hanya untuk data Reimbursement.
                  </span>
                </div>
              </div>

              {manualError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {manualError}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleManualClose}
                  disabled={manualSubmitting}
                  className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  style={{
                    padding: "1px 15px",
                    marginRight: "5px",
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                  style={{
                    padding: "1px 10px",
                  }}
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