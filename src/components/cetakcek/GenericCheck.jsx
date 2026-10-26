import { useState, useEffect, useMemo } from "react";
import { formatNominalDisplay } from "../../utils/checkPdfExport";

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

// Baca posisi absolut custom bank dari localStorage
// Prioritas: navicash_check_layout_offsets > navicash_custom_bank_layouts > fallback
function readPositionsFromStorage(bankName, fallback) {
    // Sumber 1: dari Master Data "Simpan Ukuran"
    try {
        const raw = localStorage.getItem("navicash_check_layout_offsets");
        if (raw) {
            const parsed = JSON.parse(raw);
            const key = Object.keys(parsed).find(
                (k) => k.toLowerCase() === bankName.toLowerCase()
            );
            const saved = key ? parsed[key] : null;
            if (saved && Number(saved.tanggalX) > 0) {
                return {
                    tanggalX: Number(saved.tanggalX),
                    tanggalY: Number(saved.tanggalY),
                    vendorX: Number(saved.vendorX),
                    vendorY: Number(saved.vendorY),
                    terbilang1X: Number(saved.terbilang1X),
                    terbilang1Y: Number(saved.terbilang1Y),
                    terbilang2X: Number(saved.terbilang2X),
                    terbilang2Y: Number(saved.terbilang2Y),
                    nominalX: Number(saved.nominalX),
                    nominalY: Number(saved.nominalY),
                };
            }
        }
    } catch (e) { /* ignore */ }

    // Sumber 2: dari data bank custom saat dibuat
    try {
        const rawCustom = localStorage.getItem("navicash_custom_bank_layouts");
        if (rawCustom) {
            const customList = JSON.parse(rawCustom) || [];
            const found = customList.find(
                (b) => (b.bankName || "").toLowerCase() === bankName.toLowerCase()
            );
            if (found && Number(found.tanggalX) > 0) {
                return {
                    tanggalX: Number(found.tanggalX),
                    tanggalY: Number(found.tanggalY),
                    vendorX: Number(found.vendorX),
                    vendorY: Number(found.vendorY),
                    terbilang1X: Number(found.terbilang1X),
                    terbilang1Y: Number(found.terbilang1Y),
                    terbilang2X: Number(found.terbilang2X),
                    terbilang2Y: Number(found.terbilang2Y),
                    nominalX: Number(found.nominalX),
                    nominalY: Number(found.nominalY),
                };
            }
        }
    } catch (e) { /* ignore */ }

    // Fallback
    return { ...fallback };
}

function splitTerbilang(text) {
    const clean = (text || "").trim().toUpperCase();
    if (!clean) return { line1: "", line2: "" };
    if (clean.length <= 48) return { line1: clean, line2: "" };
    const words = clean.split(" ");
    let splitIdx = words.length;
    let current = "";
    for (let i = 0; i < words.length; i++) {
        const next = current ? current + " " + words[i] : words[i];
        if (next.length > 48) { splitIdx = i; break; }
        current = next;
    }
    return {
        line1: words.slice(0, splitIdx).join(" "),
        line2: words.slice(splitIdx).join(" "),
    };
}

function formatTanggalNumeric(tanggal) {
    if (!tanggal) return "\u00A0";
    const d = new Date(tanggal);
    if (Number.isNaN(d.getTime())) return "\u00A0";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function GenericCheck({ form, customBanks = [] }) {
    const bankName = form.bank || "Custom Bank";

    // Ambil info ukuran kertas dari customBanks prop
    const bankInfo = useMemo(() => {
        const foundCustom = customBanks.find(
            (b) => (b.bankName || "").toLowerCase() === bankName.toLowerCase()
        );
        if (foundCustom) {
            return {
                widthCm: Number(foundCustom.widthCm) || 17.8,
                heightCm: Number(foundCustom.heightCm) || 7.0,
                base: {
                    tanggalX: Number(foundCustom.tanggalX) || 11.50,
                    tanggalY: Number(foundCustom.tanggalY) || 1.55,
                    vendorX: Number(foundCustom.vendorX) || 5.10,
                    vendorY: Number(foundCustom.vendorY) || 2.25,
                    terbilang1X: Number(foundCustom.terbilang1X) || 4.80,
                    terbilang1Y: Number(foundCustom.terbilang1Y) || 2.95,
                    terbilang2X: Number(foundCustom.terbilang2X) || 3.10,
                    terbilang2Y: Number(foundCustom.terbilang2Y) || 3.65,
                    nominalX: Number(foundCustom.nominalX) || 12.60,
                    nominalY: Number(foundCustom.nominalY) || 3.15,
                },
            };
        }
        const basePos = BANK_BASE_POSITIONS[bankName] || BANK_BASE_POSITIONS["Bank Mandiri"];
        return { widthCm: 17.8, heightCm: 7.0, base: basePos };
    }, [bankName, customBanks]);

    // State posisi — di-load dari localStorage dan di-update saat event diterima
    const [positions, setPositions] = useState(() =>
        readPositionsFromStorage(bankName, bankInfo.base)
    );

    // Re-load posisi saat bankName berubah atau saat Master Data menyimpan
    useEffect(() => {
        setPositions(readPositionsFromStorage(bankName, bankInfo.base));

        const handleUpdate = () => {
            setPositions(readPositionsFromStorage(bankName, bankInfo.base));
        };

        window.addEventListener("navicash_check_offsets_updated", handleUpdate);
        window.addEventListener("navicash_custom_banks_updated", handleUpdate);
        return () => {
            window.removeEventListener("navicash_check_offsets_updated", handleUpdate);
            window.removeEventListener("navicash_custom_banks_updated", handleUpdate);
        };
    }, [bankName, bankInfo.base]);

    const { line1: terbilang1, line2: terbilang2 } = splitTerbilang(form.terbilang);
    const vendorText =
        form.jenisCek === "Transfer"
            ? `${form.vendor || ""} - ${form.bankPenerima || ""} - ${form.nomorRekening || ""}`
            : form.vendor || "";

    const nominalBoxWidthCm = Math.min(4.8, Math.max(3.0, bankInfo.widthCm - positions.nominalX - 0.4));
    const line4WidthCm = Math.max(3.5, positions.nominalX - 1.2);

    return (
        <div
            className="relative bg-white border border-gray-300 shrink-0 overflow-hidden shadow-sm rounded-sm select-none"
            style={{
                width: `${bankInfo.widthCm}cm`,
                height: `${bankInfo.heightCm}cm`,
                fontFamily: '"Calibri", Arial, sans-serif',
                background: "#ffffff",
            }}
        >
            {/* ===== 1. TANGGAL ===== */}
            <div
                className="absolute text-[9px] font-bold text-gray-700 uppercase tracking-tight text-right whitespace-nowrap"
                style={{
                    top: `${Math.max(0.1, positions.tanggalY - 0.38)}cm`,
                    left: `${Math.max(0.5, positions.tanggalX - 3.2)}cm`,
                    width: "3.0cm",
                }}
            >
                TANGGAL / DATE:
            </div>
            <div
                className="absolute border-b border-gray-400"
                style={{ top: `${positions.tanggalY}cm`, left: `${positions.tanggalX}cm`, width: "4.5cm" }}
            />
            <div
                className="absolute flex items-end justify-center"
                style={{
                    top: `${positions.tanggalY - 0.45}cm`,
                    left: `${positions.tanggalX}cm`,
                    width: "4.5cm",
                    height: "0.42cm",
                }}
            >
                <span className="text-sm text-black font-bold tracking-wider">
                    {formatTanggalNumeric(form.tanggal)}
                </span>
            </div>

            {/* ===== 2. VENDOR / ATAS PENYERAHAN ===== */}
            <div
                className="absolute text-[9px] font-bold text-gray-700 uppercase tracking-tight whitespace-nowrap"
                style={{ top: `${positions.vendorY - 0.38}cm`, left: "0.9cm" }}
            >
                ATAS PENYERAHAN CEK INI BAYARLAH KEPADA
            </div>
            <div
                className="absolute text-[9px] font-bold text-gray-700 uppercase tracking-tight text-right whitespace-nowrap"
                style={{ top: `${positions.vendorY - 0.38}cm`, right: "0.5cm", width: "2.5cm" }}
            >
                ATAU PEMBAWA *
            </div>
            <div
                className="absolute border-b border-gray-400"
                style={{ top: `${positions.vendorY}cm`, left: "0.9cm", right: "0.5cm" }}
            />
            <div
                className="absolute text-[8px] italic text-gray-400 whitespace-nowrap"
                style={{ top: `${positions.vendorY + 0.04}cm`, left: "0.9cm" }}
            >
                Pay to the order of
            </div>
            <div
                className="absolute text-[8px] italic text-gray-400 text-right whitespace-nowrap"
                style={{ top: `${positions.vendorY + 0.04}cm`, right: "0.5cm", width: "2.0cm" }}
            >
                or bearer
            </div>
            <div
                className="absolute flex items-end overflow-hidden"
                style={{
                    top: `${positions.vendorY - 0.45}cm`,
                    left: `${positions.vendorX}cm`,
                    right: "3.2cm",
                    height: "0.42cm",
                }}
            >
                <span className="text-sm text-black font-bold whitespace-nowrap text-ellipsis overflow-hidden">
                    {vendorText}
                </span>
            </div>

            {/* ===== 3. TERBILANG GARIS 1 ===== */}
            <div
                className="absolute text-[9px] font-bold text-gray-700 uppercase tracking-tight whitespace-nowrap"
                style={{ top: `${positions.terbilang1Y - 0.38}cm`, left: "0.9cm" }}
            >
                UANG SEJUMLAH RUPIAH (DALAM HURUF)
            </div>
            <div
                className="absolute border-b border-gray-400"
                style={{ top: `${positions.terbilang1Y}cm`, left: "0.9cm", right: "0.5cm" }}
            />
            <div
                className="absolute text-[8px] italic text-gray-400 whitespace-nowrap"
                style={{ top: `${positions.terbilang1Y + 0.04}cm`, left: "0.9cm" }}
            >
                The sum of (in words)
            </div>
            <div
                className="absolute flex items-end overflow-hidden"
                style={{
                    top: `${positions.terbilang1Y - 0.45}cm`,
                    left: `${positions.terbilang1X}cm`,
                    right: "0.5cm",
                    height: "0.42cm",
                }}
            >
                <span className="text-sm text-black font-bold uppercase whitespace-nowrap text-ellipsis overflow-hidden">
                    {terbilang1}
                </span>
            </div>

            {/* ===== 4. TERBILANG GARIS 2 ===== */}
            <div
                className="absolute border-b border-gray-400"
                style={{
                    top: `${positions.terbilang2Y}cm`,
                    left: "0.9cm",
                    width: `${line4WidthCm}cm`,
                }}
            />
            <div
                className="absolute flex items-end overflow-hidden"
                style={{
                    top: `${positions.terbilang2Y - 0.45}cm`,
                    left: `${positions.terbilang2X}cm`,
                    width: `${Math.max(2.0, line4WidthCm - (positions.terbilang2X - 0.9))}cm`,
                    height: "0.42cm",
                }}
            >
                <span className="text-sm text-black font-bold uppercase whitespace-nowrap text-ellipsis overflow-hidden">
                    {terbilang2}
                </span>
            </div>

            {/* ===== 5. KOTAK NOMINAL ===== */}
            <div
                className="absolute text-xs font-bold text-gray-700 flex items-center justify-end"
                style={{
                    top: `${positions.nominalY - 0.25}cm`,
                    left: `${Math.max(0, positions.nominalX - 0.8)}cm`,
                    width: "0.7cm",
                    height: "0.5cm",
                }}
            >
                Rp.
            </div>
            <div
                className="absolute border border-gray-400 bg-white rounded-sm flex items-center justify-start px-2"
                style={{
                    top: `${positions.nominalY - 0.25}cm`,
                    left: `${positions.nominalX}cm`,
                    width: `${nominalBoxWidthCm}cm`,
                    height: "0.5cm",
                }}
            >
                <span className="text-sm text-black font-bold font-mono whitespace-nowrap">
                    {formatNominalDisplay(form.nominal)}
                </span>
            </div>
        </div>
    );
}
