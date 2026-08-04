import { useLayoutEffect, useRef, useState } from "react";

// Konfigurasi tampilan cek Sinarmas
const template = {
    widthCm: 17.7,
    heightCm: 7,
};

// Margin kiri/kanan umum untuk garis 2, 3, 4
const MARGIN_LEFT_CM = 0.6;
const MARGIN_RIGHT_CM = 0.6;

// ===== Posisi vertikal tiap garis =====
const LINE_TANGGAL_TOP_CM = 1.2;
const LINE_TANGGAL_BOX_HEIGHT_CM = 0.5;
const LINE_TANGGAL_WIDTH_CM = 5.5;

// Jarak label (di atas garis) ke garisnya ("tinggi bacaan")
const LABEL_GAP_ABOVE_LINE_CM = 0.4;

// Jarak antar garis (garis kedua -> garis ketiga)
const LINE_SPACING_CM = 0.6;

// NOTE (asumsi): jarak vertikal dari garis tanggal ke garis kedua tidak
// disebutkan secara eksplisit di spek, jadi dipakai 2.0cm supaya ada ruang
// yang cukup untuk label "tinggi bacaan" (0.5cm) di atas garis kedua.
const LINE2_TOP_CM = 1.8;
const LINE3_TOP_CM = LINE2_TOP_CM + LINE_SPACING_CM; // 2.6

// Posisi garis keempat & kotak nominal ditentukan dari kotak nominal:
// jarak garis ketiga ke ujung atas kotak = 0.1cm, tinggi kotak = 0.6cm,
// dan garis keempat sejajar dengan sisi bawah kotak (seperti pola umum).
const KOTAK_NOMINAL_HEIGHT_CM = 0.6;
const KOTAK_NOMINAL_GAP_FROM_LINE3_CM = 0.1;
const KOTAK_NOMINAL_TOP_CM = LINE3_TOP_CM + KOTAK_NOMINAL_GAP_FROM_LINE3_CM; // 2.7
const LINE4_TOP_CM = LINE3_TOP_CM + LINE_SPACING_CM;

// ===== Panjang garis =====
const LINE23_WIDTH_CM = 16.5;
const LINE4_WIDTH_CM = 10.3;

// ===== Kotak nominal =====
const KOTAK_NOMINAL_WIDTH_CM = 5.5;
const KOTAK_NOMINAL_GAP_CM = 0.7; // jarak dari ujung garis 4 ke kotak nominal
const KOTAK_NOMINAL_LEFT_CM = MARGIN_LEFT_CM + LINE4_WIDTH_CM + KOTAK_NOMINAL_GAP_CM; // 11.7

// Padding horizontal di dalam kotak nominal. Sisi kiri dibikin lebih lebar
// supaya angka nominal nggak nempel/nabrak garis kiri kotak pas di-print
// (padding lama 0.15cm kelihatan mepet banget di hasil cetak).
const KOTAK_NOMINAL_PADDING_LEFT_CM = 1.6;
const KOTAK_NOMINAL_PADDING_RIGHT_CM = 0.15;

// ===== Lebar label italic (uppercase) =====
const LABEL_ATAS_PENYERAHAN_WIDTH_CM = 6;
const LABEL_ATAU_PEMBAWA_WIDTH_CM = 2.2;
const LABEL_UANG_SEJUMLAH_WIDTH_CM = 5.3;

// ===== Area teks isi (content) di dalam tiap garis =====
// Garis 2: mulai setelah label "Atas penyerahan..." & berhenti sebelum label "atau pembawa *)"
const LINE2_CONTENT_LEFT_CM = LABEL_ATAS_PENYERAHAN_WIDTH_CM + 0.2; // 6.2
const LINE2_CONTENT_STOP_BEFORE_LABEL_CM = LABEL_ATAU_PEMBAWA_WIDTH_CM + 0.7; // 2.4
const LINE2_CONTENT_WIDTH_CM =
    LINE23_WIDTH_CM - LINE2_CONTENT_LEFT_CM - LINE2_CONTENT_STOP_BEFORE_LABEL_CM; // 7.9

// Garis 3 (terbilang baris 1): mulai setelah label "uang sejumlah..."
const LINE3_SPAN_LEFT_CM = LABEL_UANG_SEJUMLAH_WIDTH_CM + 0.2; // 5.5
const LINE3_SPAN_RIGHT_CM = 0.6;
const LINE3_CONTENT_WIDTH_CM = LINE23_WIDTH_CM - LINE3_SPAN_LEFT_CM - LINE3_SPAN_RIGHT_CM; // 10.4

// Garis 4 (terbilang baris 2, lanjutan)
const LINE4_SPAN_LEFT_CM = 0.5;
const LINE4_SPAN_RIGHT_CM = 0.6;
const LINE4_CONTENT_WIDTH_CM = LINE4_WIDTH_CM - LINE4_SPAN_LEFT_CM - LINE4_SPAN_RIGHT_CM; // 9.6

// Perkiraan kapasitas karakter per baris (dipakai sebagai fallback SSR saja;
// pemotongan sebenarnya sekarang pakai pengukuran canvas, lihat measureTextWidthCm).
const CHAR_WIDTH_CM = 0.19;

// Ukuran font dasar (px) untuk teks terbilang, sesuai class "text-sm" (12px).
const TERBILANG_BASE_FONT_PX = 12;

// Batas minimum scale-down yang masih dianggap "wajar" untuk dipaksa muat
// dalam 1 garis saja. Kalau untuk muat 1 garis teksnya harus di-scale lebih
// kecil dari ini, baru dipecah ke garis keempat.
const MIN_SINGLE_LINE_SCALE = 0.95;

// Jarak vertikal isi teks (vendor/terbilang) ke garisnya. Dibikin negatif
// tipis supaya teksnya nempel rapat ke garis pas di-print (line-height
// bawaan font bikin ada spasi kosong di bawah teks kalau bottomCm = 0).
const CONTENT_BOTTOM_OFFSET_CM = -0.085;

// Teks yang otomatis mengecilkan ukuran font (scale down) kalau lebar
// teks aslinya melebihi maxWidthCm, supaya tidak pernah menumpuk/overflow
// ke elemen lain di sebelah kanannya.
function FitText({ text, leftCm, maxWidthCm, bottomCm, className }) {
    const wrapRef = useRef(null);
    const textRef = useRef(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const inner = textRef.current;
        if (!wrap || !inner) return;

        // Reset dulu supaya pengukuran lebar alami (tanpa scale) akurat
        inner.style.transform = "scale(1)";
        const wrapWidth = wrap.clientWidth;
        const textWidth = inner.scrollWidth;

        if (wrapWidth > 0 && textWidth > wrapWidth) {
            setScale(wrapWidth / textWidth);
        } else {
            setScale(1);
        }
    }, [text, maxWidthCm]);

    return (
        <div
            ref={wrapRef}
            className="absolute overflow-hidden"
            style={{ left: `${leftCm}cm`, bottom: `${bottomCm}cm`, width: `${maxWidthCm}cm` }}
        >
            <span
                ref={textRef}
                className={className}
                style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                    transform: `scale(${scale})`,
                    transformOrigin: "left bottom",
                }}
            >
                {text}
            </span>
        </div>
    );
}

// Dipakai KHUSUS untuk kasus terbilang yang kepecah jadi 2 baris (garis 3 &
// garis 4). Bedanya dengan FitText: di sini font-size di-set eksplisit
// (fontSizePx, sama untuk kedua baris biar ukurannya identik), teksnya
// dirender apa adanya (rapat, natural, rata kiri) — TANPA dipaksa
// stretching/justify ke lebar penuh garis.
function ScaledText({ text, leftCm, maxWidthCm, bottomCm, fontSizePx, className }) {
    return (
        <div
            className="absolute overflow-hidden"
            style={{ left: `${leftCm}cm`, bottom: `${bottomCm}cm`, width: `${maxWidthCm}cm` }}
        >
            <span
                className={className}
                style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    fontSize: `${fontSizePx}px`,
                    lineHeight: 1,
                }}
            >
                {text}
            </span>
        </div>
    );
}

// Ukur lebar teks (dalam cm) pakai canvas, jadi lebih akurat dari
// estimasi CHAR_WIDTH_CM yang statis — dipakai untuk menentukan titik
// potong terbaik antara line 1 & line 2 terbilang.
const PX_PER_CM = 37.795275591; // 96dpi / 2.54cm

let measureCtx = null;
function getMeasureCtx() {
    if (typeof document === "undefined") return null;
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    return measureCtx;
}

function measureTextWidthCm(text, fontSizePx = 12, fontWeight = "500") {
    const ctx = getMeasureCtx();
    if (!ctx) return text.length * CHAR_WIDTH_CM; // fallback kalau SSR
    ctx.font = `${fontWeight} ${fontSizePx}px "Arial Narrow", Arial, sans-serif`;
    return ctx.measureText(text).width / PX_PER_CM;
}

// Pecah teks terbilang jadi 2 baris: baris pertama sepanjang garis ketiga,
// sisanya (jika ada) lanjut ke garis keempat, tanpa memotong kata di tengah.
function splitTerbilang(text) {
    const clean = (text || "").trim().toUpperCase();
    if (!clean) return { line1: "", line2: "", fontSizePx: null };

    const fullWidthCm = measureTextWidthCm(clean);

    // Kalau seluruh teks sudah muat pas di garis ketiga, nggak usah dipecah.
    if (fullWidthCm <= LINE3_CONTENT_WIDTH_CM) {
        return { line1: clean, line2: "", fontSizePx: null };
    }

    // Kalau teksnya masih bisa dipepetin (di-scale down) ke 1 garis dengan
    // scale yang masih wajar, jangan dipecah dulu — biar FitText yang
    // ngecilin fontnya, garis keempat tetap kosong.
    const scaleIfSingleLine = LINE3_CONTENT_WIDTH_CM / fullWidthCm;
    if (scaleIfSingleLine >= MIN_SINGLE_LINE_SCALE) {
        return { line1: clean, line2: "", fontSizePx: null };
    }

    const words = clean.split(" ");
    if (words.length === 1) {
        // Satu kata super panjang, tidak ada titik potong yang valid;
        // biarkan FitText yang men-scale semuanya di baris pertama.
        return { line1: clean, line2: "", fontSizePx: null };
    }

    // Isi baris pertama (garis ketiga) SEPENUH MUNGKIN dulu, kata demi kata,
    // baru sisanya lanjut ke baris kedua (garis keempat). Supaya ruang di
    // garis ketiga nggak kebuang percuma gara-gara dipotong terlalu awal.
    let splitIndex = 1;
    for (let i = 1; i <= words.length; i++) {
        const candidate = words.slice(0, i).join(" ");
        const w = measureTextWidthCm(candidate);

        if (w <= LINE3_CONTENT_WIDTH_CM) {
            // Masih muat pas (tanpa perlu scale down), boleh lanjut coba kata berikutnya.
            splitIndex = i;
        } else {
            // Sudah kelebihan; kalau splitIndex belum maju sama sekali (kata
            // pertama saja sudah kepanjangan), tetap paksa 1 kata di baris 1
            // supaya baris 1 nggak kosong, biar FitText yang men-scale.
            break;
        }
    }

    const line1 = words.slice(0, splitIndex).join(" ");
    const line2 = words.slice(splitIndex).join(" ");

    // Teks dipecah jadi 2 baris beneran → hitung SATU font-size bersama
    // (px) supaya ukuran huruf garis 3 & garis 4 sama persis. Font-size
    // ini dipilih sekecil yang dibutuhkan baris yang paling "sesak".
    const w1 = measureTextWidthCm(line1, TERBILANG_BASE_FONT_PX, "500");
    const w2 = measureTextWidthCm(line2, TERBILANG_BASE_FONT_PX, "500");
    const scale1 = LINE3_CONTENT_WIDTH_CM / w1;
    const scale2 = w2 > 0 ? LINE4_CONTENT_WIDTH_CM / w2 : Infinity;
    const commonScale = Math.min(1, scale1, scale2);
    const fontSizePx = TERBILANG_BASE_FONT_PX * commonScale;

    return { line1, line2, fontSizePx };
}

function formatTanggalNumeric(tanggal) {
    if (!tanggal) return "\u00A0";
    const d = new Date(tanggal);
    if (Number.isNaN(d.getTime())) return "\u00A0";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export default function SinarmasCheck({ form }) {
    const { line1: terbilangLine1, line2: terbilangLine2, fontSizePx: terbilangFontPx } = splitTerbilang(form.terbilang);

    return (
        <div
            className="relative bg-white border border-gray-300 shrink-0 overflow-hidden"
            style={{
                width: `${template.widthCm}cm`,
                height: `${template.heightCm}cm`,
                fontFamily: '"Arial Narrow", Arial, sans-serif',
            }}
        >
            {/* ===== Tanggal (garis panjang 5.5cm, box tinggi 0.5cm) ===== */}
            <div
                className="absolute border-b border-gray-400 flex items-end justify-center"
                style={{
                    top: `${LINE_TANGGAL_TOP_CM - LINE_TANGGAL_BOX_HEIGHT_CM}cm`,
                    right: `${MARGIN_RIGHT_CM}cm`,
                    width: `${LINE_TANGGAL_WIDTH_CM}cm`,
                    height: `${LINE_TANGGAL_BOX_HEIGHT_CM}cm`,
                }}
            >
                <span className="text-xs text-black font-bold">
                    {formatTanggalNumeric(form.tanggal)}
                </span>
            </div>

            {/* ===== Label di atas garis kedua: "ATAS PENYERAHAN..." (italic, uppercase, lebar 6cm) ===== */}
            <svg
                className="absolute"
                style={{ top: `${LINE2_TOP_CM - LABEL_GAP_ABOVE_LINE_CM}cm`, left: `${MARGIN_LEFT_CM}cm` }}
                width={`${LABEL_ATAS_PENYERAHAN_WIDTH_CM}cm`}
                height="0.4cm"
                viewBox="0 0 600 40"
                preserveAspectRatio="none"
            >
                <text
                    x="0"
                    y="30"
                    textLength="600"
                    lengthAdjust="spacingAndGlyphs"
                    fontSize="28"
                    fontWeight="bold"
                    fontStyle="italic"
                    fontFamily='"Arial Narrow", Arial, sans-serif'
                    fill="#111827"
                >
                    ATAS PENYERAHAN CEK INI BAYARLAH KEPADA
                </text>
            </svg>

            {/* ===== Label kanan di atas garis kedua: "ATAU PEMBAWA *)" (italic, uppercase, lebar 2.2cm) ===== */}
            <svg
                className="absolute"
                style={{ top: `${LINE2_TOP_CM - LABEL_GAP_ABOVE_LINE_CM}cm`, right: `${MARGIN_RIGHT_CM}cm` }}
                width={`${LABEL_ATAU_PEMBAWA_WIDTH_CM}cm`}
                height="0.4cm"
                viewBox="0 0 220 40"
                preserveAspectRatio="none"
            >
                <text
                    x="0"
                    y="30"
                    textLength="220"
                    lengthAdjust="spacingAndGlyphs"
                    fontSize="28"
                    fontWeight="bold"
                    fontStyle="italic"
                    fontFamily='"Arial Narrow", Arial, sans-serif'
                    fill="#111827"
                >
                    ATAU PEMBAWA *)
                </text>
            </svg>

            {/* ===== Garis kedua (panjang 16.5cm) ===== */}
            <div
                className="absolute border-b border-gray-400"
                style={{ top: `${LINE2_TOP_CM}cm`, left: `${MARGIN_LEFT_CM}cm`, width: `${LINE23_WIDTH_CM}cm` }}
            >
                {form.jenisCek === "Transfer" ? (
                    <FitText
                        text={`${form.vendor || ""} - ${form.bankPenerima || ""} - ${form.nomorRekening || ""}`}
                        leftCm={LINE2_CONTENT_LEFT_CM}
                        maxWidthCm={LINE2_CONTENT_WIDTH_CM}
                        bottomCm={CONTENT_BOTTOM_OFFSET_CM}
                        className="text-sm text-black font-bold"
                    />
                ) : (
                    <FitText
                        text={form.vendor || ""}
                        leftCm={LINE2_CONTENT_LEFT_CM}
                        maxWidthCm={LINE2_CONTENT_WIDTH_CM}
                        bottomCm={CONTENT_BOTTOM_OFFSET_CM}
                        className="text-sm text-black font-bold"
                    />
                )}
            </div>

            {/* ===== Label di atas garis ketiga: "UANG SEJUMLAH..." (italic, uppercase, lebar 5.3cm) ===== */}
            <svg
                className="absolute"
                style={{ top: `${LINE3_TOP_CM - LABEL_GAP_ABOVE_LINE_CM}cm`, left: `${MARGIN_LEFT_CM}cm` }}
                width={`${LABEL_UANG_SEJUMLAH_WIDTH_CM}cm`}
                height="0.4cm"
                viewBox="0 0 530 40"
                preserveAspectRatio="none"
            >
                <text
                    x="0"
                    y="30"
                    textLength="530"
                    lengthAdjust="spacingAndGlyphs"
                    fontSize="28"
                    fontWeight="bold"
                    fontStyle="italic"
                    fontFamily='"Arial Narrow", Arial, sans-serif'
                    fill="#111827"
                >
                    UANG SEJUMLAH RUPIAH (DALAM HURUF)
                </text>
            </svg>

            {/* ===== Garis ketiga (panjang 16.5cm) ===== */}
            <div
                className="absolute border-b border-gray-400"
                style={{ top: `${LINE3_TOP_CM}cm`, left: `${MARGIN_LEFT_CM}cm`, width: `${LINE23_WIDTH_CM}cm` }}
            >
                {terbilangFontPx != null ? (
                    <ScaledText
                        text={terbilangLine1}
                        leftCm={LINE3_SPAN_LEFT_CM}
                        maxWidthCm={LINE3_CONTENT_WIDTH_CM}
                        bottomCm={CONTENT_BOTTOM_OFFSET_CM}
                        fontSizePx={terbilangFontPx}
                        className="text-black font-bold uppercase"
                    />
                ) : (
                    <FitText
                        text={terbilangLine1}
                        leftCm={LINE3_SPAN_LEFT_CM}
                        maxWidthCm={LINE3_CONTENT_WIDTH_CM}
                        bottomCm={CONTENT_BOTTOM_OFFSET_CM}
                        className="text-sm text-black font-bold uppercase"
                    />
                )}
            </div>

            {/* ===== Garis keempat (panjang 10.3cm) ===== */}
            <div
                className="absolute border-b border-gray-400"
                style={{ top: `${LINE4_TOP_CM}cm`, left: `${MARGIN_LEFT_CM}cm`, width: `${LINE4_WIDTH_CM}cm` }}
            >
                {terbilangLine2 && (
                    terbilangFontPx != null ? (
                        <ScaledText
                            text={terbilangLine2}
                            leftCm={LINE4_SPAN_LEFT_CM}
                            maxWidthCm={LINE4_CONTENT_WIDTH_CM}
                            bottomCm={CONTENT_BOTTOM_OFFSET_CM}
                            fontSizePx={terbilangFontPx}
                            className="text-black font-bold uppercase"
                        />
                    ) : (
                        <FitText
                            text={terbilangLine2}
                            leftCm={LINE4_SPAN_LEFT_CM}
                            maxWidthCm={LINE4_CONTENT_WIDTH_CM}
                            bottomCm={CONTENT_BOTTOM_OFFSET_CM}
                            className="text-sm text-black font-bold uppercase"
                        />
                    )
                )}
            </div>

            {/* ===== Teks "Rp." di celah antara garis keempat & kotak nominal (gap 0.8cm) ===== */}
            <div
                className="absolute flex items-center justify-center text-[10px] font-semibold text-gray-600"
                style={{
                    top: `${KOTAK_NOMINAL_TOP_CM}cm`,
                    left: `${MARGIN_LEFT_CM + LINE4_WIDTH_CM}cm`,
                    width: `${KOTAK_NOMINAL_GAP_CM}cm`,
                    height: `${KOTAK_NOMINAL_HEIGHT_CM}cm`,
                }}
            >
                Rp.
            </div>

            {/* ===== Kotak nominal (panjang 5.5cm, lebar 0.6cm) ===== */}
            <div
                className="absolute border border-gray-400 flex items-center justify-start"
                style={{
                    top: `${KOTAK_NOMINAL_TOP_CM}cm`,
                    left: `${KOTAK_NOMINAL_LEFT_CM}cm`,
                    width: `${KOTAK_NOMINAL_WIDTH_CM}cm`,
                    height: `${KOTAK_NOMINAL_HEIGHT_CM}cm`,
                    padding: `0 ${KOTAK_NOMINAL_PADDING_RIGHT_CM}cm 0 ${KOTAK_NOMINAL_PADDING_LEFT_CM}cm`,
                }}
            >
                <span className="text-xs font-bold font-mono text-gray-900 whitespace-nowrap">
                    {form.nominal ? Number(form.nominal).toLocaleString("id-ID") : ""}
                </span>
            </div>
        </div>
    );
}

// =====================================================================
// EXPORT LAYOUT UNTUK PDF (checkPdfExport.js)
// =====================================================================
// Semua angka di bawah ini adalah REFERENSI LANGSUNG ke const yang sudah
// dipakai komponen di atas — jadi kalau posisi garis/label di preview
// berubah, PDF otomatis ikut berubah tanpa perlu di-duplikasi manual lagi.
export const pdfLayout = {
    widthCm: template.widthCm,
    heightCm: template.heightCm,
    tanggal: { top: LINE_TANGGAL_TOP_CM, right: MARGIN_RIGHT_CM, width: LINE_TANGGAL_WIDTH_CM },
    line2: { top: LINE2_TOP_CM, left: MARGIN_LEFT_CM },
    vendorTransfer: { left: LINE2_CONTENT_LEFT_CM, width: LINE2_CONTENT_WIDTH_CM },
    vendorTunai: { left: LINE2_CONTENT_LEFT_CM, width: LINE2_CONTENT_WIDTH_CM },
    line3: { top: LINE3_TOP_CM, left: MARGIN_LEFT_CM },
    line4: { top: LINE4_TOP_CM, left: MARGIN_LEFT_CM },
    terbilang1: { left: LINE3_SPAN_LEFT_CM, width: LINE3_CONTENT_WIDTH_CM },
    terbilang2: { left: LINE4_SPAN_LEFT_CM, width: LINE4_CONTENT_WIDTH_CM },
    nominal: {
        top: KOTAK_NOMINAL_TOP_CM,
        left: KOTAK_NOMINAL_LEFT_CM,
        height: KOTAK_NOMINAL_HEIGHT_CM,
        padLeft: KOTAK_NOMINAL_PADDING_LEFT_CM,
    },
};