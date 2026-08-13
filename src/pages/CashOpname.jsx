import { useState, useMemo, useRef, useEffect } from "react";
import {
    FaCashRegister,
    FaSave,
    FaPrint,
    FaDownload,
    FaRedo,
    FaSearch,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaTrashAlt,
    FaExclamationTriangle,
} from "react-icons/fa";

export const meta = {
    id: "cash_opname",
    label: "Cash Opname",
    icon: FaCashRegister,
    color: "#363D48",
};

const COMPANY_NAME = "PT. SMART Tbk Unit SURABAYA";

function formatCurrency(n) {
    const num = Number(n) || 0;
    return "Rp " + num.toLocaleString("id-ID");
}

function formatDateID(isoDate) {
    if (!isoDate) return "-";
    const [y, m, d] = isoDate.split("-");
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
}

function formatTimeID(date) {
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
}

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
                    className="border border-gray-300 rounded-lg text-sm pl-3 pr-8 py-2 text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                {value ? (
                    <button
                        type="button"
                        onClick={() => {
                            onChange("");
                            setOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Hapus"
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

// ===== Bangun HTML untuk jendela cetak / file unduhan, mengikuti layout template excel =====
// NOTE: Jam sengaja TIDAK ditampilkan pada laporan (cetak/unduh), hanya tampil live di form.
function buildPrintHtml(record) {
    const rowsA = record.settlementRows
        .map(
            (r) => `
        <tr>
            <td style="padding:4px 6px;border:1px solid #999;">${formatDateID(r.tanggal)}</td>
            <td style="padding:4px 6px;border:1px solid #999;">${r.kode}</td>
            <td style="padding:4px 6px;border:1px solid #999;">${r.keterangan}</td>
            <td style="padding:4px 6px;border:1px solid #999;text-align:right;">${formatCurrency(r.jumlah)}</td>
        </tr>`
        )
        .join("");

    const rowsB = record.advanceRows
        .map(
            (r) => `
        <tr>
            <td style="padding:4px 6px;border:1px solid #999;">${formatDateID(r.tanggal)}</td>
            <td style="padding:4px 6px;border:1px solid #999;">${r.kode}</td>
            <td style="padding:4px 6px;border:1px solid #999;">${r.keterangan}</td>
            <td style="padding:4px 6px;border:1px solid #999;text-align:right;">${formatCurrency(r.jumlah)}</td>
        </tr>`
        )
        .join("");

    return `
    <html>
    <head>
        <title>Cash Opname - ${formatDateID(record.dariTanggal)} s/d ${formatDateID(record.sampaiTanggal)}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
            h1 { font-size: 16px; margin: 0; text-align:center; }
            .center { text-align:center; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background:#f3f4f6; border:1px solid #999; padding:4px 6px; text-align:left; }
            .total-row td { font-weight:bold; border:1px solid #999; padding:4px 6px; }
            .saldo-box { display:flex; justify-content:space-between; margin-top:14px; font-weight:bold; }
            .summary { margin-top:10px; }
            .summary div { display:flex; justify-content:space-between; padding:2px 0; font-weight:bold; }
            .footer { display:flex; justify-content:space-between; margin-top:60px; }
            .sign { text-align:center; width:45%; }
            .sign-line { margin-top:56px; border-top:1px solid #111; padding-top:4px; }
        </style>
    </head>
    <body>
        <h1>PETTY CASH</h1>
        <div class="center">${COMPANY_NAME}</div>
        <div class="center">PERIODE : ${formatDateID(record.dariTanggal)} s/d ${formatDateID(record.sampaiTanggal)}</div>

        <div class="saldo-box">
            <span>PETTY CASH SURABAYA</span>
            <span>${formatCurrency(record.saldoAwal)}</span>
        </div>

        <div style="font-weight:bold;margin-top:14px;">A. PENGELUARAN YG SDH SELESAI</div>
        <table>
            <thead>
                <tr><th>Tanggal</th><th>Kode</th><th>Keterangan</th><th style="text-align:right;">Jumlah</th></tr>
            </thead>
            <tbody>
                ${rowsA || `<tr><td colspan="4" style="padding:8px;border:1px solid #999;text-align:center;color:#888;">Tidak ada data</td></tr>`}
                <tr class="total-row"><td colspan="3" style="text-align:right;">Total A</td><td style="text-align:right;">${formatCurrency(record.totalA)}</td></tr>
            </tbody>
        </table>

        <div style="font-weight:bold;margin-top:14px;">B. UANG MUKA</div>
        <table>
            <thead>
                <tr><th>Tanggal</th><th>Kode</th><th>Keterangan</th><th style="text-align:right;">Jumlah</th></tr>
            </thead>
            <tbody>
                ${rowsB || `<tr><td colspan="4" style="padding:8px;border:1px solid #999;text-align:center;color:#888;">Tidak ada data</td></tr>`}
                <tr class="total-row"><td colspan="3" style="text-align:right;">Total B</td><td style="text-align:right;">${formatCurrency(record.totalB)}</td></tr>
            </tbody>
        </table>

        <div class="summary">
            <div><span>TOTAL A + B</span><span>${formatCurrency(record.totalAB)}</span></div>
            <div><span>SALDO AKHIR</span><span>${formatCurrency(record.saldoAkhir)}</span></div>
        </div>

        <div class="footer">
            <div class="sign">
                Dibuat oleh :
                <div style="display:flex;justify-content:space-around;">
                    <div class="sign-line">${record.dibuatOleh1}</div>
                    <div class="sign-line">${record.dibuatOleh2}</div>
                </div>
            </div>
            <div class="sign">
                Mengetahui,
                <div class="sign-line">${record.mengetahui}</div>
            </div>
        </div>
    </body>
    </html>`;
}

function printRecord(record) {
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) return;
    printWindow.document.write(buildPrintHtml(record));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}

function downloadRecord(record) {
    const htmlContent = buildPrintHtml(record);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CashOpname_${record.dariTanggal}_${record.sampaiTanggal}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function CashOpname() {
    const [dariTanggal, setDariTanggal] = useState("");
    const [sampaiTanggal, setSampaiTanggal] = useState("");
    const [saldoAwal, setSaldoAwal] = useState("");
    const [dibuatOleh1, setDibuatOleh1] = useState("");
    const [dibuatOleh2, setDibuatOleh2] = useState("");
    const [mengetahui, setMengetahui] = useState("");

    // JAM OTOMATIS — berjalan sendiri (live clock) hanya untuk tampilan di form,
    // TIDAK ikut dicetak/diunduh pada laporan.
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const [settlementRows, setSettlementRows] = useState([]);
    const [advanceRows, setAdvanceRows] = useState([]);

    // Master nama pegawai untuk "Dibuat oleh" / "Mengetahui" — diambil dari backend
    const [employeeOptions, setEmployeeOptions] = useState([]);

    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historySearch, setHistorySearch] = useState("");
    const [page, setPage] = useState(1);
    const perPage = 10;

    // Konfirmasi hapus history
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Status loading per aksi form: null | "simpan" | "cetak" | "unduh"
    const [actionLoading, setActionLoading] = useState(null);

    // Ambil history dari backend saat komponen dimuat, lalu bisa dipanggil
    // ulang (refreshHistory) setiap kali Simpan/Cetak/Unduh/Hapus berhasil
    // dikonfirmasi oleh backend.
    const refreshHistory = async () => {
        try {
            const data = await getCashOpnameHistory();
            setHistory(data || []);
        } catch (err) {
            console.error("Gagal memuat history Cash Opname:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        refreshHistory();
    }, []);

    // Ambil master pegawai sekali saat komponen dimuat.
    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const data = await getEmployees();
                const names = data.map((e) => e.employee_name).filter(Boolean);
                setEmployeeOptions(names);
            } catch (err) {
                console.error("Gagal memuat data employee:", err);
            }
        };
        loadEmployees();
    }, []);

    // Ambil rekap Settlement & Advance setiap kali rentang tanggal berubah.
    useEffect(() => {
        const loadRecap = async () => {
            if (!dariTanggal || !sampaiTanggal) {
                setSettlementRows([]);
                setAdvanceRows([]);
                return;
            }
            try {
                const [settlementData, advanceData] = await Promise.all([
                    getSettlementRecap({ start_date: dariTanggal, end_date: sampaiTanggal }),
                    getAdvanceRecap({ start_date: dariTanggal, end_date: sampaiTanggal }),
                ]);
                setSettlementRows(settlementData || []);
                setAdvanceRows(advanceData || []);
            } catch (err) {
                console.error("Gagal memuat rekap cash opname:", err);
            }
        };
        loadRecap();
    }, [dariTanggal, sampaiTanggal]);

    const totalA = useMemo(() => settlementRows.reduce((sum, r) => sum + Number(r.jumlah || 0), 0), [settlementRows]);
    const totalB = useMemo(() => advanceRows.reduce((sum, r) => sum + Number(r.jumlah || 0), 0), [advanceRows]);
    const totalAB = totalA + totalB;
    const saldoAkhir = (Number(saldoAwal) || 0) - totalAB;

    const dibuatOleh1Suggestions = useMemo(() => {
        const q = dibuatOleh1.toLowerCase().trim();
        if (!q) return [];
        return employeeOptions.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    }, [dibuatOleh1, employeeOptions]);

    const dibuatOleh2Suggestions = useMemo(() => {
        const q = dibuatOleh2.toLowerCase().trim();
        if (!q) return [];
        return employeeOptions.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    }, [dibuatOleh2, employeeOptions]);

    const mengetahuiSuggestions = useMemo(() => {
        const q = mengetahui.toLowerCase().trim();
        if (!q) return [];
        return employeeOptions.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    }, [mengetahui, employeeOptions]);

    const validateForm = () => {
        if (
            !dariTanggal ||
            !sampaiTanggal ||
            saldoAwal === "" ||
            !dibuatOleh1.trim() ||
            !dibuatOleh2.trim() ||
            !mengetahui.trim()
        ) {
            setFormError("Dari tanggal, sampai tanggal, saldo awal, dibuat oleh (2 orang), dan mengetahui wajib diisi.");
            return false;
        }
        if (sampaiTanggal < dariTanggal) {
            setFormError("Sampai tanggal tidak boleh lebih awal dari dari tanggal.");
            return false;
        }
        if (dibuatOleh1.trim().toLowerCase() === dibuatOleh2.trim().toLowerCase()) {
            setFormError("Dibuat oleh harus diisi oleh 2 orang yang berbeda.");
            return false;
        }
        setFormError("");
        return true;
    };

    const buildRecord = (aksi) => {
        const now = new Date();
        return {
            id: Date.now() + Math.random(),
            dariTanggal,
            sampaiTanggal,
            jam: formatTimeID(now), // tetap disimpan untuk histori internal, tidak dicetak/diunduh
            saldoAwal: Number(saldoAwal),
            dibuatOleh1: dibuatOleh1.trim(),
            dibuatOleh2: dibuatOleh2.trim(),
            mengetahui: mengetahui.trim(),
            settlementRows,
            advanceRows,
            totalA,
            totalB,
            totalAB,
            saldoAkhir,
            aksi, // "Simpan" | "Cetak" | "Unduh"
            createdAt: now.toISOString(),
        };
    };

    // Simpan HANYA menunggu backend: baris baru muncul di table history
    // setelah saveCashOpname() sukses dan history di-refresh dari server.
    const handleSimpan = async () => {
        if (!validateForm()) return;
        const record = buildRecord("Simpan");
        setActionLoading("simpan");
        try {
            await saveCashOpname(record);
            await refreshHistory();
            setSuccessMessage("Cash Opname berhasil disimpan.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal menyimpan Cash Opname:", err);
            setFormError("Gagal menyimpan Cash Opname ke server. Silakan coba lagi.");
        } finally {
            setActionLoading(null);
        }
    };

    // Cetak tetap membuka jendela print secara langsung (aksi lokal di browser),
    // tapi baris history baru muncul setelah backend mengonfirmasi penyimpanan.
    const handleCetak = async () => {
        if (!validateForm()) return;
        const record = buildRecord("Cetak");
        printRecord(record);
        setActionLoading("cetak");
        try {
            await saveCashOpname(record);
            await refreshHistory();
            setSuccessMessage("Cash Opname berhasil dicetak.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal menyimpan histori setelah cetak:", err);
            setFormError("Berhasil dicetak, namun gagal tersimpan ke histori server.");
        } finally {
            setActionLoading(null);
        }
    };

    // Unduh tetap mengunduh file secara langsung, tapi baris history baru
    // muncul setelah backend mengonfirmasi penyimpanan.
    const handleUnduh = async () => {
        if (!validateForm()) return;
        const record = buildRecord("Unduh");
        downloadRecord(record);
        setActionLoading("unduh");
        try {
            await saveCashOpname(record);
            await refreshHistory();
            setSuccessMessage("Cash Opname berhasil diunduh.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal menyimpan histori setelah unduh:", err);
            setFormError("Berhasil diunduh, namun gagal tersimpan ke histori server.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCetakUlang = (record) => {
        printRecord(record);
    };

    // Hapus menunggu konfirmasi backend sebelum baris hilang dari table.
    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteCashOpname(deleteTarget.id);
            await refreshHistory();
            setDeleteTarget(null);
            setSuccessMessage("Data Cash Opname berhasil dihapus.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal menghapus Cash Opname:", err);
            setFormError("Gagal menghapus data di server. Silakan coba lagi.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredHistory = useMemo(() => {
        const q = historySearch.toLowerCase().trim();
        if (!q) return history;
        return history.filter(
            (h) =>
                h.dariTanggal.includes(q) ||
                h.sampaiTanggal.includes(q) ||
                h.dibuatOleh1.toLowerCase().includes(q) ||
                h.dibuatOleh2.toLowerCase().includes(q) ||
                h.mengetahui.toLowerCase().includes(q)
        );
    }, [history, historySearch]);

    useEffect(() => {
        setPage(1);
    }, [historySearch, history.length]);

    const total = filteredHistory.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentRows = filteredHistory.slice((page - 1) * perPage, page * perPage);
    const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endEntry = Math.min(page * perPage, total);
    const visiblePages = [];
    for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

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
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {successMessage && (
                <div
                    style={{
                        position: "fixed", top: "20px", left: "50%", transform: "translate(-50%, 0)", zIndex: 100,
                        background: "#ecfdf5", border: "1.5px solid #6ee7b7", color: "#047857", borderRadius: "10px",
                        padding: "10px 18px", fontSize: "13px", fontWeight: 600, boxShadow: "0 8px 24px rgba(16,185,129,0.25)", animation: "toastIn 0.25s ease",
                    }}
                >
                    {successMessage}
                </div>
            )}

            {/* ================= MODAL KONFIRMASI HAPUS ================= */}
            {deleteTarget && (
                <div
                    style={{
                        position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", zIndex: 200,
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
                    }}
                    onClick={() => setDeleteTarget(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.25)", animation: "modalIn 0.2s ease",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                            <div style={{
                                width: "36px", height: "36px", borderRadius: "10px", background: "#fef2f2",
                                display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", flexShrink: 0,
                            }}>
                                <FaExclamationTriangle style={{ fontSize: "16px" }} />
                            </div>
                            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>Hapus Cash Opname?</h4>
                        </div>
                        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                            Data periode <strong>{formatDateID(deleteTarget.dariTanggal)} s/d {formatDateID(deleteTarget.sampaiTanggal)}</strong> akan dihapus secara permanen dan tidak dapat dikembalikan.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                style={{
                                    border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 16px",
                                    fontSize: "13px", fontWeight: 600, color: "#374151", background: "#fff",
                                    cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.6 : 1,
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirmed}
                                disabled={isDeleting}
                                style={{
                                    border: "none", borderRadius: "10px", padding: "8px 16px",
                                    fontSize: "13px", fontWeight: 600, color: "#fff", background: "#dc2626",
                                    cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.7 : 1,
                                }}
                            >
                                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= FORM CASH OPNAME ================= */}
            <div
                style={{
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px",
                    padding: "20px", margin: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
            >
                <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#363D48" }}>
                    Buat Cash Opname
                </h3>

                {/* BARIS 1: Dari Tanggal, Sampai Tanggal, Jam (otomatis), Saldo Awal */}
                <div
                    style={{
                        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "14px", marginBottom: "14px",
                    }}
                >
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Dari Tanggal</label>
                        <input
                            type="date"
                            value={dariTanggal}
                            onChange={(e) => setDariTanggal(e.target.value)}
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Sampai Tanggal</label>
                        <input
                            type="date"
                            value={sampaiTanggal}
                            onChange={(e) => setSampaiTanggal(e.target.value)}
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Jam</label>
                        <input
                            type="text"
                            value={formatTimeID(currentTime)}
                            readOnly
                            title="Jam hanya tampil di form, tidak ikut dicetak/diunduh"
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-500 bg-gray-50 w-full focus:outline-none"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Saldo Awal (Petty Cash)</label>
                        <input
                            type="number"
                            min="0"
                            value={saldoAwal}
                            onChange={(e) => setSaldoAwal(e.target.value)}
                            placeholder="45000000"
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        />
                    </div>
                </div>

                {/* BARIS 2: Dibuat Oleh (1), Dibuat Oleh (2), Mengetahui */}
                <div
                    style={{
                        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "14px", marginBottom: "10px",
                    }}
                >
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Dibuat Oleh (1)</label>
                        <AutocompleteInput
                            value={dibuatOleh1}
                            onChange={setDibuatOleh1}
                            onSelect={setDibuatOleh1}
                            suggestions={dibuatOleh1Suggestions}
                            placeholder="Nama pembuat 1"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Dibuat Oleh (2)</label>
                        <AutocompleteInput
                            value={dibuatOleh2}
                            onChange={setDibuatOleh2}
                            onSelect={setDibuatOleh2}
                            suggestions={dibuatOleh2Suggestions}
                            placeholder="Nama pembuat 2"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Mengetahui</label>
                        <AutocompleteInput
                            value={mengetahui}
                            onChange={setMengetahui}
                            onSelect={setMengetahui}
                            suggestions={mengetahuiSuggestions}
                            placeholder="Nama yang mengetahui"
                        />
                    </div>
                </div>

                {formError && (
                    <div style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>
                        {formError}
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                    <button
                        type="button"
                        onClick={handleCetak}
                        disabled={actionLoading !== null}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px", border: "1.5px solid #363D48",
                            borderRadius: "10px", padding: "9px 18px", fontSize: "13px", color: "#363D48",
                            background: "#fff", cursor: actionLoading !== null ? "not-allowed" : "pointer", fontWeight: 600,
                            opacity: actionLoading !== null ? 0.6 : 1,
                        }}
                    >
                        <FaPrint style={{ fontSize: "12px" }} />
                        {actionLoading === "cetak" ? "Menyimpan histori..." : "Cetak"}
                    </button>
                    <button
                        type="button"
                        onClick={handleUnduh}
                        disabled={actionLoading !== null}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px", border: "1.5px solid #363D48",
                            borderRadius: "10px", padding: "9px 18px", fontSize: "13px", color: "#363D48",
                            background: "#fff", cursor: actionLoading !== null ? "not-allowed" : "pointer", fontWeight: 600,
                            opacity: actionLoading !== null ? 0.6 : 1,
                        }}
                    >
                        <FaDownload style={{ fontSize: "12px" }} />
                        {actionLoading === "unduh" ? "Menyimpan histori..." : "Unduh"}
                    </button>
                    <button
                        type="button"
                        onClick={handleSimpan}
                        disabled={actionLoading !== null}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #363D48, #59616F)",
                            color: "#fff", border: "none", borderRadius: "10px", padding: "9px 18px", fontSize: "13px", fontWeight: 600,
                            cursor: actionLoading !== null ? "not-allowed" : "pointer", boxShadow: "0 4px 12px #59616F55",
                            opacity: actionLoading !== null ? 0.7 : 1,
                        }}
                    >
                        <FaSave style={{ fontSize: "12px" }} />
                        {actionLoading === "simpan" ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
            </div>

            {/* ================= HISTORY CASH OPNAME ================= */}
            <div
                style={{
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px",
                    padding: "20px", margin: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#363D48" }}>History Cash Opname</h3>
                    <div style={{ width: "260px" }}>
                        <input
                            type="text"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="Cari periode / nama..."
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-300 text-center">
                        <thead>
                            <tr className="text-xs uppercase tracking-wide bg-gray-50">
                                <th className="p-3 font-medium border border-gray-300">No</th>
                                <th className="p-3 font-medium border border-gray-300">Periode</th>
                                <th className="p-3 font-medium border border-gray-300">Jam</th>
                                <th className="p-3 font-medium border border-gray-300">Dibuat Oleh</th>
                                <th className="p-3 font-medium border border-gray-300">Mengetahui</th>
                                <th className="p-3 font-medium border border-gray-300">Total A + B</th>
                                <th className="p-3 font-medium border border-gray-300">Saldo Akhir</th>
                                <th className="p-3 font-medium border border-gray-300">Aksi Terakhir</th>
                                <th className="p-3 font-medium border border-gray-300">Aksi</th>
                            </tr>
                        </thead>

                        {historyLoading && (
                            <tbody>
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400 border border-gray-300">
                                        Memuat history Cash Opname...
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!historyLoading && filteredHistory.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400 border border-gray-300">
                                        {history.length === 0 ? "Belum ada history Cash Opname." : "Data tidak ditemukan."}
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!historyLoading && filteredHistory.length > 0 && (
                            <tbody>
                                {currentRows.map((row, idx) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{startEntry + idx}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                                            {formatDateID(row.dariTanggal)} s/d {formatDateID(row.sampaiTanggal)}
                                        </td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.jam}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.dibuatOleh1} & {row.dibuatOleh2}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.mengetahui}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-right" style={{ paddingRight: "10px" }}>{formatCurrency(row.totalAB)}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-right" style={{ paddingRight: "10px" }}>{formatCurrency(row.saldoAkhir)}</td>
                                        <td className="p-3 border border-gray-300">
                                            <span
                                                style={{
                                                    fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px",
                                                    background: row.aksi === "Simpan" ? "#ecfdf5" : row.aksi === "Cetak" ? "#eff6ff" : "#fef3c7",
                                                    color: row.aksi === "Simpan" ? "#047857" : row.aksi === "Cetak" ? "#1d4ed8" : "#b45309",
                                                }}
                                            >
                                                {row.aksi}
                                            </span>
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCetakUlang(row)}
                                                    title="Cetak Ulang"
                                                    style={{
                                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                        width: "32px", height: "32px",
                                                        background: "#fff", border: "1.5px solid #363D48", color: "#363D48",
                                                        borderRadius: "8px", cursor: "pointer",
                                                    }}
                                                >
                                                    <FaRedo style={{ fontSize: "13px" }} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(row)}
                                                    title="Hapus"
                                                    style={{
                                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                        width: "32px", height: "32px",
                                                        background: "#fff", border: "1.5px solid #fecaca", color: "#dc2626",
                                                        borderRadius: "8px", cursor: "pointer",
                                                    }}
                                                >
                                                    <FaTrashAlt style={{ fontSize: "13px" }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>

                {filteredHistory.length > 0 && (
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500" style={{ marginTop: "16px" }}>
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
            </div>
        </div>
    );
}