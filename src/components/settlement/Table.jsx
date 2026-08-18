import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaPlus
} from "react-icons/fa";

// import {
//   getSettlementList,
//   createReimbursement,
//   deleteReimbursement,
//   toggleSettlementCheck,
//   updateReimbursement,
// } from "../../api/settlement";
// import { generatePPCNumber } from "../../api/advance";

// STYLE
const SOURCE_STYLE = {
  Settlement: "bg-green-100 text-green-700",
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
              <span style={{ marginLeft: "10px" }}>{s}</span>
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
export default function Table({ startDate, endDate, refreshKey, onSummaryUpdate }) {

  // TABLE
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const perPage = 10;

  // FILTER
  const [filterUser, setFilterUser] = useState("");
  const [filterCostCenter, setFilterCostCenter] =
    useState("");
  const [filterStatus, setFilterStatus] = useState("All Source");
  const userInputRef = useRef(null);
  const ccInputRef = useRef(null);

  // MODAL
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualForm, setManualForm] = useState(initialForm);

  // NOTIFIKASI SUKSES (toast) — sama seperti pada Employee.jsx
  const [successMessage, setSuccessMessage] = useState("");

  // SAP CHECKBOX — state disimpan di backend via is_checked
  const toggleSap = async (row) => {
    try {
      const updatedRow = await toggleSettlementCheck(row.id);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, is_checked: updatedRow.is_checked } : r
        )
      );
    } catch (err) {
      console.error("Gagal update checklist:", err);
    }
  };

  // DELETE CONFIRM
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // DELETE BATCH — hapus semua baris yang di-checklist
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);

  // EDIT ROW MODAL
  const [rowToEdit, setRowToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    employee_name: "",
    settlement_date: "",
    cost_center: "",
    description: "",
    settlement_amount: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

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
        id:
          item.id,
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
            ? "Settlement"
            : "Reimbursement",
        is_checked:
          item.is_checked,
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

  // MANUAL INPUT REIMBURSEMENT
  const handleManualChange = async (e) => {
    const { name, value } = e.target;

    if (name !== "settlement_date") {
      setManualForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    let ppcNo = "";
    if (value) {
      try {
        const response = await generatePPCNumber(value);
        ppcNo = response.ppc_no;
      } catch (error) {
        console.error("Gagal generate PPC Number", error);
      }
    }

    setManualForm((prev) => ({
      ...prev,
      settlement_date: value,
      ppc_no: ppcNo,
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
        employee_name:
          manualForm.employee_name,
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
      setSuccessMessage("Reimbursement berhasil ditambahkan.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

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
  const checkedRows = rows.filter((r) => !!r.is_checked);
  const handleDeleteBatchClick = () => {
    setDeleteError("");
    setDeleteBatchOpen(true);
  };

  const handleDeleteBatchCancel = () => {
    setDeleteBatchOpen(false);
    setDeleteError("");
  };

  const handleDeleteBatchConfirm = async () => {
    if (checkedRows.length === 0) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await Promise.all(checkedRows.map((r) => deleteReimbursement(r.id)));
      setDeleteBatchOpen(false);
      loadData();
      setSuccessMessage("Data terpilih berhasil dihapus.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (err) {
      setDeleteError(
        err.response?.data?.detail ||
        "Gagal menghapus data."
      );
    } finally {
      setDeleting(false);
    }
  };

  // EDIT ROW HANDLERS
  const handleEditRowOpen = (row, e) => {
    e.stopPropagation();
    setRowToEdit(row);
    setEditForm({
      employee_name: row.nama_user || "",
      settlement_date: row.tanggal || "",
      cost_center: row.cost_center || "",
      description: row.description || "",
      settlement_amount: row.settlement_amount !== undefined ? String(row.settlement_amount) : "",
    });
    setEditError("");
  };

  const handleEditClose = () => {
    setRowToEdit(null);
    setEditError("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!rowToEdit) return;
    try {
      setEditSubmitting(true);
      setEditError("");
      await updateReimbursement(rowToEdit.id, {
        employee_name: editForm.employee_name || undefined,
        settlement_date: editForm.settlement_date || undefined,
        cost_center: editForm.cost_center || undefined,
        description: editForm.description || undefined,
        settlement_amount: editForm.settlement_amount !== "" ? Number(editForm.settlement_amount) : undefined,
      });
      handleEditClose();
      loadData();
      setSuccessMessage("Data berhasil diperbarui.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setEditError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : (detail || "Gagal menyimpan perubahan."));
    } finally {
      setEditSubmitting(false);
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

      const sourceMatch =
        filterStatus === "All Source" ||
        (row.source || "") === filterStatus;

      return userMatch && ccMatch && sourceMatch;

    });

  }, [rows, filterUser, filterCostCenter, filterStatus]);

  // KPI Summary calculation based on filtered rows
  const computedSummary = useMemo(() => {
    const total = filteredRows.length;
    const advance = filteredRows.filter(
      (r) => r.source === "Settlement" || r.source === "ADVANCE"
    ).length;
    const reimbursement = filteredRows.filter(
      (r) => r.source === "Reimbursement"
    ).length;
    const total_amount = filteredRows.reduce(
      (acc, r) => acc + (Number(r.settlement_amount) || 0),
      0
    );

    return {
      total,
      advance,
      reimbursement,
      total_amount,
      total_settlement: total,
      total_advance: advance,
      total_reimbursement: reimbursement,
      total_settlement_amount: total_amount,
    };
  }, [filteredRows]);

  useEffect(() => {
    if (onSummaryUpdate) {
      onSummaryUpdate(computedSummary);
    }
  }, [computedSummary, onSummaryUpdate]);

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
      {/* NOTIFIKASI SUKSES (toast) — sama seperti pada Employee.jsx */}
      <style>{`
        @keyframes toastIn {
            from { opacity: 0; transform: translate(-50%, -12px); }
            to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {successMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translate(-50%, 0)",
            zIndex: 100,
            background: "#ecfdf5",
            border: "1.5px solid #6ee7b7",
            color: "#047857",
            borderRadius: "10px",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
            animation: "toastIn 0.25s ease",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* ================= FILTER ================= */}

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center" style={{ marginTop: "10px" }}>
            Nama User
          </label>

          <AutocompleteInput
            containerRef={userInputRef}
            value={filterUser}
            onChange={(val) => {
              setFilterUser(val);
              setPage(1);
            }}
            onSelect={(val) => {
              setFilterUser(val);
              setPage(1);
            }}
            suggestions={userSuggestions}
            placeholder="Cari Nama User..."
            wrapperStyle={{ marginLeft: "20px" }}
            inputStyle={{ marginBottom: "10px", padding: "1px 5px" }}
          />

        </div>

        <div className="flex flex-col gap-1">

          <label className="text-xs font-medium text-gray-500 text-center">
            Cost Center
          </label>

          <AutocompleteInput
            containerRef={ccInputRef}
            value={filterCostCenter}
            onChange={(val) => {
              setFilterCostCenter(val);
              setPage(1);
            }}
            onSelect={(val) => {
              setFilterCostCenter(val);
              setPage(1);
            }}
            suggestions={costCenterSuggestions}
            placeholder="Cari Cost Center..."
            inputStyle={{ marginBottom: "10px", padding: "1px 5px" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 text-center">
            Source
          </label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-gray-200"
            style={{ marginBottom: "10px", padding: "1px 5px" }}
          >
            <option value="All Source">All Source</option>
            <option value="Reimbursement">Reimbursement</option>
            <option value="Settlement">Settlement</option>
          </select>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2" style={{ marginBottom: "10px", marginRight: "20px" }}>
          <button
            type="button"
            onClick={() => setManualInputOpen(true)}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ padding: "5px 10px" }}
          >
            <FaPlus className="text-xs" />
            New Reimburse
          </button>

          <button
            type="button"
            onClick={handleDeleteBatchClick}
            disabled={checkedRows.length === 0}
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            style={{ padding: "8px 10px" }}
            title={checkedRows.length === 0 ? "Pilih data terlebih dahulu" : `Hapus ${checkedRows.length} data terpilih`}
          >
            <FaTrash />
          </button>
        </div>

      </div>

      {/* ================= TABLE ================= */}
      <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
        <table className="w-full text-sm border border-gray-300 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide bg-gray-50 text-center">
              <th className="p-3 font-medium border border-gray-300">Tanggal</th>
              <th className="p-3 font-medium border border-gray-300">No PPC</th>
              <th className="p-3 font-medium border border-gray-300">Nama User</th>
              <th className="p-3 font-medium border border-gray-300">Cost Center</th>
              <th className="p-3 font-medium border border-gray-300">Description</th>
              <th className="p-3 font-medium border border-gray-300">Amount</th>
              <th className="p-3 font-medium border border-gray-300">Source</th>
              <th className="p-3 font-medium border border-gray-300">SAP</th>
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
                  <tr
                    key={index}
                    className="hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={(e) => handleEditRowOpen(row, e)}
                  >
                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300" style={{ paddingLeft: "10px" }}>
                      {formatDate(row.tanggal)}
                    </td>
                    <td className="p-3 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.no_ppc}</td>
                    <td className="p-3 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.nama_user}</td>
                    <td className="p-3 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.cost_center}</td>
                    <td className="p-3 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.description}</td>
                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300" style={{ paddingLeft: "10px" }}>
                      {formatRupiah(row.settlement_amount)}
                    </td>
                    <td className="p-3 border border-gray-300" style={{ paddingLeft: "10px" }}>
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${SOURCE_STYLE[
                          row.source
                        ]
                          }`} style={{ paddingLeft: "5px", paddingRight: "5px" }}
                      >
                        {row.source}
                      </span>
                    </td>
                    <td className="p-3 border border-gray-300" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={!!row.is_checked}
                          onChange={() => toggleSap(row)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-gray-600 cursor-pointer"
                        />
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

      {/* MODAL EDIT ROW (Settlement) */}
      {rowToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ borderRadius: "20px" }}>
            <div className="flex items-center justify-between border-b border-gray-200" style={{ padding: "8px 24px 8px", marginRight: "20px" }}>
              <div style={{ marginLeft: "20px" }}>
                <h3 className="text-lg font-semibold text-gray-700">Edit Settlement</h3>
                <p className="text-xs text-gray-400 mt-0.5">PPC No: <span className="font-mono font-semibold text-gray-600">{rowToEdit.no_ppc}</span></p>
              </div>
              <button type="button" onClick={handleEditClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "10px", marginTop: "10px" }}>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>Nama User</label>
                <input
                  type="text"
                  name="employee_name"
                  value={editForm.employee_name}
                  onChange={handleEditChange}
                  className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                  style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>Tanggal Settlement</label>
                <input
                  type="date"
                  name="settlement_date"
                  value={editForm.settlement_date}
                  onChange={handleEditChange}
                  className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                  style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>Cost Center</label>
                <input
                  type="text"
                  name="cost_center"
                  value={editForm.cost_center}
                  onChange={handleEditChange}
                  className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                  style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                  style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "8px" }}>Settlement Amount</label>
                <input
                  type="number"
                  name="settlement_amount"
                  value={editForm.settlement_amount}
                  onChange={handleEditChange}
                  min="0"
                  className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                  style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                />
              </div>

              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100" style={{ padding: "5px 0 5px", gap: "10px" }}>
                <button type="button" onClick={handleEditClose} disabled={editSubmitting}
                  className="border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  style={{ padding: "4px 15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontWeight: 500 }}
                >Batal</button>
                <button type="submit" disabled={editSubmitting}
                  className="text-white rounded-lg text-sm disabled:opacity-40"
                  style={{ padding: "4px 15px", background: "linear-gradient(135deg, #464444c9, #464444c9)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}
                >{editSubmitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL MANUAL INPUT ================= */}
      {
        manualInputOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ borderRadius: "20px" }}>

              {/* Header */}
              <div
                className="flex items-center justify-between border-b border-gray-200"
                style={{ padding: "8px 24px 8px", marginRight: "20px" }}
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
                className="px-6 py-3 flex flex-col gap-2.5"
                style={{
                  marginRight: "20px",
                  marginLeft: "20px",
                  marginBottom: "10px",
                  marginTop: "10px",
                }}
              >
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                    Settlement Date
                  </label>

                  <input
                    type="date"
                    name="settlement_date"
                    value={manualForm.settlement_date}
                    onChange={handleManualChange}
                    required
                    className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none" style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                    PPC Number
                  </label>
                  <input
                    type="text"
                    value={
                      manualForm.ppc_no ||
                      "Pilih tanggal terlebih dahulu"
                    }
                    readOnly
                    className="w-full border border-gray-200 rounded-[10px] text-[13px] bg-gray-50 text-gray-600" style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                    Nama User
                  </label>

                  <input
                    type="text"
                    name="employee_name"
                    value={manualForm.employee_name || ""}
                    onChange={handleManualChange}
                    required
                    className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none" style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                    Cost Center
                  </label>

                  <input
                    type="text"
                    name="cost_center"
                    value={manualForm.cost_center}
                    onChange={handleManualChange}
                    required
                    className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none" style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                    Description
                  </label>

                  <textarea
                    rows={2}
                    name="description"
                    value={manualForm.description}
                    onChange={handleManualChange}
                    required
                    className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none resize-none" style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                    Settlement Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="settlement_amount"
                    value={manualForm.settlement_amount}
                    onChange={handleManualChange}
                    required
                    className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none" style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                  />
                </div>

                {manualError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {manualError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100" style={{ padding: "5px 0 5px", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleManualClose}
                    disabled={manualSubmitting}
                    className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    style={{ padding: "4px 15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontWeight: 500 }}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                    style={{ padding: "4px 15px", background: "linear-gradient(135deg, #464444c9, #464444c9)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}
                  >
                    {manualSubmitting ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )
      }

      {/* ================= MODAL KONFIRMASI HAPUS BATCH ================= */}

      {
        deleteBatchOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: "380px", animation: "slideDown 0.25s ease" }}>
              <div style={{ padding: "20px 20px 15px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>
                  Hapus Data Terpilih
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                  Apakah Anda yakin ingin menghapus{" "}
                  <span style={{ fontWeight: 700, color: "#dc2626" }}>
                    {checkedRows.length} data
                  </span>{" "}
                  yang telah dipilih?
                </p>

                {deleteError && (
                  <div style={{ marginTop: "12px", fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px" }}>
                    {deleteError}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px 24px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={handleDeleteBatchCancel}
                  disabled={deleting}
                  style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 20px", fontSize: "13px", color: "#6b7280", background: "#fff", cursor: "pointer", fontWeight: 500, opacity: deleting ? 0.6 : 1 }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDeleteBatchConfirm}
                  disabled={deleting}
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", borderRadius: "10px",
                    padding: "8px 20px", fontSize: "13px", color: "#fff", cursor: "pointer", fontWeight: 600, opacity: deleting ? 0.6 : 1,
                  }}
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