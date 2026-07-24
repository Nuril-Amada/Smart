import { useState, useMemo, useRef, useEffect } from "react";
import { FaPlus, FaTimes, FaTrash, FaUsers, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Aktifkan import ini kalau api/employee.js sudah siap
// import { getEmployees, createEmployee, deleteEmployee } from "../../api/employee";

export const meta = {
    id: "employee",
    label: "Employee",
    icon: FaUsers,
    color: "#363D48",
};

const initialForm = { employee_name: "", employee_email: "", department_email: "" };
const fields = [
    { name: "employee_name", label: "Nama Employee", placeholder: "Andi Pratama" },
    { name: "employee_email", label: "Email User", type: "email", placeholder: "andi.pratama@company.com", required: false },
    { name: "department_email", label: "Email Department", type: "email", placeholder: "finance@company.com", required: false },
];
const columns = [
    { key: "employee_name", label: "Name" },
    { key: "employee_email", label: "Email User" },
    { key: "department_email", label: "Email Department" },
];
const searchKey = "employee_name";

// ================= AUTOCOMPLETE INPUT =================
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
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ================= EMPLOYEE (mandiri: logic + tampilan) =================
export default function Employee() {
    const [rows, setRows] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [submitError, setSubmitError] = useState("");
    const [rowToDelete, setRowToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [page, setPage] = useState(1);
    const perPage = 10;

    const loadData = async (term) => {
        // if (!getEmployees) return;
        // try {
        //     const data = await getEmployees(term);
        //     setRows(data);
        // } catch (error) {
        //     console.log(error);
        // }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => loadData(searchTerm), 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const q = searchTerm.toLowerCase();
        return rows.filter((row) =>
            (row[searchKey] || "").toString().toLowerCase().includes(q)
        );
    }, [rows, searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, rows]);

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentRows = filteredRows.slice((page - 1) * perPage, page * perPage);
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);

    const visiblePages = [];
    for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

    const suggestions = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        if (!q) return [];
        const unique = Array.from(new Set(rows.map((r) => r[searchKey]).filter(Boolean)));
        return unique.filter((val) => val.toString().toLowerCase().includes(q)).slice(0, 8);
    }, [rows, searchTerm]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleClose = () => {
        setModalOpen(false);
        setForm(initialForm);
        setSubmitError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEmpty = fields.some((field) => field.required !== false && !form[field.name]?.trim());
        if (isEmpty) {
            setSubmitError("Semua field wajib diisi.");
            return;
        }
        try {
            // const newRow = await createEmployee(form);
            const newRow = { id: Date.now(), ...form };
            setRows((prev) => [...prev, newRow]);
            handleClose();
            setSuccessMessage("Data baru berhasil disimpan");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            setSubmitError(err?.response?.data?.detail || "Gagal menyimpan data.");
        }
    };

    const handleDeleteClick = (row) => setRowToDelete(row);
    const handleDeleteCancel = () => setRowToDelete(null);

    const handleDeleteConfirm = async () => {
        if (!rowToDelete) return;
        try {
            // await deleteEmployee(rowToDelete.id);
            setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
            setRowToDelete(null);
        } catch (err) {
            console.error(err);
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

            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                    paddingLeft: "10px",
                    paddingRight: "10px",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Nama Employee</label>
                    <AutocompleteInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        onSelect={setSearchTerm}
                        suggestions={suggestions}
                        placeholder="Cari Nama Employee..."
                        inputStyle={{ padding: "1px 5px" }}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
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
                    Tambah Employee
                </button>
            </div>

            <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
                <table className="w-full text-sm border border-gray-300 text-center">
                    <thead>
                        <tr className="text-xs uppercase tracking-wide bg-gray-50">
                            <th className="p-3 font-medium border border-gray-300 text-center">No</th>
                            {columns.map((col) => (
                                <th key={col.key} className="p-3 font-medium border border-gray-300 text-center">
                                    {col.label}
                                </th>
                            ))}
                            <th className="p-3 font-medium border border-gray-300 text-center">Action</th>
                        </tr>
                    </thead>

                    {filteredRows.length === 0 && (
                        <tbody>
                            <tr>
                                <td colSpan={columns.length + 2} className="p-8 text-center text-gray-400 border border-gray-300">
                                    {rows.length === 0 ? "Belum ada data." : "Data tidak ditemukan."}
                                </td>
                            </tr>
                        </tbody>
                    )}

                    {filteredRows.length > 0 && (
                        <tbody>
                            {currentRows.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-700 border border-gray-300">{startEntry + idx}</td>
                                    {columns.map((col) => (
                                        <td key={col.key} className="p-3 text-gray-700 border border-gray-300">
                                            {row[col.key] ?? "-"}
                                        </td>
                                    ))}
                                    <td className="p-3 border border-gray-300">
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteClick(row)}
                                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md"
                                            style={{ padding: "5px 5px" }}
                                            title="Hapus"
                                        >
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>

            {filteredRows.length > 0 && (
                <div
                    className="flex items-center justify-between mt-4 text-sm text-gray-500"
                    style={{ marginLeft: "10px", marginRight: "10px", marginTop: "10px", marginBottom: "10px" }}
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

            {modalOpen && (
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
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#59616F" }}>Tambah Employee</h3>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", color: "#6b7280", lineHeight: 1 }}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                            {fields.map((field) => (
                                <div key={field.name}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                        {field.label}
                                    </label>
                                    <input
                                        type={field.type || "text"}
                                        name={field.name}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        style={{
                                            width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "9px 12px",
                                            fontSize: "13px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = "#59616F";
                                            e.target.style.boxShadow = "0 0 0 3px #59616F33";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "#e5e7eb";
                                            e.target.style.boxShadow = "none";
                                        }}
                                    />
                                </div>
                            ))}

                            {submitError && (
                                <div style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px" }}>
                                    {submitError}
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                                <button
                                    type="button"
                                    onClick={handleClose}
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
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {rowToDelete && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
                        justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
                    }}
                >
                    <div style={{ background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: "380px", animation: "slideDown 0.25s ease" }}>
                        <div style={{ padding: "20px 20px 15px" }}>
                            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>Hapus Data</h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Apakah anda yakin ingin menghapus data ini?</p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px 24px", borderTop: "1px solid #f1f5f9" }}>
                            <button
                                type="button"
                                onClick={handleDeleteCancel}
                                style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 20px", fontSize: "13px", color: "#6b7280", background: "#fff", cursor: "pointer", fontWeight: 500 }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                style={{
                                    background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", borderRadius: "10px",
                                    padding: "8px 20px", fontSize: "13px", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
                                }}
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