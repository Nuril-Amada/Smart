import { useState, useMemo, useRef, useEffect } from "react";
import {
    FaCashRegister,
    FaSave,
    FaPrint,
    FaRedo,
    FaSearch,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
// import {
//     getSettlementRecap,   // (periode) => [{ id, tanggal, kode, keterangan, jumlah }]
//     getAdvanceRecap,      // (periode) => [{ id, tanggal, kode, keterangan, jumlah }]
//     getEmployees,         // () => [{ id, nama }]
//     saveCashOpname,       // (payload) => saved record
//     getCashOpnameHistory, // () => history[]
// } from "../../api/cashOpname";

export const meta = {
    id: "cash_opname",
    label: "Cash Opname",
    icon: FaCashRegister,
    color: "#363D48",
};

const COMPANY_NAME = "PT. SMART Tbk Unit SURABAYA";

// ===== Dummy master pegawai untuk "Dibuat oleh" / "Mengetahui" =====
// Ganti dengan hasil getEmployees() saat backend siap.
const EMPLOYEE_OPTIONS = [
    "Hera Christanti",
    "Tina Meliana",
    "Andika Yuwono",
    "Moh. Baidowi",
    "Christie Adrian",
    "Dewi Priyanti",
    "Rizky R",
    "Ifan Safrianto",
    "Hary Dwi Widodo",
    "Nicholaus G",
    "Fandi P",
    "Moh. Hadi",
    "Hadi Supeno",
    "Santi",
];

// ===== Dummy rekap Settlement (Section A) & Advance (Section B) =====
// Ganti dengan getSettlementRecap(periode) / getAdvanceRecap(periode) saat backend siap.
const DUMMY_SETTLEMENT = [
    { id: "s1", tanggal: "2026-07-30", kode: "STLM", keterangan: "559/PPC/VII/2026 MOH. BAIDOWI, BY PEMB CHECK VALVE", jumlah: 759000 },
    { id: "s2", tanggal: "2026-07-28", kode: "STLM", keterangan: "564/PPC/VII/2026 CHRISTIE ADRIAN, BY PEMB MATERAI U/ BAG.EXPORT", jumlah: 1000000 },
    { id: "s3", tanggal: "2026-07-28", kode: "STLM", keterangan: "565/PPC/VII/2026 ORIENTASI, BY COO KADIN", jumlah: 600000 },
    { id: "s4", tanggal: "2026-07-28", kode: "STLM", keterangan: "567/PPC/VII/2026 DEWI PRIYANTI, BY OLAHRAGA", jumlah: 400000 },
    { id: "s5", tanggal: "2026-07-30", kode: "STLM", keterangan: "570/PPC/VII/2026 RIZKY R, BY PROSES HC & COO KADIN", jumlah: 500000 },
    { id: "s6", tanggal: "2026-07-31", kode: "STLM", keterangan: "577/PPC/VII/2026 IFAN SAFRIANTO, BY PEMB LED LAMPU DEKORASI", jumlah: 938750 },
    { id: "s7", tanggal: "2026-07-30", kode: "RMB", keterangan: "580/PPC/VII/2026 HARY DWI WIDODO, BY PEMB STYROFOAM, KABEL ROLL", jumlah: 474400 },
    { id: "s8", tanggal: "2026-07-30", kode: "RMB", keterangan: "581/PPC/VII/2026 NICHOLAUS G, BY PEMB RESIN MERAH, KATALIS U/ LANTAI GBJ", jumlah: 124000 },
    { id: "s9", tanggal: "2026-07-30", kode: "RMB", keterangan: "582/PPC/VII/2026 NICHOLAUS G, BY BANNER AREA LOADING GBJ MARSHO", jumlah: 450000 },
    { id: "s10", tanggal: "2026-07-30", kode: "RMB", keterangan: "583/PPC/VII/2026 NICHOLAUS G, BY STICKER CHECKLIST UNIT", jumlah: 33000 },
    { id: "s11", tanggal: "2026-07-31", kode: "RMB", keterangan: "584/PPC/VII/2026 FANDI P, BY PROSES HC", jumlah: 100000 },
];

const DUMMY_ADVANCE = [
    { id: "a1", tanggal: "2026-07-16", kode: "UM1", keterangan: "534/PPC/VII/2026 MOH. HADI BY PEMB ACRYLIC IDENTITAS POMPA", jumlah: 1000000 },
    { id: "a2", tanggal: "2026-07-29", kode: "UM5", keterangan: "578/PPC/VII/2026 HADI SUPENO BY PEMB CENTRIFUGE HOLE 4000 RPM", jumlah: 1000000 },
    { id: "a3", tanggal: "2026-07-30", kode: "UM6", keterangan: "579/PPC/VII/2026 SANTI BY PROSES HC", jumlah: 900000 },
    { id: "a4", tanggal: "2026-07-31", kode: "UM7", keterangan: "585/PPC/VII/2026 RIZKY R BY HC BPOM", jumlah: 300000 },
    { id: "a5", tanggal: "2026-07-31", kode: "UM8", keterangan: "586/PPC/VII/2026 SANTI BY PROSES HC", jumlah: 750000 },
    { id: "a6", tanggal: "2026-07-31", kode: "UM9", keterangan: "587/PPC/VII/2026 DEWI PRIYANTI BY KONSUMSI 551 31/07/2026", jumlah: 1000000 },
    { id: "a7", tanggal: "2026-07-31", kode: "UM10", keterangan: "588/PPC/VII/2026 DEWI PRIYANTI BY OLAHRAGA 31/07/2026", jumlah: 500000 },
];

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

// ===== Bangun HTML untuk jendela cetak, mengikuti layout template excel =====
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
        <title>Cash Opname - ${formatDateID(record.periode)}</title>
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
        <div class="center">PER TGL : ${formatDateID(record.periode)}</div>

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

export default function CashOpname() {
    const [periode, setPeriode] = useState("");
    const [saldoAwal, setSaldoAwal] = useState("");
    const [dibuatOleh1, setDibuatOleh1] = useState("");
    const [dibuatOleh2, setDibuatOleh2] = useState("");
    const [mengetahui, setMengetahui] = useState("");

    const [settlementRows, setSettlementRows] = useState([]);
    const [advanceRows, setAdvanceRows] = useState([]);

    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [history, setHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState("");
    const [page, setPage] = useState(1);
    const perPage = 10;

    // Ambil rekap Settlement & Advance setiap kali periode berubah.
    // Ganti isi try dengan pemanggilan getSettlementRecap(periode) / getAdvanceRecap(periode) saat backend siap.
    useEffect(() => {
        if (!periode) {
            setSettlementRows([]);
            setAdvanceRows([]);
            return;
        }
        const filteredA = DUMMY_SETTLEMENT.filter((r) => r.tanggal <= periode);
        const filteredB = DUMMY_ADVANCE.filter((r) => r.tanggal <= periode);
        setSettlementRows(filteredA);
        setAdvanceRows(filteredB);
    }, [periode]);

    const totalA = useMemo(() => settlementRows.reduce((sum, r) => sum + Number(r.jumlah || 0), 0), [settlementRows]);
    const totalB = useMemo(() => advanceRows.reduce((sum, r) => sum + Number(r.jumlah || 0), 0), [advanceRows]);
    const totalAB = totalA + totalB;
    const saldoAkhir = (Number(saldoAwal) || 0) - totalAB;

    const dibuatOleh1Suggestions = useMemo(() => {
        const q = dibuatOleh1.toLowerCase().trim();
        if (!q) return [];
        return EMPLOYEE_OPTIONS.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    }, [dibuatOleh1]);

    const dibuatOleh2Suggestions = useMemo(() => {
        const q = dibuatOleh2.toLowerCase().trim();
        if (!q) return [];
        return EMPLOYEE_OPTIONS.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    }, [dibuatOleh2]);

    const mengetahuiSuggestions = useMemo(() => {
        const q = mengetahui.toLowerCase().trim();
        if (!q) return [];
        return EMPLOYEE_OPTIONS.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    }, [mengetahui]);

    const validateForm = () => {
        if (!periode || saldoAwal === "" || !dibuatOleh1.trim() || !dibuatOleh2.trim() || !mengetahui.trim()) {
            setFormError("Tanggal, saldo awal, dibuat oleh (2 orang), dan mengetahui wajib diisi.");
            return false;
        }
        if (dibuatOleh1.trim().toLowerCase() === dibuatOleh2.trim().toLowerCase()) {
            setFormError("Dibuat oleh harus diisi oleh 2 orang yang berbeda.");
            return false;
        }
        setFormError("");
        return true;
    };

    const buildRecord = (aksi) => ({
        id: Date.now() + Math.random(),
        periode,
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
        aksi, // "Simpan" | "Cetak"
        createdAt: new Date().toISOString(),
    });

    // NOTE: ganti setHistory(...) dengan pemanggilan saveCashOpname(payload) lalu
    // await getCashOpnameHistory() saat backend siap.
    const handleSimpan = () => {
        if (!validateForm()) return;
        const record = buildRecord("Simpan");
        setHistory((prev) => [record, ...prev]);
        setSuccessMessage("Cash Opname berhasil disimpan.");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleCetak = () => {
        if (!validateForm()) return;
        const record = buildRecord("Cetak");
        setHistory((prev) => [record, ...prev]);
        printRecord(record);
        setSuccessMessage("Cash Opname berhasil dicetak.");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleCetakUlang = (record) => {
        printRecord(record);
    };

    const filteredHistory = useMemo(() => {
        const q = historySearch.toLowerCase().trim();
        if (!q) return history;
        return history.filter(
            (h) =>
                h.periode.includes(q) ||
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

            {/* ================= FORM + PREVIEW CASH OPNAME ================= */}
            <div
                style={{
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px",
                    padding: "20px", margin: "0 10px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
            >
                <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#363D48" }}>
                    Buat Cash Opname
                </h3>

                <div
                    style={{
                        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "14px", marginBottom: "10px",
                    }}
                >
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Per Tanggal</label>
                        <input
                            type="date"
                            value={periode}
                            onChange={(e) => setPeriode(e.target.value)}
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
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

                {/* ===== Preview mengikuti layout template excel ===== */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px", background: "#fafafa" }}>
                    <div style={{ textAlign: "center", marginBottom: "10px" }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#1f2937" }}>PETTY CASH</div>
                        <div style={{ fontSize: "12px", color: "#4b5563" }}>{COMPANY_NAME}</div>
                        <div style={{ fontSize: "12px", color: "#4b5563" }}>PER TGL : {periode ? formatDateID(periode) : "-"}</div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "13px", color: "#1f2937", padding: "8px 0", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                        <span>PETTY CASH SURABAYA</span>
                        <span>{formatCurrency(saldoAwal)}</span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#1f2937", marginTop: "14px", marginBottom: "6px" }}>
                        A. PENGELUARAN YG SDH SELESAI
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2 border border-gray-300">Tanggal</th>
                                    <th className="p-2 border border-gray-300">Kode</th>
                                    <th className="p-2 border border-gray-300">Keterangan</th>
                                    <th className="p-2 border border-gray-300 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settlementRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-3 text-center text-gray-400 border border-gray-300">
                                            {periode ? "Tidak ada data settlement." : "Pilih tanggal untuk menampilkan rekap."}
                                        </td>
                                    </tr>
                                ) : (
                                    settlementRows.map((r) => (
                                        <tr key={r.id}>
                                            <td className="p-2 border border-gray-300">{formatDateID(r.tanggal)}</td>
                                            <td className="p-2 border border-gray-300">{r.kode}</td>
                                            <td className="p-2 border border-gray-300">{r.keterangan}</td>
                                            <td className="p-2 border border-gray-300 text-right">{formatCurrency(r.jumlah)}</td>
                                        </tr>
                                    ))
                                )}
                                <tr className="font-semibold">
                                    <td colSpan={3} className="p-2 border border-gray-300 text-right">Total A</td>
                                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(totalA)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#1f2937", marginTop: "16px", marginBottom: "6px" }}>
                        B. UANG MUKA
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2 border border-gray-300">Tanggal</th>
                                    <th className="p-2 border border-gray-300">Kode</th>
                                    <th className="p-2 border border-gray-300">Keterangan</th>
                                    <th className="p-2 border border-gray-300 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advanceRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-3 text-center text-gray-400 border border-gray-300">
                                            {periode ? "Tidak ada data uang muka." : "Pilih tanggal untuk menampilkan rekap."}
                                        </td>
                                    </tr>
                                ) : (
                                    advanceRows.map((r) => (
                                        <tr key={r.id}>
                                            <td className="p-2 border border-gray-300">{formatDateID(r.tanggal)}</td>
                                            <td className="p-2 border border-gray-300">{r.kode}</td>
                                            <td className="p-2 border border-gray-300">{r.keterangan}</td>
                                            <td className="p-2 border border-gray-300 text-right">{formatCurrency(r.jumlah)}</td>
                                        </tr>
                                    ))
                                )}
                                <tr className="font-semibold">
                                    <td colSpan={3} className="p-2 border border-gray-300 text-right">Total B</td>
                                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(totalB)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: "14px", fontSize: "13px", color: "#1f2937" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, padding: "4px 0" }}>
                            <span>TOTAL A + B</span>
                            <span>{formatCurrency(totalAB)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, padding: "4px 0" }}>
                            <span>SALDO AKHIR</span>
                            <span>{formatCurrency(saldoAkhir)}</span>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px", color: "#374151" }}>
                        <div style={{ width: "55%" }}>
                            <div>Dibuat oleh :</div>
                            <div style={{ display: "flex", justifyContent: "space-around", marginTop: "44px", textAlign: "center" }}>
                                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "4px", minWidth: "100px" }}>{dibuatOleh1 || "-"}</div>
                                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "4px", minWidth: "100px" }}>{dibuatOleh2 || "-"}</div>
                            </div>
                        </div>
                        <div style={{ width: "35%", textAlign: "center" }}>
                            <div>Mengetahui,</div>
                            <div style={{ borderTop: "1px solid #9ca3af", marginTop: "44px", paddingTop: "4px" }}>{mengetahui || "-"}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                    <button
                        type="button"
                        onClick={handleCetak}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px", border: "1.5px solid #363D48",
                            borderRadius: "10px", padding: "9px 18px", fontSize: "13px", color: "#363D48",
                            background: "#fff", cursor: "pointer", fontWeight: 600,
                        }}
                    >
                        <FaPrint style={{ fontSize: "12px" }} />
                        Cetak
                    </button>
                    <button
                        type="button"
                        onClick={handleSimpan}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #363D48, #59616F)",
                            color: "#fff", border: "none", borderRadius: "10px", padding: "9px 18px", fontSize: "13px", fontWeight: 600,
                            cursor: "pointer", boxShadow: "0 4px 12px #59616F55",
                        }}
                    >
                        <FaSave style={{ fontSize: "12px" }} />
                        Simpan
                    </button>
                </div>
            </div>

            {/* ================= HISTORY CASH OPNAME ================= */}
            <div
                style={{
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px",
                    padding: "20px", margin: "0 10px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
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
                                <th className="p-3 font-medium border border-gray-300">Per Tanggal</th>
                                <th className="p-3 font-medium border border-gray-300">Dibuat Oleh</th>
                                <th className="p-3 font-medium border border-gray-300">Mengetahui</th>
                                <th className="p-3 font-medium border border-gray-300">Total A + B</th>
                                <th className="p-3 font-medium border border-gray-300">Saldo Akhir</th>
                                <th className="p-3 font-medium border border-gray-300">Aksi Terakhir</th>
                                <th className="p-3 font-medium border border-gray-300">Cetak Ulang</th>
                            </tr>
                        </thead>

                        {filteredHistory.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400 border border-gray-300">
                                        {history.length === 0 ? "Belum ada history Cash Opname." : "Data tidak ditemukan."}
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {filteredHistory.length > 0 && (
                            <tbody>
                                {currentRows.map((row, idx) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{startEntry + idx}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{formatDateID(row.periode)}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.dibuatOleh1} & {row.dibuatOleh2}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.mengetahui}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-right" style={{ paddingRight: "10px" }}>{formatCurrency(row.totalAB)}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-right" style={{ paddingRight: "10px" }}>{formatCurrency(row.saldoAkhir)}</td>
                                        <td className="p-3 border border-gray-300">
                                            <span
                                                style={{
                                                    fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px",
                                                    background: row.aksi === "Simpan" ? "#ecfdf5" : "#eff6ff",
                                                    color: row.aksi === "Simpan" ? "#047857" : "#1d4ed8",
                                                }}
                                            >
                                                {row.aksi}
                                            </span>
                                        </td>
                                        <td className="p-3 border border-gray-300">
                                            <button
                                                type="button"
                                                onClick={() => handleCetakUlang(row)}
                                                title="Cetak Ulang"
                                                style={{
                                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                                    background: "#fff", border: "1.5px solid #363D48", color: "#363D48",
                                                    borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                                                }}
                                            >
                                                <FaRedo style={{ fontSize: "11px" }} />
                                                Cetak Ulang
                                            </button>
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