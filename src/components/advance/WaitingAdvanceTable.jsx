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
//     getSettlementReceipt
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
                            {s}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm font-mono">
                <div className="px-8 py-7" style={{ paddingLeft: "20px", paddingRight: "20px", marginTop: "15px" }}>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">
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

                <div className="flex justify-end px-6 py-4 border-t border-gray-100" style={{ marginBottom: "10px", marginRight: "10px", marginTop: "10px" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50" style={{ padding: "5px 7px" }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto">
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
                            <label className="block text-sm text-gray-600 mb-1">
                                Settlement Date
                            </label>
                            <input
                                type="date"
                                name="settlement_date"
                                value={form.settlement_date}
                                onChange={onChange}
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
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
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={onChange}
                                rows={3}
                                placeholder="Contoh: Biaya transport dan akomodasi"
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100" style={{ marginBottom: "10px", marginRight: "10px", marginTop: "10px" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                style={{ padding: "5px 7px" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                                style={{ padding: "5px 7px" }}
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


export default function Table({ startDate, endDate, refreshKey }) {
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

    // DELETE CONFIRM
    const [rowToDelete, setRowToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

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

        } catch (err) {
            console.error(err);
            setCancelError(
                err.response?.data?.detail || "Gagal membatalkan data."
            );
        } finally {
            setCanceling(false);
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

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentRows = filteredRows.slice((page - 1) * perPage, page * perPage);
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);

    const visiblePages = [];
    for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

    return (
        <>
            {/* ================================================= */}
            {/* ================= TABLE 1: ADVANCE ================= */}
            {/* ================================================= */}
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
                            inputStyle={{ marginBottom: "10px" }}
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
                            inputStyle={{ marginBottom: "10px" }}
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
                            style={{ marginBottom: "10px" }}
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Settled</option>
                            <option>Overdue</option>
                            <option>Canceled</option>
                        </select>
                    </div>

                    <div className="flex-1" />

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

                {/* TABLE */}
                <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
                    <table className="w-full text-sm border border-gray-300 text-center">
                        <thead>
                            <tr className="text-xs uppercase tracking-wide bg-gray-50">
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
                                    <td colSpan={8} className="p-8 text-center text-gray-400 border border-gray-300">
                                        Belum ada data advance.
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!loading && !error && currentRows.length > 0 && (
                            <tbody>
                                {currentRows.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatDate(row.tanggal)}
                                        </td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.ppc_no}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.cost_center}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.keterangan}</td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatRupiah(row.jumlah)}
                                        </td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatDate(row.due_date)}
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <span
                                                onClick={() => handleStatusClick(row)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[row.status] || "bg-gray-100 text-gray-600"
                                                    } ${row.status === "Settled" || row.status === "Active" || row.status === "Overdue" ? "cursor-pointer hover:opacity-75" : ""}`} style={{ padding: "1px 3px" }}
                                            >
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelClick(row)}
                                                    disabled={row.status === "Canceled"}
                                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap" style={{ padding: "1px 3px" }}
                                                >
                                                    Batal
                                                </button>

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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200" style={{ marginRight: "20px" }}>
                                <h3 className="text-lg font-semibold text-gray-700" style={{ marginLeft: "20px" }}>
                                    New Request
                                </h3>
                                <button type="button" onClick={handleRequestClose} className="text-gray-400 hover:text-gray-600">
                                    <FaTimes />
                                </button>
                            </div>

                            <form
                                onSubmit={handleRequestSubmit}
                                className="px-6 py-5 flex flex-col gap-4"
                                style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "10px" }}
                            >
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        PPC Number
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            requestForm.ppc_no ||
                                            "Pilih tanggal terlebih dahulu"
                                        }
                                        readOnly
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        name="request_date"
                                        value={requestForm.request_date}
                                        onChange={handleRequestChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Nama User</label>
                                    <input
                                        type="text"
                                        name="employee_name"
                                        value={requestForm.employee_name}
                                        onChange={handleRequestChange}
                                        placeholder="Andi Pratama"
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
                                        name="purpose"
                                        value={requestForm.purpose}
                                        onChange={handleRequestChange}
                                        rows={3}
                                        placeholder="Contoh: Advance perjalanan dinas"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Jumlah</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={requestForm.amount}
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
                                            Request baru selalu dimulai dengan status Active. Berubah otomatis oleh sistem (Settled saat reimbursement selesai, Overdue jika melewati 2 hari). Tgl Penyelesaian ikut ke-isi otomatis saat status jadi Settled.
                                        </span>
                                    </div>
                                </div>

                                {requestError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        {requestError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleRequestClose}
                                        disabled={requestSubmitting}
                                        className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                        style={{ padding: "1px 15px", marginRight: "5px" }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={requestSubmitting}
                                        className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                                        style={{ padding: "1px 10px" }}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" >
                        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm">
                            <div className="px-8 py-7" style={{ paddingLeft: "20px", paddingRight: "20px", marginTop: "15px" }}>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
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

                            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100" style={{ marginBottom: "10px", marginRight: "10px", marginTop: "10px" }}>
                                <button
                                    type="button"
                                    onClick={handleCancelDismiss}
                                    disabled={canceling}
                                    className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40" style={{ padding: "5px 7px" }}
                                >
                                    Tutup
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancelConfirm}
                                    disabled={canceling}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2" style={{ padding: "5px 7px" }}
                                >
                                    {canceling ? "Membatalkan..." : "Ya, Batalkan"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL Konfirmasi Hapus */}
                {rowToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm">
                            <div className="px-8 py-7" style={{ paddingLeft: "20px", paddingRight: "20px", marginTop: "15px" }}>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Hapus Data
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Apakah anda yakin ingin menghapus data advance atas nama{" "}
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
            </div>
        </>
    );
}