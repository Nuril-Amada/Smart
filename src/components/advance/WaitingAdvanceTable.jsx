import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaPlus,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaTrash,
} from "react-icons/fa";

// import {
//     getAdvancePpc,
//     createAdvanceRequest,
//     deleteAdvanceRequest,
//     cancelAdvanceRequest,
//     generatePPCNumber,
//     submitSettlement,
//     getSettlementReceipt,
//     updateAdvanceRequest,
// } from "../../api/advance";

const STATUS_STYLE = {
    Active: "bg-blue-100 text-blue-700",
    Settled: "bg-green-100 text-green-700",
    Overdue: "bg-red-100 text-red-700",
    Canceled: "bg-orange-100 text-orange-700",
};

function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(Number(value || 0));
}

function formatDate(isoDate) {
    if (!isoDate) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(isoDate));
}

function TableSkeleton({ cols = 8 }) {
    return (
        <tbody>
            {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j} className="border p-3">
                            <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
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

const initialForm = {
    employee_name: "",
    ppc_no: "",
    request_date: "",
    cost_center: "",
    purpose: "",
    amount: "",
    due_date: "",
};

// Detail popup untuk row dengan status SETTLED (settlement receipt)
function SettlementReceiptModal({ row, receiptData, receiptLoading, onClose }) {
    if (!row) return null;

    const Line = ({ label, value }) => (
        <div className="mb-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-sm text-gray-800 font-medium">{value || "-"}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white shadow-2xl w-full max-w-sm font-mono" style={{ borderRadius: "20px" }}>
                <div className="px-8 py-7" style={{ padding: "20px 20px 15px" }}>
                    <h3 className="text-base font-semibold text-gray-700 mb-1" style={{ margin: "0 0 8px" }}>
                        Settlement Receipt
                    </h3>
                    <div className="border-b border-gray-300 mb-4" />

                    {receiptLoading ? (
                        <div className="text-sm text-gray-400 text-center py-4">Memuat data...</div>
                    ) : receiptData ? (
                        <>
                            <Line label="PPC No" value={receiptData.ppc_no} />
                            <Line label="Employee" value={receiptData.employee_name} />
                            <Line label="Advance Amount" value={formatRupiah(row.jumlah)} />
                            <Line
                                label="Settlement Amount"
                                value={
                                    receiptData.settlement_amount !== undefined &&
                                        receiptData.settlement_amount !== null
                                        ? formatRupiah(receiptData.settlement_amount)
                                        : "-"
                                }
                            />
                            <Line label="Settlement Date" value={formatDate(receiptData.settlement_date)} />
                            <Line label="Description" value={receiptData.description} />
                            <Line label="Status" value="SETTLED" />
                        </>
                    ) : (
                        <div className="text-sm text-red-500 text-center py-4">Gagal memuat data receipt.</div>
                    )}
                </div>

                <div className="flex justify-end px-6 py-4 border-t border-gray-100" style={{ padding: "16px 24px 24px", gap: "10px" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50" style={{ padding: "8px 20px", border: "1.5px solid #e5e7eb", borderRadius: "10px", background: "#fff", cursor: "pointer", fontWeight: 500 }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}


// Form popup untuk row dengan status ACTIVE / OVERDUE (submit settlement)
function SettlementFormModal({
    row,
    form,
    onChange,
    onClose,
    onSubmit,
    submitting,
    error,
}) {
    if (!row) return null;

    const Info = ({ label, value }) => (
        <div className="mb-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-sm text-gray-800 font-medium">{value || "-"}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ borderRadius: "20px" }}>
                <div
                    className="px-8 py-7"
                    style={{ paddingLeft: "20px", paddingRight: "20px", marginTop: "15px" }}
                >
                    <Info label="PPC No" value={row.ppc_no} />
                    <Info label="Employee" value={row.nama_user} />
                    <Info label="Advance Amount" value={formatRupiah(row.jumlah)} />
                    <Info label="Purpose" value={row.keterangan} />
                    <Info label="Deadline Settlement" value={formatDate(row.due_date)} />

                    <div className="border-t border-dashed border-gray-300 my-4" />

                    <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>
                                Settlement Date
                            </label>
                            <input
                                type="date"
                                name="settlement_date"
                                value={form.settlement_date}
                                onChange={onChange}
                                required
                                className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                style={{ padding: "9px 12px", borderWidth: "1.5px" }}
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>
                                Settlement Amount
                            </label>
                            <input
                                type="number"
                                name="settlement_amount"
                                value={form.settlement_amount}
                                onChange={onChange}
                                placeholder="0"
                                min="0"
                                required
                                className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                style={{ padding: "9px 12px", borderWidth: "1.5px" }}
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "6px" }}>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={onChange}
                                rows={3}
                                placeholder="Contoh: Biaya transport dan akomodasi"
                                required
                                className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                                style={{ padding: "9px 12px", borderWidth: "1.5px" }}
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100" style={{ padding: "10px 24px 24px", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                style={{ padding: "4px 15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", background: "#fff", cursor: "pointer", fontWeight: 500 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                                style={{ padding: "4px 15px", background: "linear-gradient(135deg, #464444c9, #464444c9)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}
                            >
                                {submitting ? "Menyimpan..." : "Submit Settlement"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}


export default function Table({ startDate, endDate, refreshKey, setRefreshKey, onSummaryUpdate }) {
    // ================= TABLE 1: ADVANCE =================
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);
    const perPage = 10;

    const [filterUser, setFilterUser] = useState("");
    const [filterCostCenter, setFilterCostCenter] = useState("");
    const [filterStatus, setFilterStatus] = useState("All Status");

    const userInputRef = useRef(null);
    const ccInputRef = useRef(null);

    const [requestOpen, setRequestOpen] = useState(false);
    const [requestForm, setRequestForm] = useState(initialForm);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestError, setRequestError] = useState("");

    // NOTIFIKASI SUKSES (toast) — sama seperti pada Employee.jsx
    const [successMessage, setSuccessMessage] = useState("");

    // DELETE — mode seleksi batch
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // toggle satu baris
    const toggleSelectRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // aktifkan / matikan mode hapus
    const handleEnterDeleteMode = () => {
        setDeleteMode(true);
        setSelectedIds(new Set());
        setDeleteError("");
    };

    const handleExitDeleteMode = () => {
        setDeleteMode(false);
        setSelectedIds(new Set());
        setDeleteError("");
    };

    // CANCEL CONFIRM
    const [rowToCancel, setRowToCancel] = useState(null);
    const [canceling, setCanceling] = useState(false);
    const [cancelError, setCancelError] = useState("");

    // STATUS DETAIL POPUP (Settled)
    const [rowToShowSettlement, setRowToShowSettlement] = useState(null);
    const [receiptData, setReceiptData] = useState(null);
    const [receiptLoading, setReceiptLoading] = useState(false);

    // STATUS FORM POPUP (Active / Overdue -> submit settlement)
    const [rowToSettle, setRowToSettle] = useState(null);
    const [settlementForm, setSettlementForm] = useState({
        settlement_date: "",
        settlement_amount: "",
        description: "",
    });
    const [settlementSubmitting, setSettlementSubmitting] = useState(false);
    const [settlementError, setSettlementError] = useState("");

    // EDIT ROW MODAL
    const [rowToEdit, setRowToEdit] = useState(null);
    const [editForm, setEditForm] = useState({
        employee_name: "",
        cost_center: "",
        purpose: "",
        amount: "",
        due_date: "",
    });
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const result = await getAdvancePpc({
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });

            const data = result.map((item) => ({
                id: item.id,
                ppc_no: item.ppc_no,
                tanggal: item.request_date,
                nama_user: item.employee_name,
                cost_center: item.cost_center,
                keterangan: item.purpose,
                jumlah: Number(item.amount),
                due_date: item.due_date,
                tgl_penyelesaian: item.settlement_date,
                settlement_amount:
                    item.settlement_amount !== undefined && item.settlement_amount !== null
                        ? Number(item.settlement_amount)
                        : null,
                created_by: item.created_by,

                status:
                    item.status === "ACTIVE"
                        ? "Active"
                        : item.status === "SETTLED"
                            ? "Settled"
                            : item.status === "OVERDUE"
                                ? "Overdue"
                                : "Canceled",
            }));

            setRows(data);
            setPage(1);
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.detail || "Gagal memuat data advance."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, refreshKey]);

    const userSuggestions = useMemo(() => {
        if (!filterUser) return [];
        const q = filterUser.toLowerCase();
        const unique = Array.from(
            new Set(rows.map((r) => r.nama_user).filter(Boolean))
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
            new Set(rows.map((r) => r.cost_center).filter(Boolean))
        );
        return unique
            .filter((cc) => cc.toLowerCase().includes(q))
            .filter((cc) => cc.toLowerCase() !== q)
            .slice(0, 8);
    }, [rows, filterCostCenter]);

    // calculate due date
    const calculateDueDate = (requestDateString) => {
        const dueDate = new Date(requestDateString);
        let workingDays = 0;
        while (workingDays < 2) {
            // tambah 1 hari
            dueDate.setDate(dueDate.getDate() + 1);
            // Minggu = 0
            // Senin = 1
            // ...
            // Sabtu = 6
            const day = dueDate.getDay();
            // hanya hitung hari kerja
            if (day !== 0 && day !== 6) {
                workingDays++;
            }
        }
        return dueDate.toISOString().split("T")[0];
    };

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

        // AUTO GENERATE DUE DATE (+2 HARI KERJA)
        let dueDate = "";

        if (value) {
            dueDate = calculateDueDate(value);
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

    const handleRequestClose = () => {
        setRequestForm(initialForm);
        setRequestError("");
        setRequestOpen(false);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();

        try {
            setRequestSubmitting(true);
            setRequestError("");

            const payload = {
                employee_name: requestForm.employee_name,
                request_date: requestForm.request_date,
                cost_center: requestForm.cost_center,
                purpose: requestForm.purpose,
                amount: Number(requestForm.amount),
                due_date: requestForm.due_date,
            };

            await createAdvanceRequest(payload);

            handleRequestClose();
            loadData();
            setSuccessMessage("Request berhasil ditambahkan.");
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000);

        } catch (err) {

            console.error(err);
            console.error(err.response?.data);

            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setRequestError(
                    detail.map((item) => item.msg).join(", ")
                );
            } else {
                setRequestError(
                    detail || "Gagal menyimpan data advance."
                );
            }

        } finally {
            setRequestSubmitting(false);
        }
    };

    // ACTION: BATAL (dengan konfirmasi)
    const handleCancelClick = (row) => {
        setRowToCancel(row);
        setCancelError("");
    };

    const handleCancelDismiss = () => {
        setRowToCancel(null);
        setCancelError("");
    };

    const handleCancelConfirm = async () => {
        if (!rowToCancel) return;

        try {
            setCanceling(true);
            setCancelError("");

            await cancelAdvanceRequest(rowToCancel.id);

            setRowToCancel(null);

            loadData();
            setSuccessMessage("Request berhasil dibatalkan.");
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000);

        } catch (err) {
            console.error(err);
            setCancelError(
                err.response?.data?.detail || "Gagal membatalkan data."
            );
        } finally {
            setCanceling(false);
        }
    };

    // ACTION: HAPUS BATCH
    const handleDeleteBatchConfirm = async () => {
        if (selectedIds.size === 0) return;

        try {

            setDeleting(true);
            setDeleteError("");
            await Promise.all([...selectedIds].map((id) => deleteAdvanceRequest(id)));
            setDeleteBatchOpen(false);
            setDeleteMode(false);
            setSelectedIds(new Set());
            loadData();
            setSuccessMessage("Data terpilih berhasil dihapus.");
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000);

        } catch (err) {
            setDeleteError(
                err.response?.data?.detail || "Gagal menghapus data."
            );
        } finally {
            setDeleting(false);
        }
    };

    // STATUS BADGE CLICK
    const handleStatusClick = async (row) => {
        if (row.status === "Settled") {
            setRowToShowSettlement(row);
            setReceiptData(null);
            setReceiptLoading(true);
            try {
                const data = await getSettlementReceipt(row.id);
                setReceiptData(data);
            } catch (err) {
                console.error("Gagal memuat receipt:", err);
                setReceiptData(null);
            } finally {
                setReceiptLoading(false);
            }
        } else if (row.status === "Active" || row.status === "Overdue") {
            setRowToSettle(row);
            setSettlementForm({
                settlement_date: "",
                settlement_amount: "",
                description: "",
            });
            setSettlementError("");
        }
    };

    const handleSettlementChange = (e) => {
        const { name, value } = e.target;
        setSettlementForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSettlementClose = () => {
        setRowToSettle(null);
        setSettlementForm({
            settlement_date: "",
            settlement_amount: "",
            description: "",
        });
        setSettlementError("");
    };

    // EDIT ROW HANDLERS
    const handleEditRowOpen = (row, e) => {
        e.stopPropagation();
        setRowToEdit(row);
        setEditForm({
            employee_name: row.nama_user || "",
            cost_center: row.cost_center || "",
            purpose: row.keterangan || "",
            amount: row.jumlah !== undefined ? String(row.jumlah) : "",
            due_date: row.due_date || "",
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
            await updateAdvanceRequest(rowToEdit.id, {
                employee_name: editForm.employee_name || undefined,
                cost_center: editForm.cost_center || undefined,
                purpose: editForm.purpose || undefined,
                amount: editForm.amount !== "" ? Number(editForm.amount) : undefined,
                due_date: editForm.due_date || undefined,
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

    const handleSettlementSubmit = async (e) => {
        e.preventDefault();
        if (!rowToSettle) return;

        try {
            setSettlementSubmitting(true);
            setSettlementError("");

            const payload = {
                settlement_date: settlementForm.settlement_date,
                settlement_amount: Number(settlementForm.settlement_amount),
                description: settlementForm.description,
            };

            await submitSettlement(rowToSettle.id, payload);

            handleSettlementClose();
            setSuccessMessage("Settlement berhasil disimpan.");
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000);
            loadData();

        } catch (err) {
            console.error(err);

            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setSettlementError(detail.map((item) => item.msg).join(", "));
            } else {
                setSettlementError(detail || "Gagal menyimpan settlement.");
            }

        } finally {
            setSettlementSubmitting(false);
        }
    };

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
                filterStatus === "All Status" || row.status === filterStatus;

            return userMatch && ccMatch && sourceMatch;
        });
    }, [rows, filterUser, filterCostCenter, filterStatus]);

    // Saat filter berubah di mode hapus, otomatis kurangi selectedIds
    // hanya ke baris yang masih terlihat di filteredRows (tidak keluar filter)
    useEffect(() => {
        if (!deleteMode) return;
        setSelectedIds((prev) => {
            if (prev.size === 0) return prev;
            const filteredIdSet = new Set(filteredRows.map((r) => r.id));
            const next = new Set([...prev].filter((id) => filteredIdSet.has(id)));
            // kembalikan referensi lama jika tidak ada perubahan (optimasi re-render)
            return next.size === prev.size ? prev : next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredRows]);

    const computedSummary = useMemo(() => {
        const total_advance = filteredRows.length;
        const active_advance = filteredRows.filter((r) => r.status === "Active").length;
        const overdue_advance = filteredRows.filter((r) => r.status === "Overdue").length;
        const outstanding_amount = filteredRows
            .filter((r) => r.status === "Active" || r.status === "Overdue")
            .reduce((acc, r) => acc + (Number(r.jumlah) || 0), 0);

        return {
            total_advance,
            active_advance,
            overdue_advance,
            outstanding_amount,
        };
    }, [filteredRows]);

    useEffect(() => {
        if (onSummaryUpdate) {
            onSummaryUpdate(computedSummary);
        }
    }, [computedSummary, onSummaryUpdate]);

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentRows = filteredRows.slice((page - 1) * perPage, page * perPage);
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);

    const visiblePages = [];
    for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

    return (
        <>
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

            {/* ================= TABLE 1: ADVANCE ================= */}
            <div
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
                style={{ marginLeft: "20px", marginRight: "20px" }}
            >
                {/* FILTER */}
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
                        <label className="text-xs font-medium text-gray-500 text-center">Cost Center</label>

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
                        <label className="text-xs font-medium text-gray-500 text-center">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setPage(1);
                            }}
                            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-gray-200"
                            style={{ marginBottom: "10px", padding: "1px 5px" }}
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Settled</option>
                            <option>Overdue</option>
                            <option>Canceled</option>
                        </select>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2" style={{ marginBottom: "10px", marginRight: "20px" }}>
                        {/* Button New Request — disembunyikan saat mode hapus aktif */}
                        {!deleteMode && (
                            <button
                                type="button"
                                onClick={() => setRequestOpen(true)}
                                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                                style={{ padding: "5px 10px" }}
                            >
                                <FaPlus className="text-xs" />
                                New Request
                            </button>
                        )}

                        {/* Mode hapus TIDAK aktif → tampilkan tombol trash */}
                        {!deleteMode && (
                            <button
                                type="button"
                                onClick={handleEnterDeleteMode}
                                className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-lg transition-colors"
                                style={{ padding: "8px 10px" }}
                                title="Pilih data untuk dihapus"
                            >
                                <FaTrash />
                            </button>
                        )}

                        {/* Mode hapus AKTIF → tombol Batal + Hapus */}
                        {deleteMode && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleExitDeleteMode}
                                    className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
                                    style={{ padding: "5px 10px" }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setDeleteError(""); setDeleteBatchOpen(true); }}
                                    disabled={selectedIds.size === 0}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                                    style={{ padding: "5px 10px" }}
                                    title={selectedIds.size === 0 ? "Pilih data terlebih dahulu" : `Hapus ${selectedIds.size} data terpilih`}
                                >
                                    <FaTrash className="text-xs" />
                                    Hapus {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const allFilteredIds = new Set(filteredRows.map((r) => r.id));
                                        const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));
                                        if (allSelected) {
                                            setSelectedIds(new Set());
                                        } else {
                                            setSelectedIds(allFilteredIds);
                                        }
                                    }}
                                    disabled={filteredRows.length === 0}
                                    className="flex items-center gap-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        padding: "5px 10px",
                                        border: "1.5px solid #dc2626",
                                        color: "#dc2626",
                                        background: "#fff",
                                        cursor: "pointer",
                                    }}
                                    title={
                                        filteredRows.every((r) => selectedIds.has(r.id)) && filteredRows.length > 0
                                            ? "Batalkan pilih semua"
                                            : `Pilih semua ${filteredRows.length} data yang terfilter`
                                    }
                                >
                                    {filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id))
                                        ? "Batal Pilih Semua"
                                        : `Pilih Semua (${filteredRows.length})`}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* TABLE */}
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
                                <th className="p-3 font-medium border border-gray-300">Due Date</th>
                                <th className="p-3 font-medium border border-gray-300">Status</th>
                                <th className="p-3 font-medium border border-gray-300">Action</th>
                            </tr>
                        </thead>

                        {loading && <TableSkeleton cols={8} />}

                        {!loading && !error && currentRows.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan={deleteMode ? 10 : 9} className="p-8 text-center text-gray-400 border border-gray-300">
                                        Belum ada data advance.
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!loading && !error && currentRows.length > 0 && (
                            <tbody>
                                {currentRows.map((row, index) => (
                                    <tr
                                        key={index}
                                        className={`hover:bg-gray-100 cursor-pointer transition-colors ${deleteMode && selectedIds.has(row.id) ? "bg-red-50" : ""}`}
                                        onClick={(e) => deleteMode ? toggleSelectRow(row.id) : handleEditRowOpen(row, e)}
                                    >
                                        <td className="py-3 px-5 text-gray-700 whitespace-nowrap border border-gray-300" style={{ paddingLeft: "10px" }}>
                                            {formatDate(row.tanggal)}
                                        </td>
                                        <td className="py-3 px-5 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.ppc_no}</td>
                                        <td className="py-3 px-5 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.nama_user}</td>
                                        <td className="py-3 px-5 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.cost_center}</td>
                                        <td className="py-3 px-5 text-gray-700 border border-gray-300" style={{ paddingLeft: "10px" }}>{row.keterangan}</td>
                                        <td className="py-3 px-5 text-gray-700 whitespace-nowrap border border-gray-300" style={{ paddingLeft: "10px" }}>
                                            {formatRupiah(row.jumlah)}
                                        </td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300" style={{ paddingLeft: "10px" }}>
                                            {formatDate(row.due_date)}
                                        </td>
                                        <td className="py-3 px-5 border border-gray-300" style={{ paddingLeft: "10px" }}>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusClick(row);
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[row.status] || "bg-gray-100 text-gray-600"} ${row.status === "Settled" || row.status === "Active" || row.status === "Overdue" ? "cursor-pointer hover:opacity-75" : ""}`}
                                                style={{ padding: "1px 3px" }}
                                            >
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCancelClick(row);
                                                    }}
                                                    disabled={row.status === "Canceled"}
                                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap"
                                                    style={{ padding: "1px 3px" }}
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </td>
                                        {/* Kolom checkbox seleksi hapus — hanya muncul saat deleteMode */}
                                        {deleteMode && (
                                            <td className="p-3 border border-gray-300 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(row.id)}
                                                    onChange={() => toggleSelectRow(row.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 accent-red-600 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>

                {!loading && error && (
                    <div className="text-center py-6 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl mt-3">
                        Gagal memuat data: {error}
                    </div>
                )}

                {/* PAGINATION */}
                {!loading && !error && (
                    <div
                        className="flex items-center justify-between mt-4 text-sm text-gray-500"
                        style={{ marginLeft: "10px", marginRight: "10px", marginTop: "10px", marginBottom: "10px" }}
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



                {/* MODAL New Request (Advance) */}
                {requestOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto">
                            <div
                                className="flex items-center justify-between border-b border-gray-200"
                                style={{ padding: "8px 24px 8px", marginRight: "20px" }}
                            >
                                <h3 className="text-lg font-semibold text-gray-700" style={{ marginLeft: "20px" }}>
                                    New Request
                                </h3>
                                <button type="button" onClick={handleRequestClose} className="text-gray-400 hover:text-gray-600">
                                    <FaTimes />
                                </button>
                            </div>

                            <form
                                onSubmit={handleRequestSubmit}
                                className="px-6 py-2 flex flex-col gap-1.5"
                                style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "6px", marginTop: "6px" }}
                            >
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>Tanggal</label>
                                    <input
                                        type="date"
                                        name="request_date"
                                        value={requestForm.request_date}
                                        onChange={handleRequestChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>PPC Number</label>
                                    <input
                                        type="text"
                                        value={
                                            requestForm.ppc_no ||
                                            "Pilih tanggal terlebih dahulu"
                                        }
                                        readOnly
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] bg-gray-50"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>Nama User</label>
                                    <input
                                        type="text"
                                        name="employee_name"
                                        value={requestForm.employee_name}
                                        onChange={handleRequestChange}
                                        placeholder="Andi Pratama"
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>Cost Center</label>
                                    <input
                                        type="text"
                                        name="cost_center"
                                        value={requestForm.cost_center}
                                        onChange={handleRequestChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>Description</label>
                                    <textarea
                                        name="purpose"
                                        value={requestForm.purpose}
                                        onChange={handleRequestChange}
                                        rows={3}
                                        placeholder="Contoh: Advance perjalanan dinas"
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>Advance Amount</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={requestForm.amount}
                                        onChange={handleRequestChange}
                                        min="0"
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "2px" }}>Due Date</label>
                                    <input
                                        type="date"
                                        name="due_date"
                                        value={requestForm.due_date}
                                        onChange={handleRequestChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "3px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                {requestError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        {requestError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 mt-0 pt-2 border-t border-gray-100" style={{ padding: "5px 0 5px", gap: "10px" }}>
                                    <button
                                        type="button"
                                        onClick={handleRequestClose}
                                        disabled={requestSubmitting}
                                        className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                        style={{ padding: "4px 15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontWeight: 500 }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={requestSubmitting}
                                        className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                                        style={{ padding: "4px 15px", background: "linear-gradient(135deg, #464444c9, #464444c9)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}
                                    >
                                        {requestSubmitting ? "Menyimpan..." : "Simpan"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL Konfirmasi Batal */}
                {rowToCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" >
                        <div className="bg-white rounded-none shadow-lg w-full max-w-sm" style={{ borderRadius: "20px" }}>
                            <div className="px-8 py-7" style={{ padding: "20px 20px 15px" }}>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2" style={{ margin: "0 0 8px" }}>
                                    Batalkan Request
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Apakah kamu yakin ingin membatalkan data advance atas nama{" "}
                                    <span className="font-medium text-gray-700">
                                        {rowToCancel.nama_user}
                                    </span>{" "}
                                </p>

                                {cancelError && (
                                    <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        {cancelError}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100" style={{ padding: "16px 24px 24px", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={handleCancelDismiss}
                                    disabled={canceling}
                                    className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40" style={{ padding: "8px 20px", border: "1.5px solid #e5e7eb", borderRadius: "10px", background: "#fff", cursor: "pointer", fontWeight: 500 }}
                                >
                                    Tutup
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancelConfirm}
                                    disabled={canceling}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2" style={{ padding: "8px 20px", background: "linear-gradient(135deg, #f97316, #ea580c)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}
                                >
                                    {canceling ? "Membatalkan..." : "Ya, Batalkan"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL Konfirmasi Hapus Batch */}
                {deleteBatchOpen && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                        <div style={{ background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: "380px", animation: "slideDown 0.25s ease" }}>
                            <div style={{ padding: "20px 20px 15px" }}>
                                <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>
                                    Hapus Data Terpilih
                                </h3>
                                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                                    Apakah Anda yakin ingin menghapus{" "}
                                    <span style={{ fontWeight: 700, color: "#dc2626" }}>
                                        {selectedIds.size} data
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
                                    onClick={() => {
                                        setDeleteBatchOpen(false);
                                        handleExitDeleteMode();
                                    }}
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
                )}

                {/* MODAL Detail Settlement (klik status Settled) */}
                <SettlementReceiptModal
                    row={rowToShowSettlement}
                    receiptData={receiptData}
                    receiptLoading={receiptLoading}
                    onClose={() => {
                        setRowToShowSettlement(null);
                        setReceiptData(null);
                    }}
                />

                {/* MODAL Form Settlement (klik status Active / Overdue) */}
                <SettlementFormModal
                    row={rowToSettle}
                    form={settlementForm}
                    onChange={handleSettlementChange}
                    onClose={handleSettlementClose}
                    onSubmit={handleSettlementSubmit}
                    submitting={settlementSubmitting}
                    error={settlementError}
                />

                {/* MODAL Edit Advance Row */}
                {rowToEdit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ borderRadius: "20px" }}>
                            <div
                                className="flex items-center justify-between border-b border-gray-200"
                                style={{ padding: "8px 24px 8px", marginRight: "20px" }}
                            >
                                <h3 className="text-lg font-semibold text-gray-700" style={{ marginLeft: "20px" }}>
                                    Edit Advance Request
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleEditClose}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form
                                onSubmit={handleEditSubmit}
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
                                        PPC Number
                                    </label>
                                    <input
                                        type="text"
                                        value={rowToEdit.ppc_no || "-"}
                                        readOnly
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] bg-gray-50 text-gray-600"
                                        style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                                        Nama User
                                    </label>
                                    <input
                                        type="text"
                                        name="employee_name"
                                        value={editForm.employee_name}
                                        onChange={handleEditChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                                        Cost Center
                                    </label>
                                    <input
                                        type="text"
                                        name="cost_center"
                                        value={editForm.cost_center}
                                        onChange={handleEditChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                                        Purpose / Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        name="purpose"
                                        value={editForm.purpose}
                                        onChange={handleEditChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                                        style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                                        Amount
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="amount"
                                        value={editForm.amount}
                                        onChange={handleEditChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700" style={{ marginBottom: "3px" }}>
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        name="due_date"
                                        value={editForm.due_date ? editForm.due_date.split("T")[0] : ""}
                                        onChange={handleEditChange}
                                        required
                                        className="w-full border border-gray-200 rounded-[10px] text-[13px] focus:ring-2 focus:ring-blue-600 outline-none"
                                        style={{ padding: "5px 12px", borderWidth: "1.5px" }}
                                    />
                                </div>

                                {editError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        {editError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100" style={{ padding: "5px 0 5px", gap: "10px" }}>
                                    <button
                                        type="button"
                                        onClick={handleEditClose}
                                        disabled={editSubmitting}
                                        className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                        style={{ padding: "4px 15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontWeight: 500 }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editSubmitting}
                                        className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                                        style={{ padding: "4px 15px", background: "linear-gradient(135deg, #464444c9, #464444c9)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}
                                    >
                                        {editSubmitting ? "Menyimpan..." : "Simpan"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}