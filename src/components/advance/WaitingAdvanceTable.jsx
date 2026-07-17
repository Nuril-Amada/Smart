import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaPlus,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";

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

function TableSkeleton({ cols = 9 }) {
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
    tanggal: "",
    nama_user: "",
    email: "",
    cost_center: "",
    keterangan: "",
    jumlah: "",
    due_date: "",
};

const initialPamForm = {
    no_pam: "",
    nama_user: "",
    cost_center: "",
    keterangan: "",
    amount: "",
    due_date: "",
};

export default function Table({ startDate, endDate, refreshKey }) {
    // ================= TABLE 1: ADVANCE =================
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);
    const perPage = 15;

    const [filterUser, setFilterUser] = useState("");
    const [filterCostCenter, setFilterCostCenter] = useState("");
    const [filterStatus, setFilterStatus] = useState("All Status");

    const userInputRef = useRef(null);
    const ccInputRef = useRef(null);

    const [requestOpen, setRequestOpen] = useState(false);
    const [requestForm, setRequestForm] = useState(initialForm);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestError, setRequestError] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const result = await getAdvanceList({
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });

            const data = result.map((item) => ({
                tanggal: item.request_date,
                nama_user: item.employee_name,
                email: item.employee_email,
                cost_center: item.cost_center,
                keterangan: item.description,
                jumlah: Number(item.amount),
                status:
                    item.status === "SETTLED"
                        ? "Settled"
                        : item.status === "OVERDUE"
                            ? "Overdue"
                            : "Active",
                due_date: item.due_date,
                tgl_penyelesaian: item.settled_date,
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

    const handleRequestChange = (e) => {
        const { name, value } = e.target;
        setRequestForm((prev) => ({ ...prev, [name]: value }));
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

            await createAdvanceRequest({
                request_date: requestForm.tanggal,
                employee_name: requestForm.nama_user,
                employee_email: requestForm.email,
                cost_center: requestForm.cost_center,
                description: requestForm.keterangan,
                amount: Number(requestForm.jumlah),
                due_date: requestForm.due_date,
            });

            handleRequestClose();
            loadData();
        } catch (err) {
            console.error(err);
            setRequestError(
                err.response?.data?.detail || "Gagal menyimpan data advance."
            );
        } finally {
            setRequestSubmitting(false);
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

            const statusMatch =
                filterStatus === "All Status" || row.status === filterStatus;

            return userMatch && ccMatch && statusMatch;
        });
    }, [rows, filterUser, filterCostCenter, filterStatus]);

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentRows = filteredRows.slice((page - 1) * perPage, page * perPage);
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);

    const visiblePages = [];
    for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

    // ================= TABLE 2: PAM =================
    const [pamRows, setPamRows] = useState([]);
    const [pamLoading, setPamLoading] = useState(true);
    const [pamError, setPamError] = useState("");

    const [pamPage, setPamPage] = useState(1);
    const pamPerPage = 15;

    const [pamFilterUser, setPamFilterUser] = useState("");
    const [pamFilterCostCenter, setPamFilterCostCenter] = useState("");

    const pamUserInputRef = useRef(null);
    const pamCcInputRef = useRef(null);

    const [pamRequestOpen, setPamRequestOpen] = useState(false);
    const [pamRequestForm, setPamRequestForm] = useState(initialPamForm);
    const [pamRequestSubmitting, setPamRequestSubmitting] = useState(false);
    const [pamRequestError, setPamRequestError] = useState("");

    const loadPamData = async () => {
        try {
            setPamLoading(true);
            setPamError("");

            const result = await getPamList({
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });

            const data = result.map((item) => ({
                no_pam: item.pam_no,
                nama_user: item.employee_name,
                cost_center: item.cost_center,
                keterangan: item.description,
                amount: Number(item.amount),
                due_date: item.due_date,
            }));

            setPamRows(data);
            setPamPage(1);
        } catch (err) {
            console.error(err);
            setPamError(
                err.response?.data?.detail || "Gagal memuat data PAM."
            );
        } finally {
            setPamLoading(false);
        }
    };

    useEffect(() => {
        loadPamData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, refreshKey]);

    const pamUserSuggestions = useMemo(() => {
        if (!pamFilterUser) return [];
        const q = pamFilterUser.toLowerCase();
        const unique = Array.from(
            new Set(pamRows.map((r) => r.nama_user).filter(Boolean))
        );
        return unique
            .filter((name) => name.toLowerCase().includes(q))
            .filter((name) => name.toLowerCase() !== q)
            .slice(0, 8);
    }, [pamRows, pamFilterUser]);

    const pamCostCenterSuggestions = useMemo(() => {
        if (!pamFilterCostCenter) return [];
        const q = pamFilterCostCenter.toLowerCase();
        const unique = Array.from(
            new Set(pamRows.map((r) => r.cost_center).filter(Boolean))
        );
        return unique
            .filter((cc) => cc.toLowerCase().includes(q))
            .filter((cc) => cc.toLowerCase() !== q)
            .slice(0, 8);
    }, [pamRows, pamFilterCostCenter]);

    const handlePamRequestChange = (e) => {
        const { name, value } = e.target;
        setPamRequestForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePamRequestClose = () => {
        setPamRequestForm(initialPamForm);
        setPamRequestError("");
        setPamRequestOpen(false);
    };

    const handlePamRequestSubmit = async (e) => {
        e.preventDefault();

        try {
            setPamRequestSubmitting(true);
            setPamRequestError("");

            await createPamRequest({
                pam_no: pamRequestForm.no_pam,
                employee_name: pamRequestForm.nama_user,
                cost_center: pamRequestForm.cost_center,
                description: pamRequestForm.keterangan,
                amount: Number(pamRequestForm.amount),
                due_date: pamRequestForm.due_date,
            });

            handlePamRequestClose();
            loadPamData();
        } catch (err) {
            console.error(err);
            setPamRequestError(
                err.response?.data?.detail || "Gagal menyimpan data PAM."
            );
        } finally {
            setPamRequestSubmitting(false);
        }
    };

    const pamFilteredRows = useMemo(() => {
        return pamRows.filter((row) => {
            const userMatch =
                !pamFilterUser ||
                (row.nama_user || "")
                    .toLowerCase()
                    .includes(pamFilterUser.toLowerCase());

            const ccMatch =
                !pamFilterCostCenter ||
                (row.cost_center || "")
                    .toLowerCase()
                    .includes(pamFilterCostCenter.toLowerCase());

            return userMatch && ccMatch;
        });
    }, [pamRows, pamFilterUser, pamFilterCostCenter]);

    const pamTotal = pamFilteredRows.length;
    const pamTotalPages = Math.max(1, Math.ceil(pamTotal / pamPerPage));
    const pamCurrentRows = pamFilteredRows.slice(
        (pamPage - 1) * pamPerPage,
        pamPage * pamPerPage
    );
    const pamStartEntry = pamTotal === 0 ? 0 : (pamPage - 1) * pamPerPage + 1;
    const pamEndEntry = Math.min(pamPage * pamPerPage, pamTotal);

    const pamVisiblePages = [];
    for (let i = 1; i <= pamTotalPages; i++) pamVisiblePages.push(i);

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
                                <th className="p-3 font-medium border border-gray-300">Nama User</th>
                                <th className="p-3 font-medium border border-gray-300">Email User</th>
                                <th className="p-3 font-medium border border-gray-300">Cost Center</th>
                                <th className="p-3 font-medium border border-gray-300">Keterangan</th>
                                <th className="p-3 font-medium border border-gray-300">Jumlah</th>
                                <th className="p-3 font-medium border border-gray-300">Due Date</th>
                                <th className="p-3 font-medium border border-gray-300">Tgl Penyelesaian</th>
                                <th className="p-3 font-medium border border-gray-300">Status</th>
                            </tr>
                        </thead>

                        {loading && <TableSkeleton cols={9} />}

                        {!loading && !error && currentRows.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400 border border-gray-300">
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
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.email}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.cost_center}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.keterangan}</td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatRupiah(row.jumlah)}
                                        </td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatDate(row.due_date)}
                                        </td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatDate(row.tgl_penyelesaian)}
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[row.status] || "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {row.status}
                                            </span>
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
                                    <label className="block text-sm text-gray-600 mb-1">Email User</label>
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
                                    <label className="block text-sm text-gray-600 mb-1">Jumlah</label>
                                    <input
                                        type="number"
                                        name="jumlah"
                                        value={requestForm.jumlah}
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
            </div>

            {/* ================================================= */}
            {/* ================= TABLE 2: PAM ================= */}
            {/* ================================================= */}
            <div
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
                style={{ marginLeft: "20px", marginRight: "20px", marginTop: "20px" }}
            >
                {/* FILTER */}
                <div className="flex flex-wrap items-end gap-4 mb-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 text-center" style={{ marginTop: "10px" }}>
                            Nama User
                        </label>

                        <AutocompleteInput
                            containerRef={pamUserInputRef}
                            value={pamFilterUser}
                            onChange={(val) => {
                                setPamFilterUser(val);
                                setPamPage(1);
                            }}
                            onSelect={(val) => {
                                setPamFilterUser(val);
                                setPamPage(1);
                            }}
                            suggestions={pamUserSuggestions}
                            placeholder="Cari Nama User..."
                            wrapperStyle={{ marginLeft: "20px" }}
                            inputStyle={{ marginBottom: "10px" }}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 text-center">Cost Center</label>

                        <AutocompleteInput
                            containerRef={pamCcInputRef}
                            value={pamFilterCostCenter}
                            onChange={(val) => {
                                setPamFilterCostCenter(val);
                                setPamPage(1);
                            }}
                            onSelect={(val) => {
                                setPamFilterCostCenter(val);
                                setPamPage(1);
                            }}
                            suggestions={pamCostCenterSuggestions}
                            placeholder="Cari Cost Center..."
                            inputStyle={{ marginBottom: "10px" }}
                        />
                    </div>

                    <div className="flex-1" />

                    <button
                        type="button"
                        onClick={() => setPamRequestOpen(true)}
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
                                <th className="p-3 font-medium border border-gray-300">No PAM</th>
                                <th className="p-3 font-medium border border-gray-300">Nama User</th>
                                <th className="p-3 font-medium border border-gray-300">Cost Center</th>
                                <th className="p-3 font-medium border border-gray-300">Keterangan</th>
                                <th className="p-3 font-medium border border-gray-300">Amount</th>
                                <th className="p-3 font-medium border border-gray-300">Due Date</th>
                            </tr>
                        </thead>

                        {pamLoading && <TableSkeleton cols={6} />}

                        {!pamLoading && !pamError && pamCurrentRows.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400 border border-gray-300">
                                        Belum ada data PAM.
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!pamLoading && !pamError && pamCurrentRows.length > 0 && (
                            <tbody>
                                {pamCurrentRows.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.no_pam}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.nama_user}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.cost_center}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300">{row.keterangan}</td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatRupiah(row.amount)}
                                        </td>
                                        <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                                            {formatDate(row.due_date)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>

                {!pamLoading && pamError && (
                    <div className="text-center py-6 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl mt-3">
                        Gagal memuat data: {pamError}
                    </div>
                )}

                {/* PAGINATION */}
                {!pamLoading && !pamError && (
                    <div
                        className="flex items-center justify-between mt-4 text-sm text-gray-500"
                        style={{ marginLeft: "10px", marginRight: "10px", marginTop: "10px", marginBottom: "10px" }}
                    >
                        <span>
                            Showing {pamStartEntry} to {pamEndEntry} of {pamTotal} entries
                        </span>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPamPage((p) => Math.max(1, p - 1))}
                                disabled={pamPage === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                            >
                                <FaChevronLeft className="text-xs" />
                            </button>

                            {pamVisiblePages.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPamPage(p)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${pamPage === p
                                        ? "bg-gray-600 text-white"
                                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                onClick={() => setPamPage((p) => Math.min(pamTotalPages, p + 1))}
                                disabled={pamPage === pamTotalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                            >
                                <FaChevronRight className="text-xs" />
                            </button>
                        </div>
                    </div>
                )}

                {/* MODAL New Request (PAM) */}
                {pamRequestOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200" style={{ marginRight: "20px" }}>
                                <h3 className="text-lg font-semibold text-gray-700" style={{ marginLeft: "20px" }}>
                                    New Request
                                </h3>
                                <button type="button" onClick={handlePamRequestClose} className="text-gray-400 hover:text-gray-600">
                                    <FaTimes />
                                </button>
                            </div>

                            <form
                                onSubmit={handlePamRequestSubmit}
                                className="px-6 py-5 flex flex-col gap-4"
                                style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "10px" }}
                            >
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">No PAM</label>
                                    <input
                                        type="text"
                                        name="no_pam"
                                        value={pamRequestForm.no_pam}
                                        onChange={handlePamRequestChange}
                                        placeholder="PAM-0001"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Nama User</label>
                                    <input
                                        type="text"
                                        name="nama_user"
                                        value={pamRequestForm.nama_user}
                                        onChange={handlePamRequestChange}
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
                                        value={pamRequestForm.cost_center}
                                        onChange={handlePamRequestChange}
                                        placeholder="Finance"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Keterangan</label>
                                    <textarea
                                        name="keterangan"
                                        value={pamRequestForm.keterangan}
                                        onChange={handlePamRequestChange}
                                        rows={3}
                                        placeholder="Contoh: Pembayaran PAM"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={pamRequestForm.amount}
                                        onChange={handlePamRequestChange}
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
                                        value={pamRequestForm.due_date}
                                        onChange={handlePamRequestChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>

                                {pamRequestError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        {pamRequestError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handlePamRequestClose}
                                        disabled={pamRequestSubmitting}
                                        className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                        style={{ padding: "1px 15px", marginRight: "5px" }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={pamRequestSubmitting}
                                        className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                                        style={{ padding: "1px 10px" }}
                                    >
                                        {pamRequestSubmitting ? "Menyimpan..." : "Simpan"}
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