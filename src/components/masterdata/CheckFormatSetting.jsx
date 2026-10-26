import { useState, useEffect } from "react";
import {
    FaSlidersH,
    FaUniversity,
    FaSave,
    FaUndo,
    FaEdit,
    FaTimes,
    FaLock,
    FaPrint,
    FaCalendarAlt,
    FaUser,
    FaFileSignature,
    FaMoneyBillWave,
    FaInfoCircle,
    FaPlus,
    FaTrash,
} from "react-icons/fa";
import { generatePrintHtml } from "../../utils/checkPdfExport";
import { getCheckLayouts, saveCheckLayout, deleteCheckLayout } from "../../api/check";

export const meta = {
    id: "check_format",
    label: "Format Cek Bank",
    icon: FaSlidersH,
    color: "#363D48",
};

const BUILTIN_BANK_OPTIONS = [
    { id: "Bank Mandiri", label: "Bank Mandiri", widthCm: 17.8, heightCm: 7.0 },
    { id: "Bank BCA", label: "Bank BCA", widthCm: 17.7, heightCm: 7.0 },
    { id: "Bank Sinarmas", label: "Bank Sinarmas", widthCm: 17.7, heightCm: 7.0 },
    { id: "Maybank Indonesia", label: "Maybank Indonesia", widthCm: 17.8, heightCm: 7.0 },
];

const CUSTOM_BANKS_STORAGE_KEY = "navicash_custom_bank_layouts";

function loadCustomBanks() {
    try {
        const raw = localStorage.getItem(CUSTOM_BANKS_STORAGE_KEY);
        if (raw) return JSON.parse(raw) || [];
    } catch (e) { /* ignore */ }
    return [];
}

function persistCustomBanks(banks) {
    try {
        localStorage.setItem(CUSTOM_BANKS_STORAGE_KEY, JSON.stringify(banks));
        window.dispatchEvent(new Event("navicash_custom_banks_updated"));
    } catch (e) { /* ignore */ }
}

const emptyNewBank = {
    bankName: "",
    widthCm: 17.8,
    heightCm: 7.0,
    tanggalX: 11.50, tanggalY: 1.55,
    vendorX: 5.10, vendorY: 2.25,
    terbilang1X: 4.80, terbilang1Y: 2.95,
    terbilang2X: 3.10, terbilang2Y: 3.65,
    nominalX: 12.60, nominalY: 3.15,
};

// Koordinat Posisi Dasar (Ukuran Awal) Asli per Bank (dalam cm)
const BANK_BASE_POSITIONS = {
    "Bank Mandiri": {
        tanggalX: 11.50, tanggalY: 1.55,
        vendorX: 5.10, vendorY: 2.25,
        terbilang1X: 4.80, terbilang1Y: 2.95,
        terbilang2X: 3.10, terbilang2Y: 3.65,
        nominalX: 12.60, nominalY: 3.15,
    },
    "Bank BCA": {
        tanggalX: 11.30, tanggalY: 1.50,
        vendorX: 6.40, vendorY: 2.20,
        terbilang1X: 6.10, terbilang1Y: 3.00,
        terbilang2X: 1.70, terbilang2Y: 3.80,
        nominalX: 13.40, nominalY: 3.80,
    },
    "Bank Sinarmas": {
        tanggalX: 11.60, tanggalY: 1.35,
        vendorX: 6.80, vendorY: 2.10,
        terbilang1X: 6.10, terbilang1Y: 2.50,
        terbilang2X: 1.10, terbilang2Y: 3.20,
        nominalX: 11.70, nominalY: 2.80,
    },
    "Maybank Indonesia": {
        tanggalX: 11.60, tanggalY: 1.70,
        vendorX: 5.60, vendorY: 2.40,
        terbilang1X: 5.10, terbilang1Y: 3.00,
        terbilang2X: 3.90, terbilang2Y: 3.65,
        nominalX: 13.40, nominalY: 3.30,
    },
};

const SECTIONS = [
    {
        key: "tanggal",
        label: "Tanggal Cek",
        icon: FaCalendarAlt,
        color: "#2563eb",
        xKey: "tanggalX",
        yKey: "tanggalY",
        desc: "Posisi teks tanggal di sudut kanan atas cek",
    },
    {
        key: "vendor",
        label: "Baris Vendor / Penerima",
        icon: FaUser,
        color: "#7c3aed",
        xKey: "vendorX",
        yKey: "vendorY",
        desc: "Posisi nama vendor/penerima pada garis 'Bayarlah kepada'",
    },
    {
        key: "terbilang1",
        label: "Terbilang Garis Pertama",
        icon: FaFileSignature,
        color: "#db2777",
        xKey: "terbilang1X",
        yKey: "terbilang1Y",
        desc: "Posisi baris pertama kalimat terbilang uang",
    },
    {
        key: "terbilang2",
        label: "Terbilang Garis Kedua",
        icon: FaFileSignature,
        color: "#e11d48",
        xKey: "terbilang2X",
        yKey: "terbilang2Y",
        desc: "Posisi baris kedua kalimat terbilang uang (jika kalimat panjang)",
    },
    {
        key: "nominal",
        label: "Nominal Angka (Rp)",
        icon: FaMoneyBillWave,
        color: "#059669",
        xKey: "nominalX",
        yKey: "nominalY",
        desc: "Posisi kotak/garis nominal angka rupiah di kanan bawah",
    },
];

export default function CheckFormatSetting() {
    // Custom banks from localStorage
    const [customBanks, setCustomBanks] = useState(loadCustomBanks);
    const allBankOptions = [
        ...BUILTIN_BANK_OPTIONS,
        ...customBanks.map((b) => ({ id: b.bankName, label: b.bankName, widthCm: b.widthCm, heightCm: b.heightCm })),
    ];

    const [selectedBank, setSelectedBank] = useState("Bank Mandiri");
    const [offsetsMap, setOffsetsMap] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    // absolutePositions: holds absolute coordinates (base + offset) shown in the inputs
    const [absolutePositions, setAbsolutePositions] = useState({});
    const [toastMessage, setToastMessage] = useState(null);

    // Modal state for adding a new bank
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBank, setNewBank] = useState(emptyNewBank);
    const [addError, setAddError] = useState("");

    // Modal state for deleting a bank format
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Resolve base positions for selected bank (builtin or custom)
    const getBasePositions = (bankId) => {
        if (BANK_BASE_POSITIONS[bankId]) return BANK_BASE_POSITIONS[bankId];
        const cb = customBanks.find((b) => b.bankName === bankId);
        if (cb) return { tanggalX: cb.tanggalX, tanggalY: cb.tanggalY, vendorX: cb.vendorX, vendorY: cb.vendorY, terbilang1X: cb.terbilang1X, terbilang1Y: cb.terbilang1Y, terbilang2X: cb.terbilang2X, terbilang2Y: cb.terbilang2Y, nominalX: cb.nominalX, nominalY: cb.nominalY };
        return BANK_BASE_POSITIONS["Bank Mandiri"];
    };

    // Build absolute positions from stored offsets (base + offset)
    const buildAbsoluteFromOffset = (bankId, offsets) => {
        const base = getBasePositions(bankId);
        const safeNum = (v) => (Math.abs(Number(v)) > 2 ? Number(v) / 10 : Number(v || 0));
        return {
            tanggalX: parseFloat((base.tanggalX + safeNum(offsets.tanggalX || 0)).toFixed(2)),
            tanggalY: parseFloat((base.tanggalY + safeNum(offsets.tanggalY || 0)).toFixed(2)),
            vendorX: parseFloat((base.vendorX + safeNum(offsets.vendorX || 0)).toFixed(2)),
            vendorY: parseFloat((base.vendorY + safeNum(offsets.vendorY || 0)).toFixed(2)),
            terbilang1X: parseFloat((base.terbilang1X + safeNum(offsets.terbilang1X || 0)).toFixed(2)),
            terbilang1Y: parseFloat((base.terbilang1Y + safeNum(offsets.terbilang1Y || 0)).toFixed(2)),
            terbilang2X: parseFloat((base.terbilang2X + safeNum(offsets.terbilang2X || 0)).toFixed(2)),
            terbilang2Y: parseFloat((base.terbilang2Y + safeNum(offsets.terbilang2Y || 0)).toFixed(2)),
            nominalX: parseFloat((base.nominalX + safeNum(offsets.nominalX || 0)).toFixed(2)),
            nominalY: parseFloat((base.nominalY + safeNum(offsets.nominalY || 0)).toFixed(2)),
        };
    };

    // Load saved absolute positions from Backend API + LocalStorage fallback
    const fetchLayoutData = async () => {
        const base = getBasePositions(selectedBank);
        try {
            const apiRes = await getCheckLayouts();
            if (apiRes && typeof apiRes === "object") {
                setOffsetsMap(apiRes);
                localStorage.setItem("navicash_check_layout_offsets", JSON.stringify(apiRes));
                const bankData = apiRes[selectedBank];
                if (bankData && bankData.tanggalX > 0) {
                    // Check if bankData contains old seed defaults
                    const isOldSeed = (
                        (selectedBank === "Bank Mandiri" && (bankData.vendorY === 2.0 || bankData.terbilang1Y === 2.7)) ||
                        (selectedBank === "Bank BCA" && (bankData.terbilang1X === 4.8 || bankData.terbilang2X === 2.7)) ||
                        (selectedBank === "Bank Sinarmas" && (bankData.vendorX === 6.6 || bankData.terbilang1X === 4.6)) ||
                        (selectedBank === "Maybank Indonesia" && (bankData.vendorX === 5.4 || bankData.terbilang2X === 3.2))
                    );

                    if (isOldSeed) {
                        setAbsolutePositions({ ...base });
                    } else {
                        setAbsolutePositions({
                            tanggalX: bankData.tanggalX,
                            tanggalY: bankData.tanggalY,
                            vendorX: bankData.vendorX,
                            vendorY: bankData.vendorY,
                            terbilang1X: bankData.terbilang1X,
                            terbilang1Y: bankData.terbilang1Y,
                            terbilang2X: bankData.terbilang2X,
                            terbilang2Y: bankData.terbilang2Y,
                            nominalX: bankData.nominalX,
                            nominalY: bankData.nominalY,
                        });
                    }
                } else {
                    setAbsolutePositions({ ...base });
                }

                // Sync custom banks from backend layout data
                const backendCustomBanks = [];
                Object.keys(apiRes).forEach((bName) => {
                    const item = apiRes[bName];
                    if (item.isCustom === 1 || item.is_custom === 1) {
                        backendCustomBanks.push({
                            bankName: bName,
                            widthCm: item.widthCm || item.width_cm || 17.8,
                            heightCm: item.heightCm || item.height_cm || 7.0,
                            tanggalX: item.tanggalX || 0,
                            tanggalY: item.tanggalY || 0,
                            vendorX: item.vendorX || 0,
                            vendorY: item.vendorY || 0,
                            terbilang1X: item.terbilang1X || 0,
                            terbilang1Y: item.terbilang1Y || 0,
                            terbilang2X: item.terbilang2X || 0,
                            terbilang2Y: item.terbilang2Y || 0,
                            nominalX: item.nominalX || 0,
                            nominalY: item.nominalY || 0,
                        });
                    }
                });
                if (backendCustomBanks.length > 0) {
                    setCustomBanks((prev) => {
                        const map = new Map();
                        prev.forEach((b) => map.set(b.bankName.toLowerCase(), b));
                        backendCustomBanks.forEach((b) => map.set(b.bankName.toLowerCase(), b));
                        const merged = Array.from(map.values());
                        persistCustomBanks(merged);
                        return merged;
                    });
                }
                return;
            }
        } catch (e) {
            console.error("Gagal load backend layouts, fallback ke localStorage", e);
        }
        try {
            const raw = localStorage.getItem("navicash_check_layout_offsets");
            if (raw) {
                const parsed = JSON.parse(raw);
                setOffsetsMap(parsed || {});
                const bankData = (parsed || {})[selectedBank];
                if (bankData && bankData.tanggalX > 0) {
                    const isOldSeed = (
                        (selectedBank === "Bank Mandiri" && (bankData.vendorY === 2.0 || bankData.terbilang1Y === 2.7)) ||
                        (selectedBank === "Bank BCA" && (bankData.terbilang1X === 4.8 || bankData.terbilang2X === 2.7)) ||
                        (selectedBank === "Bank Sinarmas" && (bankData.vendorX === 6.6 || bankData.terbilang1X === 4.6)) ||
                        (selectedBank === "Maybank Indonesia" && (bankData.vendorX === 5.4 || bankData.terbilang2X === 3.2))
                    );

                    if (isOldSeed) {
                        setAbsolutePositions({ ...base });
                    } else {
                        setAbsolutePositions({
                            tanggalX: bankData.tanggalX,
                            tanggalY: bankData.tanggalY,
                            vendorX: bankData.vendorX,
                            vendorY: bankData.vendorY,
                            terbilang1X: bankData.terbilang1X,
                            terbilang1Y: bankData.terbilang1Y,
                            terbilang2X: bankData.terbilang2X,
                            terbilang2Y: bankData.terbilang2Y,
                            nominalX: bankData.nominalX,
                            nominalY: bankData.nominalY,
                        });
                    }
                    return;
                }
            }
        } catch (err) { console.error(err); }
        // No saved data — show base positions
        setAbsolutePositions({ ...base });
    };

    useEffect(() => {
        fetchLayoutData();
        setIsEditing(false);
    }, [selectedBank]);

    const activeBankConfig = allBankOptions.find((b) => b.id === selectedBank) || allBankOptions[0];
    const currentBasePositions = getBasePositions(selectedBank);

    const showToast = (msg, type = "success") => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleInputChange = (key, value) => {
        const num = parseFloat(value);
        const validVal = isNaN(num) ? 0 : num;
        setAbsolutePositions((prev) => ({ ...prev, [key]: validVal }));
    };

    const handleStartEdit = () => setIsEditing(true);

    const handleCancelEdit = () => {
        fetchLayoutData();
        setIsEditing(false);
    };

    const handleResetToBase = () => {
        setAbsolutePositions({ ...currentBasePositions });
    };

    const handleSave = async () => {
        // Selalu simpan absolutePositions user secara eksplisit ke localStorage
        // agar GenericCheck.jsx mendapat koordinat yang benar-benar diinput user
        const explicitPositions = {
            tanggalX: absolutePositions.tanggalX,
            tanggalY: absolutePositions.tanggalY,
            vendorX: absolutePositions.vendorX,
            vendorY: absolutePositions.vendorY,
            terbilang1X: absolutePositions.terbilang1X,
            terbilang1Y: absolutePositions.terbilang1Y,
            terbilang2X: absolutePositions.terbilang2X,
            terbilang2Y: absolutePositions.terbilang2Y,
            nominalX: absolutePositions.nominalX,
            nominalY: absolutePositions.nominalY,
        };

        // Update localStorage dulu sebelum request backend (agar UI langsung responsif)
        const optimisticMap = { ...offsetsMap, [selectedBank]: explicitPositions };
        setOffsetsMap(optimisticMap);
        localStorage.setItem("navicash_check_layout_offsets", JSON.stringify(optimisticMap));
        window.dispatchEvent(new Event("navicash_check_offsets_updated"));
        setIsEditing(false);

        try {
            const payload = {
                bank_name: selectedBank,
                widthCm: activeBankConfig.widthCm,
                heightCm: activeBankConfig.heightCm,
                isCustom: isCustomBank ? 1 : 0,
                ...explicitPositions,
            };
            await saveCheckLayout(payload);
            showToast(`Format cek ${selectedBank} berhasil disimpan ke server!`, "success");
        } catch (e) {
            console.error("Gagal simpan ke backend DB, sudah tersimpan di localStorage", e);
            showToast(`Format cek ${selectedBank} disimpan (Lokal).`, "success");
        }
    };

    // ===== Custom Bank Handlers =====
    const handleOpenAddModal = () => { setNewBank(emptyNewBank); setAddError(""); setShowAddModal(true); };

    const handleNewBankInput = (key, value) => {
        setNewBank((prev) => ({ ...prev, [key]: key === "bankName" ? value : parseFloat(value) || 0 }));
    };

    const handleSaveNewBank = async () => {
        const name = newBank.bankName.trim();
        if (!name) { setAddError("Nama bank tidak boleh kosong."); return; }
        const isDuplicate = allBankOptions.some((b) => b.id.toLowerCase() === name.toLowerCase());
        if (isDuplicate) { setAddError("Nama bank sudah ada. Gunakan nama yang berbeda."); return; }
        const createdBank = { ...newBank, bankName: name, isCustom: 1 };
        const updated = [...customBanks, createdBank];
        setCustomBanks(updated);
        persistCustomBanks(updated);
        setShowAddModal(false);
        setSelectedBank(name);

        try {
            await saveCheckLayout({
                bank_name: name,
                widthCm: newBank.widthCm,
                heightCm: newBank.heightCm,
                isCustom: 1,
                tanggalX: newBank.tanggalX,
                tanggalY: newBank.tanggalY,
                vendorX: newBank.vendorX,
                vendorY: newBank.vendorY,
                terbilang1X: newBank.terbilang1X,
                terbilang1Y: newBank.terbilang1Y,
                terbilang2X: newBank.terbilang2X,
                terbilang2Y: newBank.terbilang2Y,
                nominalX: newBank.nominalX,
                nominalY: newBank.nominalY,
            });
        } catch (e) {
            console.error("Gagal simpan custom bank ke backend DB", e);
        }

        showToast(`Format cek bank "${name}" berhasil ditambahkan!`, "success");
    };

    const handleDeleteCustomBank = async (bankId) => {
        const updated = customBanks.filter((b) => b.bankName !== bankId);
        setCustomBanks(updated);
        persistCustomBanks(updated);
        if (selectedBank === bankId) setSelectedBank("Bank Mandiri");

        try {
            await deleteCheckLayout(bankId);
        } catch (e) {
            console.error("Gagal hapus custom bank dari backend DB", e);
        }

        showToast(`Format cek bank "${bankId}" berhasil dihapus.`, "success");
    };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            if (isCustomBank) {
                const updated = customBanks.filter((b) => b.bankName !== selectedBank);
                setCustomBanks(updated);
                persistCustomBanks(updated);
                await deleteCheckLayout(selectedBank);
                const deletedName = selectedBank;
                setSelectedBank("Bank Mandiri");
                showToast(`Format cek bank "${deletedName}" berhasil dihapus.`, "success");
            } else {
                const base = BANK_BASE_POSITIONS[selectedBank];
                setAbsolutePositions({ ...base });
                const payload = {
                    bank_name: selectedBank,
                    widthCm: activeBankConfig.widthCm,
                    heightCm: activeBankConfig.heightCm,
                    isCustom: 0,
                    ...base,
                };
                await saveCheckLayout(payload);
                showToast(`Format cek bank "${selectedBank}" berhasil direset ke ukuran awal.`, "success");
            }
        } catch (e) {
            console.error("Gagal hapus/reset format bank", e);
            showToast(`Gagal menghapus format cek ${selectedBank}`, "error");
        } finally {
            setDeleting(false);
            setDeleteConfirmOpen(false);
        }
    };

    const isCustomBank = customBanks.some((b) => b.bankName === selectedBank);

    const handleTestPrint = () => {
        const dummyForm = {
            bank: selectedBank,
            jenisCek: "Transfer Vendor",
            tanggal: new Date().toISOString().slice(0, 10),
            vendor: "PT. SMART TBK UNIT SURABAYA",
            bankPenerima: "BANK MANDIRI",
            nomorRekening: "1410099887766",
            terbilang: "Dua Puluh Lima Juta Tujuh Ratus Lima Puluh Ribu Rupiah",
            nominal: "25750000",
            nomorCek: "TEST-PRINT",
        };
        try {
            const html = generatePrintHtml(dummyForm);
            const win = window.open("", "_blank");
            if (win) {
                win.document.write(html);
                win.document.close();
                setTimeout(() => {
                    win.focus();
                    win.print();
                }, 300);
            }
        } catch (e) {
            alert("Gagal membuka preview cetak: " + e.message);
        }
    };

    return (
        <div style={{ animation: "slideDown 0.3s ease" }}>
            <style>{`
                @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
                @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .cfs-input { transition: border-color 0.15s, background 0.15s; }
            `}</style>

            {/* ===== MODAL TAMBAH BANK BARU ===== */}
            {showAddModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: "14px", width: "650px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", animation: "modalFadeIn 0.25s ease", padding: "28px 28px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                            <div>
                                <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Tambah Format Cek Bank Baru</div>
                                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px" }}>Isi nama bank, ukuran kertas, dan posisi (cm) setiap bagian cek</div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "18px", padding: "4px" }}><FaTimes /></button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "5px" }}>Nama Bank <span style={{ color: "#e11d48" }}>*</span></label>
                                <input type="text" placeholder="Contoh: Bank BRI, Bank BNI" value={newBank.bankName} onChange={(e) => handleNewBankInput("bankName", e.target.value)}
                                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", boxSizing: "border-box", fontWeight: 600 }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "5px" }}>Lebar Kertas (cm)</label>
                                <input type="number" step="0.1" value={newBank.widthCm} onChange={(e) => handleNewBankInput("widthCm", e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", boxSizing: "border-box", fontFamily: "monospace" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "5px" }}>Tinggi Kertas (cm)</label>
                                <input type="number" step="0.1" value={newBank.heightCm} onChange={(e) => handleNewBankInput("heightCm", e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", boxSizing: "border-box", fontFamily: "monospace" }} />
                            </div>
                        </div>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
                            <div style={{ background: "#f9fafb", padding: "10px 16px", fontSize: "12px", fontWeight: 700, color: "#374151", borderBottom: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "8px" }}>
                                <span>Bagian Cek</span><span style={{ textAlign: "center" }}>Posisi X (cm)</span><span style={{ textAlign: "center" }}>Posisi Y (cm)</span>
                            </div>
                            {SECTIONS.map((sec) => {
                                const SIcon = sec.icon;
                                return (
                                    <div key={sec.key} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "8px", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `${sec.color}15`, color: sec.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 }}><SIcon /></div>
                                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{sec.label}</div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                            <input type="number" step="0.05" value={newBank[sec.xKey]} onChange={(e) => handleNewBankInput(sec.xKey, e.target.value)} className="cfs-input" style={{ width: "80px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontFamily: "monospace", fontWeight: 600, textAlign: "center" }} />
                                            <span style={{ fontSize: "11px", color: "#6b7280" }}>cm</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                            <input type="number" step="0.05" value={newBank[sec.yKey]} onChange={(e) => handleNewBankInput(sec.yKey, e.target.value)} className="cfs-input" style={{ width: "80px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontFamily: "monospace", fontWeight: 600, textAlign: "center" }} />
                                            <span style={{ fontSize: "11px", color: "#6b7280" }}>cm</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {addError && (<div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", marginBottom: "14px" }}>{addError}</div>)}
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={() => setShowAddModal(false)} style={{ padding: "9px 20px", border: "1px solid #d1d5db", background: "#f3f4f6", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#374151" }}>Batal</button>
                            <button onClick={handleSaveNewBank} style={{ padding: "9px 22px", background: "#363D48", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.28)", display: "flex", alignItems: "center", gap: "7px" }}>
                                <FaSave style={{ fontSize: "12px" }} /> Simpan Format Bank Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification (Sama seperti Vendor.jsx) */}
            {toastMessage && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        left: "50%",
                        transform: "translate(-50%, 0)",
                        zIndex: 100,
                        background: toastMessage.type === "error" ? "#fef2f2" : "#ecfdf5",
                        border: toastMessage.type === "error" ? "1.5px solid #fca5a5" : "1.5px solid #6ee7b7",
                        color: toastMessage.type === "error" ? "#b91c1c" : "#047857",
                        borderRadius: "10px",
                        padding: "10px 18px",
                        fontSize: "13px",
                        fontWeight: 600,
                        boxShadow: toastMessage.type === "error" ? "0 8px 24px rgba(239,68,68,0.25)" : "0 8px 24px rgba(16,185,129,0.25)",
                        animation: "toastIn 0.25s ease",
                    }}
                >
                    {toastMessage.text}
                </div>
            )}

            {/* Top Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaUniversity style={{ color: "#6b7280" }} /> Filter Bank:
                    </label>
                    <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
                        style={{ background: "#fff", border: "1px solid #d1d5db", color: "#111827", fontWeight: 600, fontSize: "13px", borderRadius: "8px", padding: "7px 12px", outline: "none", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        {allBankOptions.map((bank) => (
                            <option key={bank.id} value={bank.id}>{bank.label} ({bank.widthCm} cm x {bank.heightCm} cm)</option>
                        ))}
                    </select>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#6b7280", background: "#f3f4f6", padding: "5px 10px", borderRadius: "7px", border: "1px solid #e5e7eb" }}>
                        {activeBankConfig.widthCm} cm x {activeBankConfig.heightCm} cm
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                    {/* Tombol Tambah selalu tampil */}
                    <button type="button" onClick={handleOpenAddModal}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#363D48", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(37,99,235,0.25)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#363D48")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#363D48")}>
                        <FaPlus style={{ fontSize: "11px" }} /> Tambah Format Bank Baru
                    </button>
                    {isEditing ? (
                        <>
                            <button type="button" onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#047857", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(4,120,87,0.25)" }}>
                                <FaSave /> Simpan Ukuran
                            </button>
                            <button type="button" onClick={handleResetToBase} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#fff", border: "1px solid #d1d5db", color: "#4b5563", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }} title="Reset ke posisi asal bank">
                                <FaUndo /> Reset Awal
                            </button>
                            <button type="button" onClick={handleCancelEdit} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                                <FaTimes /> Batal
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={handleTestPrint} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#fff", border: "1px solid #d1d5db", color: "#374151", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                                <FaPrint /> Uji Cetak
                            </button>
                            <button type="button" onClick={() => setDeleteConfirmOpen(true)} title={`Hapus format cek ${selectedBank}`}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 12px", background: "#363D48", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#242931")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#363D48")}>
                                <FaTrash />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Info Banner */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "9px 14px", marginBottom: "12px", display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "12px", color: "#1e40af" }}>
                <FaInfoCircle style={{ color: "#2563eb", flexShrink: 0, marginTop: "1px" }} />
                <div>
                    <strong>Informasi ({selectedBank}):</strong> Input menampilkan <strong>posisi absolut (cm)</strong> tiap bagian cek sesuai ukuran default bank ini. Klik ikon <em>Edit</em> di header kolom <em>Status</em> untuk mengedit semua sekaligus. Perubahan ditandai warna hijau.{isCustomBank && <span style={{ marginLeft: "8px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "4px", padding: "1px 6px", fontSize: "10px", fontWeight: 700 }}>BANK CUSTOM</span>}
                </div>
            </div>

            {/* Main Format Table */}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                            <th style={{ padding: "11px 16px", fontSize: "12px", fontWeight: 700, color: "#374151", width: "220px" }}>Section / Bagian Cek</th>
                            <th style={{ padding: "11px 16px", fontSize: "12px", fontWeight: 700, color: "#374151" }}>Posisi X (cm)</th>
                            <th style={{ padding: "11px 16px", fontSize: "12px", fontWeight: 700, color: "#374151" }}>Posisi Y (cm)</th>
                            <th style={{ padding: "11px 16px", fontSize: "12px", fontWeight: 700, color: "#374151", textAlign: "center", width: "180px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <span>Status</span>
                                    {!isEditing ? (
                                        <button onClick={handleStartEdit} title="Edit semua posisi sekaligus"
                                            style={{ background: "#363D48", color: "#fff", border: "none", borderRadius: "6px", padding: "3px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600 }}>
                                            <FaEdit style={{ fontSize: "10px" }} /> Edit
                                        </button>
                                    ) : (
                                        <span style={{ background: "#047857", color: "#fff", borderRadius: "6px", padding: "3px 9px", fontSize: "11px", fontWeight: 600 }}>Mode Edit</span>
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {SECTIONS.map((sec) => {
                            const Icon = sec.icon;
                            const xVal = absolutePositions[sec.xKey] ?? currentBasePositions[sec.xKey] ?? 0;
                            const yVal = absolutePositions[sec.yKey] ?? currentBasePositions[sec.yKey] ?? 0;
                            const hasChange = Math.abs(xVal - (currentBasePositions[sec.xKey] || 0)) > 0.001 || Math.abs(yVal - (currentBasePositions[sec.yKey] || 0)) > 0.001;

                            const inputStyle = (changed) => ({
                                width: "90px", border: `1.5px solid ${!isEditing ? "#e5e7eb" : changed ? "#059669" : "#d1d5db"}`,
                                borderRadius: "8px", padding: "7px 12px", fontSize: "13px",
                                fontFamily: "monospace", fontWeight: 700,
                                background: !isEditing ? "#f8fafc" : changed ? "#ecfdf5" : "#fff",
                                color: !isEditing ? "#6b7280" : changed ? "#047857" : "#111827",
                                cursor: !isEditing ? "not-allowed" : "text",
                                outline: "none", transition: "all 0.15s ease",
                            });

                            return (
                                <tr key={sec.key} style={{ borderBottom: "1px solid #f3f4f6" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <td style={{ padding: "13px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${sec.color}18`, color: sec.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}><Icon /></div>
                                            <div>
                                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{sec.label}</div>
                                                <div style={{ fontSize: "11px", color: "#9ca3af" }}>{sec.desc}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "13px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <input type="number" step="0.05" min="0" max="30" value={xVal} disabled={!isEditing} onChange={(e) => handleInputChange(sec.xKey, e.target.value)} className="cfs-input" style={inputStyle(hasChange)} />
                                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af" }}>cm</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "13px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <input type="number" step="0.05" min="0" max="30" value={yVal} disabled={!isEditing} onChange={(e) => handleInputChange(sec.yKey, e.target.value)} className="cfs-input" style={inputStyle(hasChange)} />
                                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af" }}>cm</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                                        {hasChange ? (
                                            <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>Diubah</span>
                                        ) : (
                                            <span style={{ background: "#f3f4f6", color: "#6b7280", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 600 }}>Default</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Footer */}
                <div style={{ padding: "10px 16px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#6b7280" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isEditing ? <><FaEdit style={{ color: "#047857" }} /><span>Mode: <strong style={{ color: "#047857" }}>Edit Aktif</strong></span></> : <><FaLock style={{ color: "#9ca3af" }} /><span>Mode: <strong style={{ color: "#111827" }}>Terkunci (Read-Only)</strong></span></>}
                    </div>
                    <div>Bank Aktif: <strong style={{ color: "#111827" }}>{selectedBank}</strong>{isCustomBank && <span style={{ marginLeft: "8px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "4px", padding: "2px 7px", fontSize: "10px", fontWeight: 700 }}>CUSTOM</span>}</div>
                </div>
            </div>

            {/* MODAL KONFIRMASI HAPUS FORMAT BANK */}
            {deleteConfirmOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}>
                    <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: "460px", animation: "modalFadeIn 0.25s ease", textAlign: "left", padding: "28px" }}>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e1b4b", marginBottom: "12px" }}>
                            Hapus Data Terpilih
                        </div>
                        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#4b5563", lineHeight: 1.5 }}>
                            Apakah Anda yakin ingin menghapus <strong style={{ color: "#dc2626", fontWeight: 700 }}>format cek {selectedBank}</strong> yang telah dipilih?
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f3f4f6", paddingTop: "18px" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmOpen(false)}
                                style={{ border: "1.5px solid #d1d5db", borderRadius: "12px", padding: "9px 24px", fontSize: "14px", color: "#6b7280", background: "#fff", cursor: "pointer", fontWeight: 600 }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                style={{ background: "#dc2626", border: "none", borderRadius: "12px", padding: "9px 24px", fontSize: "14px", color: "#fff", cursor: "pointer", fontWeight: 600, opacity: deleting ? 0.7 : 1 }}
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
