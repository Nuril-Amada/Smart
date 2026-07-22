import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
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

// AUTOCOMPLETE DROPDOWN
function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  containerRef,
  inputStyle,
  wrapperStyle,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const handleChange = (e) => {
    onChange(e.target.value);
    setOpen(true);
    setHighlight(-1);
  };

  const handleSelect = (val) => {
    onSelect(val);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (highlight >= 0) {
        e.preventDefault();
        handleSelect(suggestions[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef} style={wrapperStyle}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
        style={inputStyle}
      />

      {open && value && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full min-w-[160px] max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-md py-1">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => handleSelect(s)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === highlight
                ? "bg-gray-100 text-gray-800"
                : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// INITIAL FORM
const initialForm = {
  settlement_date: "",
  ppc_no: "",
  employee_name: "",
  cost_center: "",
  description: "",
  settlement_amount: "",
};

// COMPONENT
export default function Table({ startDate, endDate, refreshKey }) {

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

  const userInputRef = useRef(null);
  const ccInputRef = useRef(null);

  // MODAL
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualForm, setManualForm] = useState(initialForm);

  // SAP CHECKBOX (key = no_ppc, biar konsisten walau pindah halaman/filter)
  const [sapChecked, setSapChecked] = useState({});

  const toggleSap = (key) => {
    setSapChecked((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // DELETE CONFIRM
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  // CLOSE DROPDOWN ON OUTSIDE CLICK IS HANDLED VIA onMouseDown + onBlur pattern
  // but since we use onMouseDown on options (fires before blur), no extra
  // document listener is needed here.

  // AUTOCOMPLETE SUGGESTIONS
  const userSuggestions = useMemo(() => {
    if (!filterUser) return [];

    const q = filterUser.toLowerCase();
    const unique = Array.from(
      new Set(
        rows
          .map((r) => r.nama_user)
          .filter(Boolean)
      )
    );

    return unique
      .filter((name) => name.toLowerCase().includes(q))
      .filter((name) => name.toLowerCase() !== q)
      .slice(0, 8);
  }, [rows, filterUser]);

  const costCenterSuggestions = useMemo(() => {
    if (!filterCostCenter) return [];

    const q = filterCostCenter.toLowerCase();
    const unique = Array.from(
      new Set(
        rows
          .map((r) => r.cost_center)
          .filter(Boolean)
      )
    );

    return unique
      .filter((cc) => cc.toLowerCase().includes(q))
      .filter((cc) => cc.toLowerCase() !== q)
      .slice(0, 8);
  }, [rows, filterCostCenter]);

  const handleRequestChange = async (e) => {
    const { name, value } = e.target;

    // Jika field selain request_date
    if (name !== "request_date") {
      setRequestForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }
    // AUTO GENERATE PPC NUMBER

    try {
      const response = await generatePPCNumber(
        value
      );

      setRequestForm((prev) => ({
        ...prev,
        request_date: value,
        due_date: dueDate,
        ppc_no: response.ppc_no,
      }));

    } catch (error) {

      console.error(
        "Gagal generate PPC Number",
        error
      );

      setRequestForm((prev) => ({
        ...prev,
        request_date: value,
        due_date: dueDate,
      }));
    }
  };

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

  // ACTION: HAPUS (dengan konfirmasi)
  const handleDeleteClick = (row) => {
    setRowToDelete(row);
    setDeleteError("");
  };

  const handleDeleteCancel = () => {
    setRowToDelete(null);
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    if (!rowToDelete) return;

    try {

      setDeleting(true);
      setDeleteError("");

      await deleteAdvanceRequest(
        rowToDelete.id
      );

      setRowToDelete(null);

      loadData();

    } catch (err) {

      setDeleteError(
        err.response?.data?.detail ||
        "Gagal menghapus data."
      );

    } finally {

      setDeleting(false);

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

  }, [rows, filterUser, filterCostCenter]);

  // PAGINATION
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentRows = filteredRows.slice((page - 1) * perPage, page * perPage);
  const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, total);

  const visiblePages = [];
  for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

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

          <AutocompleteInput
            containerRef={userInputRef}
            value={filterUser}
            onChange={setFilterUser}
            onSelect={setFilterUser}
            suggestions={userSuggestions}
            placeholder="Cari Nama User..."
            wrapperStyle={{ marginLeft: "20px" }}
            inputStyle={{ marginBottom: "10px" }}
          />

        </div>

        <div className="flex flex-col gap-1">

          <label className="text-xs font-medium text-gray-500 text-center">
            Cost Center
          </label>

          <AutocompleteInput
            containerRef={ccInputRef}
            value={filterCostCenter}
            onChange={setFilterCostCenter}
            onSelect={setFilterCostCenter}
            suggestions={costCenterSuggestions}
            placeholder="Cari Cost Center..."
            inputStyle={{ marginBottom: "10px" }}
          />

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
              <th className="p-3 font-medium border border-gray-300 text-center">Cost Center</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Description</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Amount</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Source</th>
              <th className="p-3 font-medium border border-gray-300 text-center">Action</th>
            </tr>
          </thead>

          {loading && <TableSkeleton />}

          {!loading && !error && currentRows.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400 border border-gray-300" >
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
                    <td className="p-3 text-gray-700 border border-gray-300">{row.ppc_no}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
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
                    <td className="p-3 border border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!sapChecked[row.no_ppc]}
                          onChange={() => toggleSap(row.no_ppc)}
                          className="w-4 h-4 accent-gray-600 cursor-pointer"
                        />

                        <button
                          type="button"
                          onClick={() => handleDeleteClick(row)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md" style={{ padding: "5px 5px" }}
                          title="Hapus"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          )}
        </table>
      </div>
      {
        !loading && error && (
          <div className="text-center py-6 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl mt-3">
            Gagal memuat data: {error}
          </div>
        )
      }

      {/* ================= PAGINATION ================= */}
      {
        !loading && !error && (
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
        )
      }

      {/* ================= MODAL MANUAL INPUT ================= */}
      {
        manualInputOpen && (
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
        )
      }

      {/* ================= MODAL KONFIRMASI HAPUS ================= */}
      {/* FIX: dipindah keluar dari blok manualInputOpen, jadi sibling langsung */}
      {/* dari elemen di atas, supaya bisa muncul terlepas dari status modal */}
      {/* Manual Input / Reimbursement */}
      {
        rowToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm">
              <div className="px-8 py-7" style={{ paddingLeft: "20px", paddingRight: "20px", marginTop: "15px" }}>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Hapus Data
                </h3>
                <p className="text-sm text-gray-500">
                  Apakah anda yakin ingin menghapus data settlement atas nama{" "}
                  <span className="font-medium text-gray-700">
                    {rowToDelete.nama_user}
                  </span>{" "}
                </p>

                {deleteError && (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {deleteError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100" style={{ marginBottom: "10px", marginRight: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40" style={{ padding: "5px 7px" }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2" style={{ padding: "5px 7px" }}
                >
                  {deleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}