import { useState, useMemo, useRef, useEffect } from "react";
import { FaPlus, FaTimes, FaTrash, FaUsers, FaBook, FaSitemap, FaBuilding, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
// import {

//     getEmployees,
//     createEmployee,
//     deleteEmployee

// } from "../api/employee";

// ================= AUTOCOMPLETE INPUT =================
function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder }) {
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
        <div className="relative" ref={containerRef}>
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

// ================= GENERIC MASTER DATA SECTION =================
function MasterDataSection({
    addLabel,
    initialForm,
    fields,
    columns,
    initialRows = [],
    searchKey,
    searchLabel,
    searchPlaceholder,
    fetchData,
    createData,
    deleteData
}) {
    const [rows, setRows] = useState(initialRows);
    const loadData = async () => {
        if (!fetchData) return;
        try {
            const data = await fetchData(searchTerm);
            setRows(data);
        }
        catch (error) {
            console.log(error);
        }
    };
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [submitError, setSubmitError] = useState("");
    const [rowToDelete, setRowToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    // PAGINATION
    const [page, setPage] = useState(1);
    const perPage = 10;
    useEffect(() => { loadData(); }, []);
    useEffect(() => {
        loadData();

    }, []);


    useEffect(() => {

        const timeout = setTimeout(() => {

            handleSearch();

        }, 300);


        return () => {

            clearTimeout(timeout);

        }

    }, [searchTerm]);

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim() || !searchKey) return rows;
        const q = searchTerm.toLowerCase();
        return rows.filter((row) =>
            (row[searchKey] || "").toString().toLowerCase().includes(q)
        );
    }, [rows, searchTerm, searchKey]);

    // PAGINATION (mengikuti pola pada tabel Settlement)
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
        if (!searchTerm || !searchKey) return [];
        const q = searchTerm.toLowerCase().trim();
        if (!q) return [];
        const unique = Array.from(
            new Set(rows.map((r) => r[searchKey]).filter(Boolean))
        );
        return unique
            .filter((val) => val.toString().toLowerCase().includes(q))
            .slice(0, 8);
    }, [rows, searchTerm, searchKey]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleClose = () => {
        setModalOpen(false);
        setForm(initialForm);
        setSubmitError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const isEmpty = fields.some((field) => !form[field.name]?.trim());
        if (isEmpty) {
            setSubmitError("Semua field wajib diisi.");
            return;
        }
        // TODO: ganti dengan API call create...
        const newRow = { id: Date.now(), ...form };
        setRows((prev) => [...prev, newRow]);
        handleClose();
    };

    const handleDeleteClick = (row) => setRowToDelete(row);
    const handleDeleteCancel = () => setRowToDelete(null);

    const handleDeleteConfirm = () => {
        if (!rowToDelete) return;
        // TODO: ganti dengan API call delete...
        setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
        setRowToDelete(null);
    };


    return (
        <div style={{ animation: "slideDown 0.3s ease" }}>
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Header filter search + tombol tambah */}
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
                {searchKey ? (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">
                            {searchLabel}
                        </label>
                        <AutocompleteInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onSelect={setSearchTerm}
                            suggestions={suggestions}
                            placeholder={searchPlaceholder}
                        />
                    </div>
                ) : (
                    <div />
                )}

                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "linear-gradient(135deg, #363D48, #59616F)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "9px 18px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px #59616F",
                        transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 20px #59616F";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 14px #59616F";
                    }}
                >
                    <FaPlus style={{ fontSize: "11px" }} />
                    {addLabel}
                </button>
            </div>

            {/* Tabel */}
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
                                <td
                                    colSpan={columns.length + 2}
                                    className="p-8 text-center text-gray-400 border border-gray-300"
                                >
                                    {rows.length === 0 ? "Belum ada data." : "Data tidak ditemukan."}
                                </td>
                            </tr>
                        </tbody>
                    )}

                    {filteredRows.length > 0 && (
                        <tbody>
                            {currentRows.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-700 border border-gray-300">{(page - 1) * perPage + idx + 1}</td>
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

            {/* ================= PAGINATION (seperti tabel Settlement) ================= */}
            {filteredRows.length > 0 && (
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

            {/* MODAL TAMBAH */}
            {modalOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(4px)",
                        padding: "16px",
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "20px",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            width: "100%",
                            maxWidth: "440px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            animation: "slideDown 0.25s ease",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "20px 24px 16px",
                                borderBottom: "1px solid #f1f5f9",
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#59616F" }}>
                                {addLabel}
                            </h3>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{
                                    background: "#f3f4f6",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                    color: "#6b7280",
                                    lineHeight: 1,
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}
                        >
                            {fields.map((field) => (
                                <div key={field.name}>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: "#374151",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        {field.label}
                                    </label>
                                    <input
                                        type={field.type || "text"}
                                        name={field.name}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        style={{
                                            width: "100%",
                                            border: "1.5px solid #e5e7eb",
                                            borderRadius: "10px",
                                            padding: "9px 12px",
                                            fontSize: "13px",
                                            outline: "none",
                                            boxSizing: "border-box",
                                            transition: "border-color 0.2s, box-shadow 0.2s",
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = "#59616F";
                                            e.target.style.boxShadow = "0 0 0 3px #59616F)";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "#e5e7eb";
                                            e.target.style.boxShadow = "none";
                                        }}
                                    />
                                </div>
                            ))}

                            {submitError && (
                                <div
                                    style={{
                                        fontSize: "13px",
                                        color: "#dc2626",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        borderRadius: "8px",
                                        padding: "10px 12px",
                                    }}
                                >
                                    {submitError}
                                </div>
                            )}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "10px",
                                    marginTop: "4px",
                                    paddingTop: "16px",
                                    borderTop: "1px solid #f1f5f9",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    style={{
                                        border: "1.5px solid #e5e7eb",
                                        borderRadius: "10px",
                                        padding: "8px 20px",
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
                                    type="submit"
                                    style={{
                                        background: "linear-gradient(135deg, #363D48, #59616F)",
                                        border: "none",
                                        borderRadius: "10px",
                                        padding: "8px 20px",
                                        fontSize: "13px",
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        boxShadow: "0 4px 12px #59616F)",
                                    }}
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS */}
            {rowToDelete && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(4px)",
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "20px",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            width: "100%",
                            maxWidth: "380px",
                            animation: "slideDown 0.25s ease",
                        }}
                    >
                        <div style={{ padding: "20px 20px 15px" }}>
                            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>
                                Hapus Data
                            </h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                                Apakah anda yakin ingin menghapus data ini?
                            </p>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "10px",
                                padding: "16px 24px 24px",
                                borderTop: "1px solid #f1f5f9",
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleDeleteCancel}
                                style={{
                                    border: "1.5px solid #e5e7eb",
                                    borderRadius: "10px",
                                    padding: "8px 20px",
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
                                onClick={handleDeleteConfirm}
                                style={{
                                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                    border: "none",
                                    borderRadius: "10px",
                                    padding: "8px 20px",
                                    fontSize: "13px",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
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

// ─── (thStyle & tdStyle dihapus, tabel kini pakai Tailwind classes seperti Settlement)// ================= TAB CONFIG =================
const TABS = [
    {
        id: "employee",
        label: "Employee",
        icon: FaUsers,
        color: "#363D48",
        addLabel: "Tambah Employee",
        searchKey: "employee_name",
        searchLabel: "Nama Employee",
        searchPlaceholder: "Cari Nama Employee...",
        initialForm: { employee_name: "", employee_email: "", department_email: "" },
        initialRows: [],
        fields: [
            { name: "employee_name", label: "Nama Employee", placeholder: "Andi Pratama" },
            { name: "employee_email", label: "Email User", type: "email", placeholder: "andi.pratama@company.com" },
            { name: "department_email", label: "Email Department", type: "email", placeholder: "finance@company.com" },
        ],
        columns: [
            { key: "employee_name", label: "Name" },
            { key: "employee_email", label: "Email User" },
            { key: "department_email", label: "Email Department" },
        ],
    },
    {
        id: "gl_account",
        label: "GL Account",
        icon: FaBook,
        color: "#363D48",
        addLabel: "Tambah GL Account",
        searchKey: "gl_account_no",
        searchLabel: "No GL Account",
        searchPlaceholder: "Cari No GL Account...",
        initialForm: { gl_account_no: "", gl_account_name: "" },
        initialRows: [],
        fields: [
            { name: "gl_account_no", label: "No GL Account", placeholder: "1-11000" },
            { name: "gl_account_name", label: "Nama GL Account", placeholder: "Kas Kecil" },
        ],
        columns: [
            { key: "gl_account_no", label: "No GL Account" },
            { key: "gl_account_name", label: "Nama GL Account" },
        ],
    },
    {
        id: "cost_center",
        label: "Cost Center",
        icon: FaSitemap,
        color: "#363D48",
        addLabel: "Tambah Cost Center",
        searchKey: "cost_center_code",
        searchLabel: "Kode Cost Center",
        searchPlaceholder: "Cari Kode Cost Center...",
        initialForm: { cost_center_code: "", cost_center_name: "" },
        initialRows: [],
        fields: [
            { name: "cost_center_code", label: "Kode Cost Center", placeholder: "CC-001" },
            { name: "cost_center_name", label: "Nama Cost Center", placeholder: "Finance" },
        ],
        columns: [
            { key: "cost_center_code", label: "Kode Cost Center" },
            { key: "cost_center_name", label: "Nama Cost Center" },
        ],
    },
    {
        id: "vendor",
        label: "Vendor",
        icon: FaBuilding,
        color: "#363D48",
        addLabel: "Tambah Vendor",
        searchKey: "vendor_name",
        searchLabel: "Nama Vendor",
        searchPlaceholder: "Cari Nama Vendor...",
        initialForm: { vendor_name: "", bank_name: "", bank_account_no: "" },
        initialRows: [],
        fields: [
            { name: "vendor_name", label: "Nama Vendor", placeholder: "PT SMART Tbk" },
            { name: "bank_name", label: "Nama Bank", placeholder: "BCA" },
            { name: "bank_account_no", label: "No Rekening", placeholder: "1234567890" },
        ],
        columns: [
            { key: "vendor_name", label: "Nama Vendor" },
            { key: "bank_name", label: "Nama Bank" },
            { key: "bank_account_no", label: "No Rekening" },
        ],
    },
];

// ================= PAGE: MASTER DATA =================
export default function MasterData() {
    const [activeTab, setActiveTab] = useState("employee");

    const activeConfig = TABS.find((t) => t.id === activeTab);

    return (
        <div style={{ padding: "20px 20px 20px", minHeight: "100vh" }}>

            {/* ── 4 Tab Buttons ── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "12px",
                    marginBottom: "8px",
                }}
            >
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                position: "relative",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: "10px",
                                padding: "10px 14px",
                                border: isActive
                                    ? `2px solid ${tab.color}`
                                    : "2px solid #e5e7eb",
                                borderRadius: "12px",
                                background: isActive
                                    ? `linear-gradient(135deg, ${tab.color}15, ${tab.color}06)`
                                    : "#fff",
                                cursor: "pointer",
                                transform: isActive ? "translateY(-5px)" : "translateY(0)",
                                boxShadow: isActive
                                    ? `0 10px 28px ${tab.color}28, 0 4px 10px ${tab.color}18`
                                    : "0 2px 6px rgba(0,0,0,0.06)",
                                transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease, border-color 0.2s, background 0.2s",
                                outline: "none",
                                zIndex: isActive ? 2 : 1,
                                textAlign: "left",
                                width: "100%",
                                boxSizing: "border-box",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = `0 6px 16px ${tab.color}18`;
                                    e.currentTarget.style.borderColor = `${tab.color}50`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)";
                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                }
                            }}
                        >
                            {/* Indikator aktif di kiri kartu */}
                            {isActive && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: "20%",
                                        bottom: "20%",
                                        width: "3px",
                                        background: tab.color,
                                        borderRadius: "0 4px 4px 0",
                                    }}
                                />
                            )}

                            {/* Icon */}
                            <div
                                style={{
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "10px",
                                    background: isActive ? tab.color : `${tab.color}15`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "background 0.2s",
                                }}
                            >
                                <Icon
                                    style={{
                                        fontSize: "15px",
                                        color: isActive ? "#fff" : tab.color,
                                        transition: "color 0.2s",
                                    }}
                                />
                            </div>

                            {/* Label */}
                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? tab.color : "#6b7280",
                                    transition: "color 0.2s",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Panel konten ── */}
            {activeConfig && (
                <div
                    key={activeTab}
                    style={{
                        marginTop: "20px",
                        background: "#fff",
                        borderRadius: "20px",
                        border: `1.5px solid ${activeConfig.color}30`,
                        boxShadow: `0 8px 32px ${activeConfig.color}12`,
                        padding: "24px",
                        animation: "slideDown 0.3s cubic-bezier(.34,1.56,.64,1)",
                    }}
                >
                    {/* Header panel */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: `${activeConfig.color}15`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <activeConfig.icon style={{ fontSize: "16px", color: activeConfig.color }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e1b4b" }}>
                                {activeConfig.label}
                            </h3>
                            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                                Kelola data {activeConfig.label.toLowerCase()} di sini
                            </p>
                        </div>
                    </div>

                    <MasterDataSection
                        key={activeTab}
                        addLabel={activeConfig.addLabel}
                        initialForm={activeConfig.initialForm}
                        fields={activeConfig.fields}
                        columns={activeConfig.columns}
                        initialRows={activeConfig.initialRows}
                        searchKey={activeConfig.searchKey}
                        searchLabel={activeConfig.searchLabel}
                        searchPlaceholder={activeConfig.searchPlaceholder}
                        fetchData={activeTab === "employee" ? getEmployees : null}
                        createData={activeTab === "employee" ? createEmployee : null}
                        deleteData={activeTab === "employee" ? deleteEmployee : null}
                    />
                </div>
            )}
        </div>
    );
}