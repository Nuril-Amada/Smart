import jsPDF from "jspdf";
import { pdfLayout as mandiriPdfLayout } from "../components/cetakcek/MandiriCheck";
import { pdfLayout as bcaPdfLayout } from "../components/cetakcek/BCACheck";
import { pdfLayout as sinarmasPdfLayout } from "../components/cetakcek/SinarmasCheck";
import { pdfLayout as maybankPdfLayout } from "../components/cetakcek/MaybankCheck";

// =====================================================================
// GENERATE PDF CEK — TEKS ASLI (bukan screenshot/gambar)
// =====================================================================
// File ini menggambar semua isi (vendor/terbilang/nominal/tanggal)
// langsung pakai fungsi jsPDF (pdf.text), berdasarkan koordinat (cm) yang
// DIIMPOR LANGSUNG dari tiap komponen React bank (`pdfLayout` di
// MandiriCheck.jsx, BCACheck.jsx, SinarmasCheck.jsx, MaybankCheck.jsx).
//
// Jadi tidak ada lagi duplikasi angka layout di file ini — kalau posisi
// garis/label di komponen bank diubah, PDF otomatis ikut menyesuaikan
// tanpa perlu update dua tempat.
//
// CATATAN FONT: jsPDF hanya punya font bawaan helvetica/times/courier —
// tidak ada "Arial Narrow" seperti di preview HTML. Bentuk huruf jadi
// sedikit berbeda dari preview, tapi tetap teks asli (bisa di-select,
// tajam saat print). Kalau nanti mau font identik, perlu embed file
// .ttf Arial Narrow ke jsPDF secara terpisah.
// =====================================================================

// ================= HELPER UMUM =================

function formatTanggalNumeric(tanggal) {
  if (!tanggal) return "";
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Scale-down otomatis (mirip FitText di React): kalau teks lebih lebar
// dari maxWidthCm, font-size diperkecil proporsional supaya pas & tidak
// pernah overflow ke elemen sebelah kanannya.
function fitFontSize(pdf, text, maxWidthCm, baseSizePt, minSizePt = 5) {
  if (!text) return baseSizePt;
  pdf.setFontSize(baseSizePt);
  const w = pdf.getTextWidth(text);
  if (w <= maxWidthCm || w === 0) return baseSizePt;
  const scaled = baseSizePt * (maxWidthCm / w);
  return Math.max(scaled, minSizePt);
}

// Pecah terbilang jadi maksimal 2 baris (mirip splitTerbilang di React),
// tapi pengukurannya pakai pdf.getTextWidth supaya konsisten dgn font PDF.
function splitTerbilangPdf(pdf, text, line3Width, line4Width, baseSizePt = 10) {
  const clean = (text || "").trim().toUpperCase();
  if (!clean) return { line1: "", line2: "", sizePt: baseSizePt };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(baseSizePt);
  const full = pdf.getTextWidth(clean);

  // Muat pas di satu baris, tidak perlu dipecah.
  if (full <= line3Width) {
    return { line1: clean, line2: "", sizePt: baseSizePt };
  }

  // Masih bisa di-scale-down wajar (>= 85%) ke 1 baris, jangan dipecah.
  const scaleIfSingle = line3Width / full;
  if (scaleIfSingle >= 0.85) {
    return { line1: clean, line2: "", sizePt: baseSizePt * scaleIfSingle };
  }

  const words = clean.split(" ");
  if (words.length === 1) {
    // Satu kata super panjang, tidak ada titik potong; scale down semua.
    return { line1: clean, line2: "", sizePt: baseSizePt * Math.max(scaleIfSingle, 0.5) };
  }

  // Isi baris pertama sepenuh mungkin, kata demi kata.
  let splitIndex = 1;
  for (let i = 1; i <= words.length; i++) {
    const candidate = words.slice(0, i).join(" ");
    if (pdf.getTextWidth(candidate) <= line3Width) {
      splitIndex = i;
    } else {
      break;
    }
  }

  const line1 = words.slice(0, splitIndex).join(" ");
  const line2 = words.slice(splitIndex).join(" ");

  const w1 = pdf.getTextWidth(line1) || 1;
  const w2 = pdf.getTextWidth(line2) || 1;
  const scale1 = line3Width / w1;
  const scale2 = line4Width / w2;
  const sizePt = baseSizePt * Math.min(1, scale1, scale2);

  return { line1, line2, sizePt };
}

// ================= LAYOUT TIAP BANK =================
// Diimpor langsung dari komponen React masing-masing bank (lihat import
// di atas). Tidak ada lagi definisi layout terpisah di file ini.

const LAYOUTS = {
  "Bank Mandiri": mandiriPdfLayout,
  Mandiri: mandiriPdfLayout,
  "Bank BCA": bcaPdfLayout,
  BCA: bcaPdfLayout,
  "Bank Sinarmas": sinarmasPdfLayout,
  Sinarmas: sinarmasPdfLayout,
  Maybank: maybankPdfLayout,
  "Maybank Indonesia": maybankPdfLayout,
  "Bank Maybank": maybankPdfLayout,
};

// ================= FUNGSI UTAMA =================

/**
 * Generate objek jsPDF berisi HANYA inputan user (tanggal, vendor/transfer,
 * terbilang, nominal) sebagai teks asli — TANPA garis, TANPA label/caption,
 * TANPA kotak/border, dan TANPA background apa pun.
 *
 * Dipakai untuk dicetak di atas kertas cek fisik yang sudah ada garis &
 * labelnya dari bank (pre-printed), jadi PDF ini isinya cuma teks yang
 * diposisikan pas di atas garis/kotak aslinya.
 *
 * @param {object} form - state form dari CetakCek.jsx
 * @returns {jsPDF}
 */
export function generateCheckPdf(form) {
  const layout = LAYOUTS[form.bank];
  if (!layout) {
    throw new Error(`Layout untuk bank "${form.bank}" belum tersedia.`);
  }

  const pdf = new jsPDF({
    orientation: layout.widthCm >= layout.heightCm ? "landscape" : "portrait",
    unit: "cm",
    format: [layout.widthCm, layout.heightCm],
  });

  pdf.setTextColor(0, 0, 0);

  // ----- 1. Tanggal (teks saja, tanpa garis) -----
  const tgl = layout.tanggal;
  const tglX = layout.widthCm - tgl.right - tgl.width;
  const tglText = formatTanggalNumeric(form.tanggal);
  if (tglText) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const w = pdf.getTextWidth(tglText);
    pdf.text(tglText, tglX + (tgl.width - w) / 2, tgl.top - 0.12);
  }

  // ----- 2. Vendor / Transfer (teks saja, tanpa garis & tanpa label) -----
  const l2 = layout.line2;
  const vendorCfg = form.jenisCek === "Transfer" ? layout.vendorTransfer : layout.vendorTunai;
  const vendorText =
    form.jenisCek === "Transfer"
      ? `${form.vendor || ""} - ${form.bankPenerima || ""} - ${form.nomorRekening || ""}`
      : form.vendor || "";

  if (vendorText.trim()) {
    const size = fitFontSize(pdf, vendorText, vendorCfg.width, 10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(size);
    pdf.text(vendorText, l2.left + vendorCfg.left, l2.top - 0.1);
  }

  // ----- 3. Terbilang (teks saja, tanpa garis/label/caption) -----
  const l3 = layout.line3;
  const l4 = layout.line4;

  const { line1, line2, sizePt } = splitTerbilangPdf(
    pdf,
    form.terbilang,
    layout.terbilang1.width,
    layout.terbilang2.width
  );

  if (line1) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(sizePt);
    pdf.text(line1, l3.left + layout.terbilang1.left, l3.top - 0.1);
  }
  if (line2) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(sizePt);
    pdf.text(line2, l4.left + layout.terbilang2.left, l4.top - 0.1);
  }

  // ----- 4. Nominal (angka saja, tanpa "Rp." label & tanpa kotak/garis) -----
  const nominalText = form.nominal ? Number(form.nominal).toLocaleString("id-ID") : "";

  if (layout.nominal) {
    const n = layout.nominal;
    if (nominalText) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(nominalText, n.left + n.padLeft, n.top + n.height - 0.15);
    }
  } else if (layout.nominalLine) {
    const n = layout.nominalLine;
    if (nominalText) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(nominalText, n.left + n.padLeft, n.top - 0.1);
    }
  }

  return pdf;
}

/**
 * Shortcut: generate lalu langsung trigger download di browser.
 * @param {object} form
 */
export function downloadCheckPdf(form) {
  const pdf = generateCheckPdf(form);
  pdf.save(`cek-${form.bank || "preview"}-${form.nomorCek || Date.now()}.pdf`);
}

// =====================================================================
// GENERATE HTML CETAK — HANYA TEKS INPUTAN USER (tanpa template cek)
// =====================================================================
// Menghasilkan HTML string berisi HANYA: tanggal, vendor/transfer,
// terbilang, dan nominal — diposisikan secara absolut (cm) persis di atas
// garis-garis cek fisik yang sudah pre-printed di kertas.
//
// TIDAK ada garis, TIDAK ada label, TIDAK ada kotak/border, TIDAK ada
// background — hanya teks, persis seperti cara kerja generateCheckPdf
// namun outputnya HTML + CSS sehingga font lebih akurat saat dicetak.
//
// Dipakai oleh handleCetak() di CetakCek.jsx untuk print langsung via
// window.print() (tanpa instalasi driver/library tambahan).
// =====================================================================

/**
 * Hitung font-size (pt) agar teks pas dalam maxWidthCm menggunakan
 * canvas (browser) untuk pengukuran — mirip fitFontSize versi HTML.
 */
function fitFontSizeHtml(text, maxWidthCm, baseSizePt, fontFamily = '"Arial Narrow", Arial, sans-serif') {
  if (!text) return baseSizePt;
  const PX_PER_CM = 37.795275591;
  const maxWidthPx = maxWidthCm * PX_PER_CM;

  const canvas = typeof document !== "undefined"
    ? document.createElement("canvas")
    : null;
  if (!canvas) return baseSizePt;

  const ctx = canvas.getContext("2d");
  const basePx = baseSizePt * (96 / 72); // pt → px (96dpi)
  ctx.font = `bold ${basePx}px ${fontFamily}`;
  const w = ctx.measureText(text).width;

  if (w <= maxWidthPx || w === 0) return baseSizePt;
  const scaled = baseSizePt * (maxWidthPx / w);
  return Math.max(scaled, 5);
}

/**
 * Pecah terbilang jadi max 2 baris menggunakan canvas untuk pengukuran.
 * Mengembalikan { line1, line2, sizePt } sama seperti splitTerbilangPdf.
 */
function splitTerbilangHtml(text, line3WidthCm, line4WidthCm, baseSizePt = 9) {
  const clean = (text || "").trim().toUpperCase();
  if (!clean) return { line1: "", line2: "", sizePt: baseSizePt };

  const PX_PER_CM = 37.795275591;
  const basePx = baseSizePt * (96 / 72);
  const fontFamily = '"Arial Narrow", Arial, sans-serif';

  const canvas = typeof document !== "undefined"
    ? document.createElement("canvas")
    : null;

  function measurePx(t) {
    if (!canvas) return t.length * basePx * 0.55; // fallback
    const ctx = canvas.getContext("2d");
    ctx.font = `bold ${basePx}px ${fontFamily}`;
    return ctx.measureText(t).width;
  }

  const line3Px = line3WidthCm * PX_PER_CM;
  const line4Px = line4WidthCm * PX_PER_CM;
  const fullPx = measurePx(clean);

  if (fullPx <= line3Px) return { line1: clean, line2: "", sizePt: baseSizePt };

  // Masih bisa scale-down ke 1 baris (>= 85%)?
  if (line3Px / fullPx >= 0.85) {
    return { line1: clean, line2: "", sizePt: baseSizePt * (line3Px / fullPx) };
  }

  const words = clean.split(" ");
  if (words.length === 1) {
    return { line1: clean, line2: "", sizePt: baseSizePt * Math.max(line3Px / fullPx, 0.5) };
  }

  let splitIndex = 1;
  for (let i = 1; i <= words.length; i++) {
    const candidate = words.slice(0, i).join(" ");
    if (measurePx(candidate) <= line3Px) splitIndex = i;
    else break;
  }

  const line1 = words.slice(0, splitIndex).join(" ");
  const line2 = words.slice(splitIndex).join(" ");

  const w1 = measurePx(line1) || 1;
  const w2 = measurePx(line2) || 1;
  const scale = Math.min(1, line3Px / w1, line4Px / w2);
  return { line1, line2, sizePt: baseSizePt * scale };
}

/**
 * Generate HTML string berisi HANYA inputan user (tanggal, vendor/transfer,
 * terbilang, nominal) yang diposisikan dengan `position: absolute` (cm)
 * persis di atas garis-garis cek fisik yang sudah pre-printed.
 *
 * TIDAK ada garis, TIDAK ada label/caption, TIDAK ada border/background.
 * Dipakai untuk window.print() sehingga hasilnya teks nyata (bisa di-select,
 * tajam saat cetak) bukan gambar.
 *
 * @param {object} form - state form dari CetakCek.jsx
 * @returns {string} HTML string lengkap (<!DOCTYPE html> … </html>)
 */
export function generatePrintHtml(form) {
  const layout = LAYOUTS[form.bank];
  if (!layout) {
    throw new Error(`Layout untuk bank "${form.bank}" belum tersedia.`);
  }

  const BASE_PT = 9; // font-size dasar (pt) sebelum di-scale
  const els = [];   // kumpulan elemen HTML yang akan dirender

  // ── 1. Tanggal ──────────────────────────────────────────────────────
  const tglText = formatTanggalNumeric(form.tanggal);
  if (tglText) {
    const tgl = layout.tanggal;
    // Posisi left dari kiri halaman (tgl diukur dari kanan)
    const leftCm = layout.widthCm - tgl.right - tgl.width;
    // Posisi top: garis tanggal ada di tgl.top → teks duduk sedikit di atasnya
    const topCm = tgl.top - 0.45;
    els.push(
      `<div style="position:absolute;top:${topCm}cm;left:${leftCm}cm;` +
      `width:${tgl.width}cm;font-size:${BASE_PT}pt;font-weight:bold;` +
      `text-align:center;white-space:nowrap;overflow:hidden;">${tglText}</div>`
    );
  }

  // ── 2. Vendor / Transfer ─────────────────────────────────────────────
  const vendorCfg =
    form.jenisCek === "Transfer" ? layout.vendorTransfer : layout.vendorTunai;
  const vendorText =
    form.jenisCek === "Transfer"
      ? `${form.vendor || ""} - ${form.bankPenerima || ""} - ${form.nomorRekening || ""}`
      : form.vendor || "";

  if (vendorText.trim()) {
    const l2 = layout.line2;
    const vendorSizePt = fitFontSizeHtml(vendorText, vendorCfg.width, BASE_PT);
    const topCm = l2.top - 0.45;
    els.push(
      `<div style="position:absolute;top:${topCm}cm;left:${l2.left + vendorCfg.left}cm;` +
      `width:${vendorCfg.width}cm;font-size:${vendorSizePt}pt;font-weight:bold;` +
      `white-space:nowrap;overflow:hidden;">${vendorText}</div>`
    );
  }

  // ── 3. Terbilang (bisa 1 atau 2 baris) ───────────────────────────────
  const { line1, line2, sizePt: terbSizePt } = splitTerbilangHtml(
    form.terbilang,
    layout.terbilang1.width,
    layout.terbilang2.width,
    BASE_PT
  );

  if (line1) {
    const l3 = layout.line3;
    els.push(
      `<div style="position:absolute;top:${l3.top - 0.45}cm;left:${l3.left + layout.terbilang1.left}cm;` +
      `width:${layout.terbilang1.width}cm;font-size:${terbSizePt}pt;font-weight:bold;` +
      `text-transform:uppercase;white-space:nowrap;overflow:hidden;">${line1}</div>`
    );
  }
  if (line2) {
    const l4 = layout.line4;
    els.push(
      `<div style="position:absolute;top:${l4.top - 0.45}cm;left:${l4.left + layout.terbilang2.left}cm;` +
      `width:${layout.terbilang2.width}cm;font-size:${terbSizePt}pt;font-weight:bold;` +
      `text-transform:uppercase;white-space:nowrap;overflow:hidden;">${line2}</div>`
    );
  }

  // ── 4. Nominal ────────────────────────────────────────────────────────
  const nominalText = form.nominal
    ? Number(form.nominal).toLocaleString("id-ID")
    : "";

  if (nominalText) {
    if (layout.nominal) {
      // Bank dengan KOTAK nominal (Mandiri, Sinarmas, Maybank)
      const n = layout.nominal;
      els.push(
        `<div style="position:absolute;top:${n.top + 0.05}cm;left:${n.left + n.padLeft}cm;` +
        `font-size:${BASE_PT}pt;font-weight:bold;font-family:'Courier New',monospace;` +
        `white-space:nowrap;">${nominalText}</div>`
      );
    } else if (layout.nominalLine) {
      // Bank dengan GARIS nominal (BCA)
      const n = layout.nominalLine;
      els.push(
        `<div style="position:absolute;top:${n.top - 0.45}cm;left:${n.left + n.padLeft}cm;` +
        `font-size:${BASE_PT}pt;font-weight:bold;font-family:'Courier New',monospace;` +
        `white-space:nowrap;">${nominalText}</div>`
      );
    }
  }

  // ── Rakit HTML lengkap ───────────────────────────────────────────────
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cetak Cek \u2013 ${form.bank}</title>
  <style>
    @page {
      /* Ukuran halaman = ukuran fisik cek, tanpa margin */
      size: ${layout.widthCm}cm ${layout.heightCm}cm;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${layout.widthCm}cm;
      height: ${layout.heightCm}cm;
      background: transparent;
    }
    * {
      font-family: "Arial Narrow", Arial, sans-serif;
      box-sizing: border-box;
      color: #000;
    }
  </style>
</head>
<body style="position:relative;width:${layout.widthCm}cm;height:${layout.heightCm}cm;">
  ${els.join("\n  ")}
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 300);
      window.addEventListener("afterprint", function () { window.close(); });
    });
  <\/script>
</body>
</html>`;
}

// =====================================================================
// GENERATE BODY HTML CETAK — Hanya konten div (tanpa full document)
// =====================================================================
// Sama dengan generatePrintHtml tetapi mengembalikan:
//   { bodyHtml: string, widthCm: number, heightCm: number }
// Dipakai oleh handleCetak() untuk inject langsung ke DOM halaman yang
// sama via @media print — lebih reliable daripada window.open().
// =====================================================================

/**
 * Generate HANYA elemen-elemen div teks (tanpa <html>/<head>/<body>)
 * beserta dimensi layout, siap di-inject ke DOM via dangerouslySetInnerHTML
 * atau innerHTML.
 *
 * @param {object} form
 * @returns {{ bodyHtml: string, widthCm: number, heightCm: number }}
 */
export function generatePrintBodyHtml(form) {
  const layout = LAYOUTS[form.bank];
  if (!layout) {
    throw new Error(`Layout untuk bank "${form.bank}" belum tersedia.`);
  }

  const BASE_PT = 9;
  const els = [];

  // ── 1. Tanggal ──────────────────────────────────────────────────────
  const tglText = formatTanggalNumeric(form.tanggal);
  if (tglText) {
    const tgl = layout.tanggal;
    const leftCm = layout.widthCm - tgl.right - tgl.width;
    const topCm = tgl.top - 0.45;
    els.push(
      `<div style="position:absolute;top:${topCm}cm;left:${leftCm}cm;` +
      `width:${tgl.width}cm;font-size:${BASE_PT}pt;font-weight:bold;` +
      `font-family:'Arial Narrow',Arial,sans-serif;` +
      `text-align:center;white-space:nowrap;overflow:hidden;">${tglText}</div>`
    );
  }

  // ── 2. Vendor / Transfer ─────────────────────────────────────────────
  const vendorCfg =
    form.jenisCek === "Transfer" ? layout.vendorTransfer : layout.vendorTunai;
  const vendorText =
    form.jenisCek === "Transfer"
      ? `${form.vendor || ""} - ${form.bankPenerima || ""} - ${form.nomorRekening || ""}`
      : form.vendor || "";

  if (vendorText.trim()) {
    const l2 = layout.line2;
    const vendorSizePt = fitFontSizeHtml(vendorText, vendorCfg.width, BASE_PT);
    const topCm = l2.top - 0.45;
    els.push(
      `<div style="position:absolute;top:${topCm}cm;left:${l2.left + vendorCfg.left}cm;` +
      `width:${vendorCfg.width}cm;font-size:${vendorSizePt}pt;font-weight:bold;` +
      `font-family:'Arial Narrow',Arial,sans-serif;` +
      `white-space:nowrap;overflow:hidden;">${vendorText}</div>`
    );
  }

  // ── 3. Terbilang (bisa 1 atau 2 baris) ───────────────────────────────
  const { line1, line2, sizePt: terbSizePt } = splitTerbilangHtml(
    form.terbilang,
    layout.terbilang1.width,
    layout.terbilang2.width,
    BASE_PT
  );

  if (line1) {
    const l3 = layout.line3;
    els.push(
      `<div style="position:absolute;top:${l3.top - 0.45}cm;left:${l3.left + layout.terbilang1.left}cm;` +
      `width:${layout.terbilang1.width}cm;font-size:${terbSizePt}pt;font-weight:bold;` +
      `font-family:'Arial Narrow',Arial,sans-serif;` +
      `text-transform:uppercase;white-space:nowrap;overflow:hidden;">${line1}</div>`
    );
  }
  if (line2) {
    const l4 = layout.line4;
    els.push(
      `<div style="position:absolute;top:${l4.top - 0.45}cm;left:${l4.left + layout.terbilang2.left}cm;` +
      `width:${layout.terbilang2.width}cm;font-size:${terbSizePt}pt;font-weight:bold;` +
      `font-family:'Arial Narrow',Arial,sans-serif;` +
      `text-transform:uppercase;white-space:nowrap;overflow:hidden;">${line2}</div>`
    );
  }

  // ── 4. Nominal ────────────────────────────────────────────────────────
  const nominalText = form.nominal
    ? Number(form.nominal).toLocaleString("id-ID")
    : "";

  if (nominalText) {
    if (layout.nominal) {
      const n = layout.nominal;
      els.push(
        `<div style="position:absolute;top:${n.top + 0.05}cm;left:${n.left + n.padLeft}cm;` +
        `font-size:${BASE_PT}pt;font-weight:bold;font-family:'Courier New',monospace;` +
        `white-space:nowrap;">${nominalText}</div>`
      );
    } else if (layout.nominalLine) {
      const n = layout.nominalLine;
      els.push(
        `<div style="position:absolute;top:${n.top - 0.45}cm;left:${n.left + n.padLeft}cm;` +
        `font-size:${BASE_PT}pt;font-weight:bold;font-family:'Courier New',monospace;` +
        `white-space:nowrap;">${nominalText}</div>`
      );
    }
  }

  return {
    bodyHtml: els.join("\n"),
    widthCm: layout.widthCm,
    heightCm: layout.heightCm,
  };
}