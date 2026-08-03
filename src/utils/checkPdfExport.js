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