import { useState, useMemo, useRef, useEffect } from "react";
import { FaPlus, FaTimes, FaTrash, FaEdit, FaUserShield, FaChevronLeft, FaChevronRight, FaShieldAlt, FaUserCheck, FaUser, FaSearch } from "react-icons/fa";
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi } from "../../api/auth";

export const meta = {
    id: "user_management",
    label: "User Login",
    icon: FaUserShield,
    color: "#363D48", // Grey theme matching Employee
};

const ITEMS_PER_PAGE = 10;

// ================= AUTOCOMPLETE / SEARCH INPUT (MATCHING EMPLOYEE.JSX) =================
function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, wrapperStyle, inputStyle }) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="border border-gray-300 rounded-lg text-sm pl-3 pr-8 py-2 text-gray-700 w-64 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    style={inputStyle}
                />
                {value ? (
                    <button
                        type="button"
                        onClick={() => {
                            onChange("");
                            setOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Hapus pencarian"
                    >
                        <FaTimes className="text-xs" />
                    </button>
                ) : (
                    <FaSearch className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                )}
            </div>

            {open && value && suggestions.length > 0 && (
                <ul className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl py-1">
                    {suggestions.map((s, i) => (
                        <li
                            key={i}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(s);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-50 last:border-0 ${i === highlight ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
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

export default function UserManagement() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);

    const [notification, setNotification] = useState({ show: false, message: "", isError: false });

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ username: "", password: "", nama_lengkap: "", role: "user" });

    // Delete dialogs
    const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
    const [deleteUserObj, setDeleteUserObj] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsersApi();
            if (Array.isArray(data)) {
                setRows(data);
            }
        } catch (err) {
            console.error("Gagal memuat data user:", err);
            showNotify("Gagal memuat data user.", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const showNotify = (msg, isErr = false) => {
        setNotification({ show: true, message: msg, isError: isErr });
        setTimeout(() => setNotification({ show: false, message: "", isError: false }), 4000);
    };

    // Filter search
    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const q = searchTerm.toLowerCase();
        return rows.filter(
            (r) =>
                r.username?.toLowerCase().includes(q) ||
                r.nama_lengkap?.toLowerCase().includes(q) ||
                r.role?.toLowerCase().includes(q)
        );
    }, [rows, searchTerm]);

    const suggestions = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        if (!q) return [];
        const unique = Array.from(
            new Set(
                rows
                    .flatMap((r) => [r.username, r.nama_lengkap])
                    .filter(Boolean)
            )
        );
        return unique.filter((val) => val.toString().toLowerCase().includes(q)).slice(0, 8);
    }, [rows, searchTerm]);

    // Pagination calculation
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

    useEffect(() => {
        setPage(1);
    }, [searchTerm, rows]);

    const currentRows = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredRows.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredRows, page]);

    const startEntry = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
    const endEntry = Math.min(page * ITEMS_PER_PAGE, total);

    const visiblePages = useMemo(() => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        return pages;
    }, [totalPages]);

    // Checkbox batch delete toggle
    const toggleSelectRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleEnterDeleteMode = () => {
        setDeleteMode(true);
        setSelectedIds(new Set());
    };

    const handleExitDeleteMode = () => {
        setDeleteMode(false);
        setSelectedIds(new Set());
    };

    const handleBulkDeleteConfirm = async () => {
        if (selectedIds.size === 0) return;
        try {
            setDeleting(true);
            for (const id of Array.from(selectedIds)) {
                await deleteUserApi(id);
            }
            showNotify(`${selectedIds.size} data terpilih berhasil dihapus.`);
            setSelectedIds(new Set());
            setDeleteBatchOpen(false);
            setDeleteMode(false);
            await fetchUsers();
        } catch (err) {
            showNotify("Gagal menghapus beberapa user.", true);
        } finally {
            setDeleting(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingUser(null);
        setForm({ username: "", password: "", nama_lengkap: "", role: "user" });
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setEditingUser(user);
        setForm({
            username: user.username,
            password: "",
            nama_lengkap: user.nama_lengkap,
            role: user.role || "user"
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingUser) {
            try {
                const payload = {
                    nama_lengkap: form.nama_lengkap,
                    role: form.role
                };
                if (form.password.trim()) {
                    payload.password = form.password.trim();
                }
                const res = await updateUserApi(editingUser.id, payload);
                showNotify(res.message || "User berhasil diperbarui!");
                setShowModal(false);
                fetchUsers();
            } catch (err) {
                const detail = err.response?.data?.detail || "Gagal memperbarui user.";
                showNotify(detail, true);
            }
        } else {
            if (!form.username.trim() || !form.password.trim() || !form.nama_lengkap.trim()) {
                showNotify("Semua kolom wajib diisi.", true);
                return;
            }
            try {
                const res = await createUserApi(form);
                showNotify(res.message || "User baru berhasil ditambahkan!");
                setShowModal(false);
                fetchUsers();
            } catch (err) {
                const detail = err.response?.data?.detail || "Gagal menambahkan user baru.";
                showNotify(detail, true);
            }
        }
    };

    const handleSingleDelete = async () => {
        if (!deleteUserObj) return;
        try {
            const res = await deleteUserApi(deleteUserObj.id);
            showNotify(res.message || "User berhasil dihapus!");
            setDeleteUserObj(null);
            fetchUsers();
        } catch (err) {
            const detail = err.response?.data?.detail || "Gagal menghapus user.";
            showNotify(detail, true);
        }
    };

    return (
        <div style={{ animation: "slideDown 0.3s ease" }}>
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes toastIn {
                    from { opacity: 0; transform: translate(-50%, -12px); }
                    to   { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>

            {/* NOTIFIKASI TOAST (MATCHING EMPLOYEE.JSX & GLACCOUNT.JSX) */}
            {notification.show && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        left: "50%",
                        transform: "translate(-50%, 0)",
                        zIndex: 100,
                        background: notification.isError ? "#fef2f2" : "#ecfdf5",
                        border: notification.isError ? "1.5px solid #fca5a5" : "1.5px solid #6ee7b7",
                        color: notification.isError ? "#b91c1c" : "#047857",
                        borderRadius: "10px",
                        padding: "10px 18px",
                        fontSize: "13px",
                        fontWeight: 600,
                        boxShadow: notification.isError ? "0 8px 24px rgba(239,68,68,0.25)" : "0 8px 24px rgba(16,185,129,0.25)",
                        animation: "toastIn 0.25s ease",
                    }}
                >
                    {notification.message}
                </div>
            )}

            {/* HEADER CONTROLS (EXACT MARGIN, GAP & FLEX MATCHING EMPLOYEE.JSX) */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    paddingLeft: "10px",
                    paddingRight: "10px",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <div className="flex flex-col gap-1">
                    <AutocompleteInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        onSelect={setSearchTerm}
                        suggestions={suggestions}
                        placeholder="Cari Username"
                        inputStyle={{ padding: "1px 5px" }}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {!deleteMode && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "linear-gradient(135deg, #363D48)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "10px",
                                padding: "9px 18px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "transform 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                        >
                            <FaPlus style={{ fontSize: "11px" }} />
                            Tambah User
                        </button>
                    )}

                    {!deleteMode && (
                        <button
                            type="button"
                            onClick={handleEnterDeleteMode}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#363D48",
                                color: "#fff",
                                border: "none",
                                borderRadius: "10px",
                                padding: "9px 12px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                            title="Pilih data untuk dihapus"
                        >
                            <FaTrash />
                        </button>
                    )}

                    {deleteMode && (
                        <>
                            <button
                                type="button"
                                onClick={handleExitDeleteMode}
                                style={{
                                    border: "1.5px solid #e5e7eb",
                                    borderRadius: "10px",
                                    padding: "9px 18px",
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteBatchOpen(true)}
                                disabled={selectedIds.size === 0}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    background: "#dc2626",
                                    opacity: selectedIds.size === 0 ? 0.4 : 1,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "10px",
                                    padding: "9px 18px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                                }}
                                title={selectedIds.size === 0 ? "Pilih data terlebih dahulu" : `Hapus ${selectedIds.size} data terpilih`}
                            >
                                <FaTrash style={{ fontSize: "11px" }} />
                                Hapus {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* TABLE CONTAINER (EXACT MATCHING EMPLOYEE.JSX) */}
            <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
                <table className="w-full text-sm border border-gray-300">
                    <thead>
                        <tr className="text-xs uppercase tracking-wide bg-gray-50 text-center">
                            <th className="p-3 font-medium border border-gray-300 text-center">No</th>
                            <th className="p-3 font-medium border border-gray-300 text-center">Nama Lengkap</th>
                            <th className="p-3 font-medium border border-gray-300 text-center">Username</th>
                            <th className="p-3 font-medium border border-gray-300 text-center">Role Akses</th>
                            <th className="p-3 font-medium border border-gray-300 text-center">Tanggal Dibuat</th>
                            <th className="p-3 font-medium border border-gray-300 text-center">Edit</th>
                        </tr>
                    </thead>

                    {loading ? (
                        <tbody>
                            <tr>
                                <td colSpan={6 + (deleteMode ? 1 : 0)} className="p-8 text-center text-gray-400 border border-gray-300">
                                    Memuat data pengguna...
                                </td>
                            </tr>
                        </tbody>
                    ) : filteredRows.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan={6 + (deleteMode ? 1 : 0)} className="p-8 text-center text-gray-400 border border-gray-300">
                                    {rows.length === 0 ? "Belum ada data." : "Data tidak ditemukan."}
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {currentRows.map((row, idx) => {
                                const isAdmin = row.role === "admin";
                                return (
                                    <tr
                                        key={row.id}
                                        className={`hover:bg-gray-50 ${deleteMode && selectedIds.has(row.id) ? "bg-red-50" : ""}`}
                                    >
                                        <td className="p-3 text-gray-700 border border-gray-300 text-center">
                                            {startEntry + idx}
                                        </td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                                            {row.nama_lengkap || "-"}
                                        </td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                                            {row.username}
                                        </td>
                                        <td className="p-3 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    padding: "1px 10px",
                                                    borderRadius: "5px",
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.05em",
                                                    textTransform: "uppercase",
                                                    background: isAdmin ? "#dbeafe" : "#f3f4f6",
                                                    color: isAdmin ? "#1d4ed8" : "#4b5563",
                                                }}
                                            >
                                                {isAdmin ? <FaShieldAlt style={{ fontSize: "10px" }} /> : <FaUser style={{ fontSize: "10px" }} />}
                                                {row.role}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                                            {row.created_at ? new Date(row.created_at).toLocaleDateString("id-ID") : "-"}
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(row)}
                                                    className="text-black p-1.5 rounded-md"
                                                    style={{ padding: "5px 5px" }}
                                                    title="Edit"
                                                >
                                                    <FaEdit className="text-xs" />
                                                </button>
                                            </div>
                                        </td>
                                        {deleteMode && (
                                            <td className="p-3 border border-gray-300 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(row.id)}
                                                    onChange={() => toggleSelectRow(row.id)}
                                                    className="w-4 h-4 accent-red-600 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    )}
                </table>
            </div>

            {/* PAGINATION (EXACT MATCHING EMPLOYEE.JSX) */}
            {filteredRows.length > 0 && (
                <div
                    className="flex items-center justify-between mt-4 text-sm text-gray-500"
                    style={{ marginLeft: "10px", marginRight: "10px", marginTop: "8px", marginBottom: "0px" }}
                >
                    <span>Showing {startEntry} to {endEntry} of {total} entries</span>

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
                                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${page === p ? "bg-gray-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
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

            {/* MODAL EDIT / TAMBAH USER (MATCHING STYLING EMPLOYEE.JSX) */}
            {showModal && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
                        justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", padding: "16px",
                    }}
                >
                    <div
                        style={{
                            background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto", animation: "slideDown 0.25s ease",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#59616F" }}>
                                {editingUser ? "Edit User" : "Tambah User"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", color: "#6b7280", lineHeight: 1 }}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.nama_lengkap}
                                    onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                                    placeholder="Nama Lengkap Karyawan"
                                    style={{
                                        width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "9px 12px",
                                        fontSize: "13px", outline: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Username
                                </label>
                                <input
                                    type="text"
                                    disabled={!!editingUser}
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="Username"
                                    style={{
                                        width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "9px 12px",
                                        fontSize: "13px", outline: "none", boxSizing: "border-box", background: editingUser ? "#f8fafc" : "#fff"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Role Akses
                                </label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    style={{
                                        width: "100%",
                                        border: "1.5px solid #e5e7eb",
                                        borderRadius: "10px",
                                        padding: "9px 36px 9px 12px",
                                        fontSize: "13px",
                                        color: "#374151",
                                        outline: "none",
                                        boxSizing: "border-box",
                                        background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\") no-repeat right 12px center",
                                        cursor: "pointer",
                                        appearance: "none",
                                        WebkitAppearance: "none",
                                        MozAppearance: "none",
                                        transition: "border-color 0.2s, box-shadow 0.2s",
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#59616F";
                                        e.target.style.boxShadow = "0 0 0 3px #59616F33";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#e5e7eb";
                                        e.target.style.boxShadow = "none";
                                    }}
                                >
                                    <option value="user">USER</option>
                                    <option value="admin">ADMIN</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    {editingUser ? "Reset Password (Opsional)" : "Password"}
                                </label>
                                <input
                                    type="password"
                                    placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Password baru"}
                                    required={!editingUser}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    style={{
                                        width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "9px 12px",
                                        fontSize: "13px", outline: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 20px", fontSize: "13px", color: "#6b7280", background: "#fff", cursor: "pointer", fontWeight: 500 }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        background: "linear-gradient(135deg, #363D48, #59616F)", border: "none", borderRadius: "10px",
                                        padding: "8px 20px", fontSize: "13px", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 12px #59616F55",
                                    }}
                                >
                                    {editingUser ? "Perbarui" : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BATCH DELETE CONFIRMATION MODAL */}
            {deleteBatchOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: "380px", animation: "slideDown 0.25s ease" }}>
                        <div style={{ padding: "20px 20px 15px" }}>
                            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>Hapus Data Terpilih</h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                                Apakah Anda yakin ingin menghapus{" "}
                                <span style={{ fontWeight: 700, color: "#dc2626" }}>{selectedIds.size} user</span>{" "}
                                yang telah dipilih?
                            </p>
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
                                onClick={handleBulkDeleteConfirm}
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

            {/* SINGLE DELETE CONFIRM DIALOG */}
            {deleteUserObj && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: "380px", animation: "slideDown 0.25s ease", textAlign: "center", padding: "24px" }}>
                        <FaTrash style={{ fontSize: "32px", color: "#ef4444", margin: "0 auto 12px" }} />
                        <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>Konfirmasi Hapus</h4>
                        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
                            Apakah Anda yakin ingin menghapus user <strong style={{ color: "#374151" }}>{deleteUserObj.username}</strong>?
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteUserObj(null)}
                                style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 20px", fontSize: "13px", color: "#6b7280", background: "#fff", cursor: "pointer", fontWeight: 500 }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSingleDelete}
                                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", borderRadius: "10px", padding: "8px 20px", fontSize: "13px", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

