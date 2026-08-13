import { useState, useMemo, useRef, useEffect } from "react";
import {
    FaCashRegister,
    FaSave,
    FaPrint,
    FaDownload,
    FaSearch,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaTrash,
    FaTrashAlt,
    FaExclamationTriangle,
    FaEdit,
} from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
    getCashOpnameHistory,
    saveCashOpname,
    updateCashOpname,
    deleteCashOpname,
    getSettlementRecap,
    getAdvanceRecap,
} from "../api/cash_opname";
import { getEmployees } from "../api/employee";

export const meta = {
    id: "cash_opname",
    label: "Cash Opname",
    icon: FaCashRegister,
    color: "#363D48",
};

const COMPANY_NAME = "PT. SMART Tbk Unit SURABAYA";

// Ukuran kertas & margin cetak/unduh: A4, margin 2,54 cm di semua sisi
const PDF_PAGE_WIDTH_CM = 21.0;
const PDF_PAGE_HEIGHT_CM = 29.7;
const PDF_MARGIN_CM = 2.54;

function formatCurrency(n) {
    const num = Number(n) || 0;
    return "Rp " + num.toLocaleString("id-ID");
}

function formatNumberID(n) {
    const num = Number(n) || 0;
    return num.toLocaleString("id-ID");
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

function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, inputStyle, wrapperStyle }) {
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
                    className="border border-gray-300 rounded-lg text-sm pl-3 pr-8 py-2 text-gray-700 w-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
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
                        title="Hapus"
                    >
                        <FaTimes className="text-xs" />
                    </button>
                ) : (
                    <FaSearch className="absolute right-42 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
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

function getRowInfo(r) {
    const tanggal = formatDateID(r.tanggal);
    const tipe = r.tipe || "STLM";
    const kode = r.kode || r.ppc_no || "-";
    const namaUser = r.namaUser || r.nama_user || "";
    const keterangan = r.keterangan || r.description || "";

    return {
        tanggal,
        tipe,
        kode,
        namaUser: namaUser || "-",
        keterangan: keterangan || "-",
        jumlah: formatNumberID(r.jumlah),
    };
}

// ===== CSS laporan (dipakai bersama oleh jendela cetak & proses unduh PDF) =====
// Catatan: aturan @page (ukuran A4 + margin 2,54cm) hanya relevan untuk jendela
// cetak (window.print()). Untuk unduh PDF, ukuran & margin diatur langsung lewat jsPDF.
const REPORT_STYLES = `
.cop-report {
    font-family: Arial, sans-serif;
    font-size: 11px;
    color: #000;
    line-height: 1.4;
    background: #fff;
    margin: 0;
    padding: 0;
}
.cop-report .header-title {
    text-align: center;
    margin-bottom: 16px;
}
.cop-report .header-title h1 {
    font-size: 14px;
    font-weight: bold;
    margin: 0 0 2px 0;
    letter-spacing: 0.5px;
}
.cop-report .header-title h2 {
    font-size: 12px;
    font-weight: bold;
    margin: 0 0 10px 0;
}
.cop-report .header-title .period {
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 12px;
}
.cop-report .saldo-header {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 12px;
    padding-bottom: 4px;
}
.cop-report table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
}
.cop-report th {
    text-align: left;
    font-weight: bold;
    padding: 4px 8px;
    font-size: 11px;
    border-bottom: 1px solid #333;
}
.cop-report td {
    font-size: 11px;
}
.cop-report .section-label {
    font-weight: bold;
    font-size: 11px;
    margin-top: 14px;
    margin-bottom: 4px;
}
.cop-report .subtotal-row td {
    font-weight: bold;
    padding: 6px 8px;
    border-top: 1px solid #333;
}
.cop-report .summary-container {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}
.cop-report .summary-table {
    width: 320px;
    margin-top: 4px;
}
.cop-report .summary-table td {
    padding: 4px 6px;
    font-weight: bold;
    font-size: 11px;
}
.cop-report .signature-section {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
}
.cop-report .sign-box-left {
    width: 55%;
}
.cop-report .sign-box-right {
    width: 35%;
    text-align: center;
}
.cop-report .sign-header {
    font-weight: bold;
    margin-bottom: 55px;
}
.cop-report .sign-names-left {
    display: flex;
    justify-content: flex-start;
    gap: 50px;
    font-weight: bold;
}
.cop-report .sign-names-right {
    font-weight: bold;
}
`;

// ===== Bangun isi (inner content) laporan, dipakai bersama oleh cetak & unduh PDF =====
function buildReportContentHtml(record) {
    const rowsA = (record.settlementRows || [])
        .map((r) => {
            const info = getRowInfo(r);
            return `
        <tr>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.tanggal}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.kode}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.namaUser}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.keterangan}</td>
            <td style="padding:4px 8px;text-align:right;padding-right: 40px;border-bottom:1px solid #eee;">${info.jumlah}</td>
        </tr>`;
        })
        .join("");

    const rowsB = (record.advanceRows || [])
        .map((r) => {
            const info = getRowInfo(r);
            return `
        <tr>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.tanggal}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.kode}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.namaUser}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">${info.keterangan}</td>
            <td style="padding:4px 8px;text-align:right;padding-right: 40px;border-bottom:1px solid #eee;">${info.jumlah}</td>
        </tr>`;
        })
        .join("");

    return `
        <div class="header-title">
            <h1>LAPORAN PETTY CASH</h1>
            <h2>${COMPANY_NAME}</h2>
            <div class="period">PER TGL : ${formatDateID(record.sampaiTanggal)}</div>
        </div>

        <div class="saldo-header">
            <span>PETTY CASH SURABAYA</span>
            <span>${formatNumberID(record.saldoAwal)},00</span>
        </div>

        <div class="section-label">A. PENGELUARAN YANG SUDAH SELESAI</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 14%;">Tanggal</th>
                    <th style="width: 18%;">Nomor PPC</th>
                    <th style="width: 22%;">Nama User</th>
                    <th style="width: 30%;">Keterangan</th>
                    <th style="width: 16%; text-align: right; padding-right: 40px;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                ${rowsA ||
        `<tr><td colSpan="5" style="text-align:center;padding:8px;color:#888;">Tidak ada data pengeluaran</td></tr>`
        }
                <tr class="subtotal-row">
                    <td colSpan="4"></td>
                    <td style="text-align: right; padding-right: 40px;">${formatNumberID(record.totalA)}</td>
                </tr>
            </tbody>
        </table>

        <div class="section-label" style="margin-top: 16px;">B. UANG MUKA</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 14%;">Tanggal</th>
                    <th style="width: 18%;">Nomor PPC</th>
                    <th style="width: 22%;">Nama User</th>
                    <th style="width: 30%;">Keterangan</th>
                    <th style="width: 16%; text-align: right; padding-right: 40px;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                ${rowsB ||
        `<tr><td colSpan="5" style="text-align:center;padding:8px;color:#888;">Tidak ada data uang muka</td></tr>`
        }
                <tr class="subtotal-row">
                     <td colSpan="4"></td>
                    <td style="text-align: right; padding-right: 40px;">${formatNumberID(record.totalB)}</td>
                </tr>
            </tbody>
        </table>

        <div class="summary-container">
            <table class="summary-table">
                <tr>
                    <td style="text-align: right; width: 60%;">TOTAL A + B</td>
                    <td style="text-align: right; width: 40%;">${formatNumberID(record.totalAB)}</td>
                </tr>
                <tr>
                    <td style="text-align: right;">SALDO AKHIR</td>
                    <td style="text-align: right;">${formatNumberID(record.saldoAkhir)}</td>
                </tr>
            </table>
        </div>

        <div class="signature-section">
            <div class="sign-box-left">
                <div class="sign-header">Dibuat oleh :</div>
                <div class="sign-names-left">
                    <span>${record.dibuatOleh1}</span>
                    <span>${record.dibuatOleh2}</span>
                </div>
            </div>
            <div class="sign-box-right">
                <div class="sign-header">Mengetahui,</div>
                <div class="sign-names-right">
                    <span>${record.mengetahui}</span>
                </div>
            </div>
            </div>`;
}

// ===== HTML lengkap untuk jendela cetak (window.print) — A4, margin 2,54cm =====
function buildPrintHtml(record) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>PETTY CASH - PER TGL : ${formatDateID(record.sampaiTanggal)}</title>
        <style>
            @page {
                size: A4 portrait;
                margin: ${PDF_MARGIN_CM}cm;
            }
            body {
                margin: 0;
                padding: 0;
            }
            ${REPORT_STYLES}
        </style>
    </head>
    <body>
        <div class="cop-report">
            ${buildReportContentHtml(record)}
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

// Tidak menampilkan preview/dialog cetak — file PDF langsung tersimpan ke folder unduhan browser.
async function generatePdfFromElement(element, filename) {
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF({ unit: "cm", format: "a4", orientation: "portrait" });

    const contentWidthCm = PDF_PAGE_WIDTH_CM - PDF_MARGIN_CM * 2;
    const contentHeightCm = PDF_PAGE_HEIGHT_CM - PDF_MARGIN_CM * 2;

    const pxToCm = contentWidthCm / canvas.width;
    const totalHeightCm = canvas.height * pxToCm;

    if (totalHeightCm <= contentHeightCm) {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", PDF_MARGIN_CM, PDF_MARGIN_CM, contentWidthCm, totalHeightCm);
    } else {
        // Konten lebih tinggi dari 1 halaman A4 -> dipotong per halaman
        const pageHeightPx = Math.floor(contentHeightCm / pxToCm);
        let sourceY = 0;
        let firstPage = true;

        while (sourceY < canvas.height) {
            const sliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            const ctx = sliceCanvas.getContext("2d");
            ctx.drawImage(
                canvas,
                0, sourceY, canvas.width, sliceHeightPx,
                0, 0, canvas.width, sliceHeightPx
            );

            const sliceData = sliceCanvas.toDataURL("image/png");
            const sliceHeightCm = sliceHeightPx * pxToCm;

            if (!firstPage) pdf.addPage();
            pdf.addImage(sliceData, "PNG", PDF_MARGIN_CM, PDF_MARGIN_CM, contentWidthCm, sliceHeightCm);

            sourceY += sliceHeightPx;
            firstPage = false;
        }
    }

    pdf.save(filename);
}

async function downloadRecordAsPdf(record) {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "700px";
    container.style.background = "#ffffff";
    container.innerHTML = `<style>${REPORT_STYLES}</style><div class="cop-report">${buildReportContentHtml(record)}</div>`;
    document.body.appendChild(container);

    try {
        await generatePdfFromElement(
            container,
            `CashOpname_${record.dariTanggal}_${record.sampaiTanggal}.pdf`
        );
    } finally {
        document.body.removeChild(container);
    }
}

export default function CashOpname() {
    const [dariTanggal, setDariTanggal] = useState("");
    const [sampaiTanggal, setSampaiTanggal] = useState("");
    const [saldoAwal, setSaldoAwal] = useState("");
    const [dibuatOleh1, setDibuatOleh1] = useState("");
    const [dibuatOleh2, setDibuatOleh2] = useState("");
    const [mengetahui, setMengetahui] = useState("");

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const [settlementRows, setSettlementRows] = useState([]);
    const [advanceRows, setAdvanceRows] = useState([]);

    const [employeeOptions, setEmployeeOptions] = useState([]);

    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [page, setPage] = useState(1);
    const perPage = 10;

    const [editingId, setEditingId] = useState(null); // null = mode buat baru
    const formRef = useRef(null);

    // ===== MODE HAPUS (batch, disamakan dengan Advance) =====
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [actionLoading, setActionLoading] = useState(null);

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

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const data = await getEmployees();
                const names = (data || []).map((e) => e.employee_name).filter(Boolean);
                setEmployeeOptions(names);
            } catch (err) {
                console.error("Gagal memuat data employee:", err);
            }
        };
        loadEmployees();
    }, []);

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

    const totalA = useMemo(
        () => settlementRows.reduce((sum, r) => sum + Number(r.jumlah || 0), 0),
        [settlementRows]
    );
    const totalB = useMemo(
        () => advanceRows.reduce((sum, r) => sum + Number(r.jumlah || 0), 0),
        [advanceRows]
    );
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
            setFormError("Silakan lengkapi form cash opname terlebih dahulu.");
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
            dariTanggal,
            sampaiTanggal,
            jam: formatTimeID(now),
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
            aksi,
        };
    };

    const handleSimpan = async () => {
        if (!validateForm()) return;
        const record = buildRecord("Simpan");
        setActionLoading("simpan");
        try {
            if (editingId) {
                await updateCashOpname(editingId, record);
            } else {
                await saveCashOpname(record);
            }
            await refreshHistory();
            setEditingId(null);
            setSuccessMessage(editingId ? "Cash Opname berhasil diperbarui." : "Cash Opname berhasil disimpan.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal menyimpan Cash Opname:", err);
            setFormError("Gagal menyimpan Cash Opname ke server. Silakan coba lagi.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnduh = async () => {
        if (!validateForm()) return;
        const record = buildRecord("Unduh (PDF)");
        setActionLoading("unduh");
        try {
            if (editingId) {
                await updateCashOpname(editingId, record);
            } else {
                await saveCashOpname(record);
            }
            await refreshHistory();
            setEditingId(null);
            setSuccessMessage(editingId ? "Cash Opname diperbarui & PDF berhasil diunduh." : "Cash Opname berhasil diunduh (PDF) dan disimpan ke histori.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal mengunduh PDF Cash Opname:", err);
            setFormError("Gagal mengunduh PDF Cash Opname. Silakan coba lagi.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditRow = (row) => {
        setDariTanggal(row.dariTanggal || "");
        setSampaiTanggal(row.sampaiTanggal || "");
        setSaldoAwal(String(row.saldoAwal || ""));
        setDibuatOleh1(row.dibuatOleh1 || "");
        setDibuatOleh2(row.dibuatOleh2 || "");
        setMengetahui(row.mengetahui || "");
        setSettlementRows(row.settlementRows || []);
        setAdvanceRows(row.advanceRows || []);
        setEditingId(row.id);
        setFormError("");
        // Scroll ke form
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleCancelEdit = () => {
        setDariTanggal("");
        setSampaiTanggal("");
        setSaldoAwal("");
        setDibuatOleh1("");
        setDibuatOleh2("");
        setMengetahui("");
        setSettlementRows([]);
        setAdvanceRows([]);
        setEditingId(null);
        setFormError("");
    };

    const handleCetakUlang = (record) => {
        printRecord(record);
    };

    // ===== toggle pilih 1 baris =====
    const toggleSelectRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ===== aktifkan / matikan mode hapus =====
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

    // ===== eksekusi hapus batch =====
    const handleDeleteBatchConfirm = async () => {
        if (selectedIds.size === 0) return;
        setDeleting(true);
        setDeleteError("");
        try {
            await Promise.all([...selectedIds].map((id) => deleteCashOpname(id)));
            await refreshHistory();
            setDeleteBatchOpen(false);
            setDeleteMode(false);
            setSelectedIds(new Set());
            setSuccessMessage("Data Cash Opname terpilih berhasil dihapus.");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Gagal menghapus Cash Opname:", err);
            setDeleteError("Gagal menghapus data di server. Silakan coba lagi.");
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [history.length]);

    const total = history.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentRows = history.slice((page - 1) * perPage, page * perPage);
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

            {/* ================= FORM CASH OPNAME ================= */}
            <div
                style={{
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px",
                    padding: "16px 20px", margin: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                }}
            >
                <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#363D48" }}>
                    Buat Cash Opname
                </h3>

                {/* BARIS 1: Dari Tanggal, Sampai Tanggal, Jam, Saldo Awal */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: "130px", flex: "1" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Dari Tanggal</label>
                        <input
                            type="date"
                            value={dariTanggal}
                            onChange={(e) => setDariTanggal(e.target.value)}
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#374151", outline: "none", width: "100%" }}
                            onFocus={(e) => e.target.style.borderColor = "#9ca3af"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", minWidth: "130px", flex: "1" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Sampai Tanggal</label>
                        <input
                            type="date"
                            value={sampaiTanggal}
                            onChange={(e) => setSampaiTanggal(e.target.value)}
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#374151", outline: "none", width: "100%" }}
                            onFocus={(e) => e.target.style.borderColor = "#9ca3af"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", minWidth: "100px", flex: "0 0 auto" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Jam</label>
                        <input
                            type="text"
                            value={formatTimeID(currentTime)}
                            readOnly
                            title="Jam hanya tampil di form, tidak ikut dicetak/diunduh"
                            style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", fontWeight: 700, color: "#6b7280", background: "#f9fafb", outline: "none", width: "100%" }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", minWidth: "150px", flex: "1" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Saldo Awal (Petty Cash)</label>
                        <input
                            type="number"
                            min="0"
                            value={saldoAwal}
                            onChange={(e) => setSaldoAwal(e.target.value)}
                            placeholder="45000000"
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#374151", outline: "none", width: "100%" }}
                            onFocus={(e) => e.target.style.borderColor = "#9ca3af"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>
                </div>

                {/* BARIS 2: Dibuat Oleh (1), Dibuat Oleh (2), Mengetahui */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: "140px", flex: "1" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Dibuat Oleh (1)</label>
                        <input
                            type="text"
                            value={dibuatOleh1}
                            onChange={(e) => setDibuatOleh1(e.target.value)}
                            placeholder="Nama pembuat 1"
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#374151", outline: "none", width: "100%" }}
                            onFocus={(e) => e.target.style.borderColor = "#9ca3af"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", minWidth: "140px", flex: "1" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Dibuat Oleh (2)</label>
                        <input
                            type="text"
                            value={dibuatOleh2}
                            onChange={(e) => setDibuatOleh2(e.target.value)}
                            placeholder="Nama pembuat 2"
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#374151", outline: "none", width: "100%" }}
                            onFocus={(e) => e.target.style.borderColor = "#9ca3af"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", minWidth: "140px", flex: "1" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Mengetahui</label>
                        <input
                            type="text"
                            value={mengetahui}
                            onChange={(e) => setMengetahui(e.target.value)}
                            placeholder="Nama yang mengetahui"
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#374151", outline: "none", width: "100%" }}
                            onFocus={(e) => e.target.style.borderColor = "#9ca3af"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>
                </div>

                {formError && (
                    <div style={{ fontSize: "12px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", marginBottom: "10px" }}>
                        {formError}
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                    <button
                        type="button"
                        onClick={handleUnduh}
                        disabled={actionLoading !== null}
                        style={{
                            display: "flex", alignItems: "center", gap: "6px", border: "1.5px solid #363D48",
                            borderRadius: "8px", padding: "5px 12px", fontSize: "12px", color: "#363D48",
                            background: "#fff", cursor: actionLoading !== null ? "not-allowed" : "pointer", fontWeight: 600,
                            opacity: actionLoading !== null ? 0.6 : 1,
                        }}
                    >
                        <FaDownload style={{ fontSize: "11px" }} />
                        {actionLoading === "unduh" ? "Membuat & Mengunduh PDF..." : "Unduh PDF"}
                    </button>
                    <button
                        type="button"
                        onClick={handleSimpan}
                        disabled={actionLoading !== null}
                        style={{
                            display: "flex", alignItems: "center", gap: "6px", background: "#363D48",
                            color: "#fff", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "12px", fontWeight: 600,
                            cursor: actionLoading !== null ? "not-allowed" : "pointer",
                            opacity: actionLoading !== null ? 0.7 : 1,
                        }}
                    >
                        <FaSave style={{ fontSize: "11px" }} />
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
                <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#363D48" }}>History Cash Opname</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Mode hapus TIDAK aktif -> tombol trash untuk masuk mode hapus */}
                        {!deleteMode && (
                            <button
                                type="button"
                                onClick={handleEnterDeleteMode}
                                title="Pilih data untuk dihapus"
                                style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "32px", height: "32px",
                                    background: "#b91c1c", color: "#fff", border: "none",
                                    borderRadius: "8px", cursor: "pointer",
                                }}
                            >
                                <FaTrash style={{ fontSize: "13px" }} />
                            </button>
                        )}

                        {/* Mode hapus AKTIF -> tombol Batal + Hapus (N) */}
                        {deleteMode && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleExitDeleteMode}
                                    style={{
                                        border: "1.5px solid #e5e7eb", borderRadius: "8px", padding: "6px 12px",
                                        fontSize: "12px", fontWeight: 600, color: "#374151", background: "#fff", cursor: "pointer",
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setDeleteError(""); setDeleteBatchOpen(true); }}
                                    disabled={selectedIds.size === 0}
                                    title={selectedIds.size === 0 ? "Pilih data terlebih dahulu" : `Hapus ${selectedIds.size} data terpilih`}
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "6px",
                                        border: "none", borderRadius: "8px", padding: "6px 12px",
                                        fontSize: "12px", fontWeight: 600, color: "#fff", background: "#dc2626",
                                        cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                                        opacity: selectedIds.size === 0 ? 0.5 : 1,
                                    }}
                                >
                                    <FaTrashAlt style={{ fontSize: "11px" }} />
                                    Hapus {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                                </button>
                            </>
                        )}
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
                                <th className="p-3 font-medium border border-gray-300">Cetak</th>
                                {deleteMode && (
                                    <th className="p-3 font-medium border border-gray-300"></th>
                                )}
                            </tr>
                        </thead>

                        {historyLoading && (
                            <tbody>
                                <tr>
                                    <td colSpan={deleteMode ? 10 : 9} className="p-8 text-center text-gray-400 border border-gray-300">
                                        Memuat history Cash Opname...
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!historyLoading && history.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400 border border-gray-300">
                                        Belum ada history Cash Opname.
                                    </td>
                                </tr>
                            </tbody>
                        )}

                        {!historyLoading && history.length > 0 && (
                            <tbody>
                                {currentRows.map((row, idx) => (
                                    <tr
                                        key={row.id}
                                        className={`hover:bg-gray-50 ${deleteMode && selectedIds.has(row.id) ? "bg-red-50" : ""}`}
                                    >
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{startEntry + idx}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                                            {formatDateID(row.dariTanggal)} s/d {formatDateID(row.sampaiTanggal)}
                                        </td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.jam}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.dibuatOleh1} & {row.dibuatOleh2}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{row.mengetahui}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{formatCurrency(row.totalAB)}</td>
                                        <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{formatCurrency(row.saldoAkhir)}</td>
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
                                                        background: "#fff",
                                                        borderRadius: "8px", cursor: "pointer",
                                                    }}
                                                >
                                                    <FaPrint style={{ fontSize: "13px" }} />
                                                </button>
                                                
                                            </div>
                                        </td>
                                        {/* Kolom checkbox seleksi hapus — hanya muncul saat deleteMode, disamakan dengan Advance */}
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
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>

                {history.length > 0 && (
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
            {/* MODAL KONFIRMASI HAPUS BATCH */}
            {deleteBatchOpen && (
                <div
                    style={{
                        position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", zIndex: 200,
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
                    }}
                    onClick={() => !deleting && setDeleteBatchOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.25)", animation: "modalIn 0.2s ease",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>Hapus Data Terpilih?</h4>
                        </div>
                        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                            <strong>{selectedIds.size} data</strong> Cash Opname yang dipilih akan dihapus secara permanen dan tidak dapat dikembalikan.
                        </p>

                        {deleteError && (
                            <div style={{ fontSize: "12px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", marginBottom: "14px" }}>
                                {deleteError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteBatchOpen(false)}
                                disabled={deleting}
                                style={{
                                    border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 16px",
                                    fontSize: "13px", fontWeight: 600, color: "#374151", background: "#fff",
                                    cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1,
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteBatchConfirm}
                                disabled={deleting}
                                style={{
                                    border: "none", borderRadius: "10px", padding: "8px 16px",
                                    fontSize: "13px", fontWeight: 600, color: "#fff", background: "#dc2626",
                                    cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1,
                                }}
                            >
                                {deleting ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}