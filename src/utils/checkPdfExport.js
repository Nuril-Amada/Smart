import jsPDF from "jspdf";

// =====================================================================
// GENERATE PDF CEK — TEKS ASLI (bukan screenshot/gambar)
// =====================================================================
// File ini menggantikan pendekatan html2canvas + addImage. Semua garis,
// label, dan isi (vendor/terbilang/nominal/tanggal) digambar langsung
// pakai fungsi jsPDF (pdf.text, pdf.line, pdf.rect), berdasarkan
// koordinat (cm) yang sama seperti di komponen React masing-masing bank
// (MandiriCheck.jsx, BCACheck.jsx, SinarmasCheck.jsx, MaybankCheck.jsx).
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
// Semua angka (top/left/width/right, dalam cm) diambil 1:1 dari konstanta
// yang sudah ada di komponen React masing-masing bank.

function mandiriLayout() {
  return {
    widthCm: 17.8,
    heightCm: 7,
    tanggal: { top: 0.6, right: 0.6, width: 5.8, height: 0.5 },
    labelAtas: { text: "Atas penyerahan cek ini bayarlah kepada", top: 1.55, left: 0.9 },
    labelPembawa: { text: "atau pembawa *", top: 1.55, right: 0.6 },
    line2: { top: 2.0, left: 0.9, right: 0.6 },
    captionPayTo: { text: "Pay to the order of", top: 2.32, left: 0.9 },
    captionOrBearer: { text: "or bearer", top: 2.32, left: 15.6 },
    labelUang: { text: "uang sejumlah Rupiah (dalam huruf)", top: 2.25, left: 0.9 },
    line3: { top: 2.7, left: 0.9, right: 0.6 },
    captionSumOf: { text: "The Sum of (in words)", top: 3.02, left: 0.9 },
    line4: { top: 3.4, left: 0.9, width: 10.3 },
    vendorTransfer: { left: 4.3, width: 10.7 },
    vendorTunai: { left: 4.2, width: 6.9 },
    terbilang1: { left: 3.9, width: 10.2 },
    terbilang2: { left: 2.2, width: 7.4 },
    rpLabel: { top: 2.55, left: 11.2, width: 0.7, height: 0.6 },
    nominal: { top: 2.75, left: 11.9, width: 5.3, height: 0.5, padLeft: 0.9 },
  };
}

function bcaLayout() {
  const marginLeft = 0.7;
  const marginRight = 0.4;
  const line23Width = 16.6;
  const line4Width = 10.2;
  const gapNominal = 1;
  const nominalWidth = 5.4;
  return {
    widthCm: 17.7,
    heightCm: 7,
    tanggal: { top: 0.7, right: marginRight, width: 6, height: 0.6 },
    labelAtas: { text: "Atas penyerahan cek ini bayarlah kepada", top: 1.7, left: marginLeft },
    labelPembawa: { text: "atau pembawa *)", top: 1.7, right: marginRight },
    line2: { top: 2.1, left: marginLeft, width: line23Width },
    labelUang: { text: "uang sejumlah Rupiah (dalam huruf)", top: 2.4, left: marginLeft },
    line3: { top: 2.8, left: marginLeft, width: line23Width },
    line4: { top: 3.5, left: marginLeft, width: line4Width },
    vendorTransfer: { left: 4.7, width: 10.3 },
    vendorTunai: { left: 4.7, width: 10.3 },
    terbilang1: { left: 4.2, width: 12.0 },
    terbilang2: { left: 0.5, width: 7.4 },
    rpLabel: { top: 3.0, left: marginLeft + line4Width, width: gapNominal, height: 0.5 },
    // BCA pakai GARIS nominal (bukan kotak), sejajar dengan garis keempat.
    nominalLine: {
      top: 3.5,
      left: marginLeft + line4Width + gapNominal,
      width: nominalWidth,
      padLeft: 1,
    },
  };
}

function sinarmasLayout() {
  const marginLeft = 0.6;
  const marginRight = 0.6;
  const line23Width = 16.5;
  const line4Width = 10.3;
  return {
    widthCm: 17.7,
    heightCm: 7,
    tanggal: { top: 0.7, right: marginRight, width: 5.5, height: 0.5 },
    labelAtas: { text: "ATAS PENYERAHAN CEK INI BAYARLAH KEPADA", top: 1.3, left: marginLeft },
    labelPembawa: { text: "ATAU PEMBAWA *)", top: 1.3, right: marginRight },
    line2: { top: 1.8, left: marginLeft, width: line23Width },
    labelUang: { text: "UANG SEJUMLAH RUPIAH (DALAM HURUF)", top: 2.1, left: marginLeft },
    line3: { top: 2.6, left: marginLeft, width: line23Width },
    line4: { top: 3.2, left: marginLeft, width: line4Width },
    vendorTransfer: { left: 6.2, width: 7.9 },
    vendorTunai: { left: 6.2, width: 7.9 },
    terbilang1: { left: 5.5, width: 10.4 },
    terbilang2: { left: 0.5, width: 9.6 },
    rpLabel: { top: 2.7, left: marginLeft + line4Width, width: 0.7, height: 0.6 },
    nominal: { top: 2.7, left: 11.7, width: 5.5, height: 0.6, padLeft: 1.6 },
  };
}

function maybankLayout() {
  const marginLeft = 0.9;
  const marginRight = 0.7;
  const line23Width = 16.2;
  const line4Width = 11.2;
  return {
    widthCm: 17.8,
    heightCm: 7,
    tanggal: { top: 0.9, right: marginRight, width: 5.5, height: 0.5 },
    labelAtas: { text: "Atas penyerahan cek ini bayarlah kepada", top: 2.0, left: marginLeft },
    labelPembawa: { text: "atau pembawa *)", top: 2.0, right: marginRight },
    line2: { top: 2.4, left: marginLeft, width: line23Width },
    captionOnPresentation: { text: "On presentation of this cheque pay", top: 2.7, left: marginLeft },
    captionOrBearer: { text: "or bearer", top: 2.7, right: marginRight },
    labelUang: { text: "Uang Sejumlah Rupiah (dalam huruf)", top: 2.6, left: marginLeft },
    line3: { top: 3.0, left: marginLeft, width: line23Width },
    captionSumOf: { text: "The sum of Rupiah (in words)", top: 3.3, left: marginLeft },
    line4: { top: 3.65, left: marginLeft, width: line4Width },
    vendorTransfer: { left: 4.7, width: 9.4 },
    vendorTunai: { left: 4.7, width: 9.4 },
    terbilang1: { left: 4.2, width: 11.4 },
    terbilang2: { left: 3.0, width: 8.2 },
    rpLabel: { top: 3.15, left: marginLeft + line4Width, width: 0.6, height: 0.5 },
    nominal: {
      top: 3.15,
      left: marginLeft + line4Width + 0.6,
      width: 4.4,
      height: 0.5,
      padLeft: 0.7,
    },
  };
}

const LAYOUTS = {
  "Bank Mandiri": mandiriLayout,
  Mandiri: mandiriLayout,
  "Bank BCA": bcaLayout,
  BCA: bcaLayout,
  "Bank Sinarmas": sinarmasLayout,
  Sinarmas: sinarmasLayout,
  Maybank: maybankLayout,
  "Maybank Indonesia": maybankLayout,
  "Bank Maybank": maybankLayout,
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
  const layoutFn = LAYOUTS[form.bank];
  if (!layoutFn) {
    throw new Error(`Layout untuk bank "${form.bank}" belum tersedia.`);
  }
  const layout = layoutFn();

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