/**
 * checkPdfDrawers.js
 *
 * Menggambar teks yang diinput user (tanggal, vendor, terbilang, nominal)
 * ke dalam dokumen jsPDF dengan koordinat yang identik dengan layout
 * masing-masing komponen cek.
 *
 * TIDAK menggunakan html2canvas / screenshot komponen.
 * Setiap fungsi menerima (pdf, form) dan menggambar teks di posisi
 * yang benar tanpa mengubah komponen cek sama sekali.
 */

// ─── Konstanta Pengukuran ────────────────────────────────────────────────────

const PX_PER_CM = 37.795275591; // 96 dpi
const CHAR_W_CM = 0.19;         // fallback lebar karakter Arial Narrow 14px
const PX_TO_PT  = 0.75;         // 96dpi: 1px = 0.75pt

// Baseline teks diletakkan Y_LIFT cm di atas garis bawah cek,
// supaya teks duduk tepat di atas garis seperti di komponen aslinya.
const Y_LIFT = 0.10;

// ─── Canvas Measurement (sama persis dengan komponen cek) ───────────────────

let _ctx = null;
function getMeasureCtx() {
  if (typeof document === 'undefined') return null;
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
  return _ctx;
}

function measureWidthCm(text, fontSizePx = 14, fontWeight = '500') {
  const ctx = getMeasureCtx();
  if (!ctx) return text.length * CHAR_W_CM;
  ctx.font = `${fontWeight} ${fontSizePx}px "Arial Narrow", Arial, sans-serif`;
  return ctx.measureText(text).width / PX_PER_CM;
}

/**
 * Memecah terbilang menjadi 2 baris berdasarkan lebar maksimum tiap garis.
 * Menggunakan canvas measurement supaya titik potongnya konsisten dengan
 * splitTerbilang() di dalam komponen cek.
 */
function splitTerbilang(text, line1MaxCm, line2MaxCm) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return ['', ''];
  if (measureWidthCm(clean) <= line1MaxCm) return [clean, ''];

  const words = clean.split(' ');
  if (words.length === 1) return [clean, ''];

  let splitIdx = 1;
  for (let i = 1; i <= words.length; i++) {
    if (measureWidthCm(words.slice(0, i).join(' ')) <= line1MaxCm) {
      splitIdx = i;
    } else {
      break;
    }
  }
  return [
    words.slice(0, splitIdx).join(' '),
    words.slice(splitIdx).join(' '),
  ];
}

// ─── Helper Format ───────────────────────────────────────────────────────────

function fmtTanggal(tanggal) {
  if (!tanggal) return '';
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return '';
  return (
    String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    d.getFullYear()
  );
}

function fmtNominal(nominal) {
  return nominal ? Number(nominal).toLocaleString('id-ID') : '';
}

function buildVendorText(form) {
  return form.jenisCek === 'Transfer'
    ? `${form.vendor || ''} - ${form.bankPenerima || ''} - ${form.nomorRekening || ''}`
    : (form.vendor || '');
}

// ─── BCA ─────────────────────────────────────────────────────────────────────
// Layout: 17.7 x 7 cm  |  MARGIN_L=0.7  MARGIN_R=0.4
// Koordinat diambil dari konstanta di BCACheck.jsx (tidak diubah).

export function drawBCACheck(pdf, form) {
  const W  = 17.7;
  const ML = 0.7;

  pdf.setFont('helvetica', 'normal');

  // Tanggal: border-bottom di y=1.3, right=0.4, w=6, centered
  const tglBoxL = W - 0.4 - 6; // 11.3
  const tglBoxR = W - 0.4;     // 17.3
  pdf.setFontSize(12 * PX_TO_PT); // text-xs
  pdf.text(fmtTanggal(form.tanggal), (tglBoxL + tglBoxR) / 2, 1.3 - Y_LIFT, { align: 'center' });

  // Vendor (Garis 2, top=2.1): div left=ML, FitText leftCm=4.7 -> abs=5.4
  pdf.setFontSize(14 * PX_TO_PT); // text-sm
  pdf.text(buildVendorText(form), ML + 4.7, 2.1 - Y_LIFT);

  // Terbilang
  // Garis 3 (top=2.8): FitText leftCm=LINE3_SPAN_LEFT_CM(4.2) -> abs=4.9
  //   maxW = LINE23_WIDTH_CM(16.6) - SPAN_L(4.2) - SPAN_R(0.6) = 11.8
  // Garis 4 (top=3.5): FitText leftCm=LINE4_SPAN_LEFT_CM(0.1) -> abs=0.8
  //   maxW = LINE4_WIDTH_CM(10.2) - SPAN_L(0.1) - SPAN_R(0.6) = 9.5
  const [t1, t2] = splitTerbilang(form.terbilang, 11.8, 9.5);
  pdf.text(t1, ML + 4.2, 2.8 - Y_LIFT);
  if (t2) pdf.text(t2, ML + 0.1, 3.5 - Y_LIFT);

  // Nominal: GARIS_NOMINAL_LEFT_CM=11.9, inner left=0.1 -> abs=12.0, y=garis 4 top
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtNominal(form.nominal), 11.9 + 0.1, 3.5 - Y_LIFT);
  pdf.setFont('helvetica', 'normal');
}

// ─── Mandiri ──────────────────────────────────────────────────────────────────
// Layout: 17.8 x 7 cm  |  MARGIN_L=0.9  MARGIN_R=0.6
// Koordinat diambil dari konstanta di MandiriCheck.jsx (tidak diubah).

export function drawMandiriCheck(pdf, form) {
  const W  = 17.8;
  const ML = 0.9;

  pdf.setFont('helvetica', 'normal');

  // Tanggal: top=0.8, h=0.5 -> border-bottom di y=1.3, right=0.6, w=5.8, centered
  const tglBoxL = W - 0.6 - 5.8; // 11.4
  const tglBoxR = W - 0.6;       // 17.2
  pdf.setFontSize(12 * PX_TO_PT);
  pdf.text(fmtTanggal(form.tanggal), (tglBoxL + tglBoxR) / 2, 1.3 - Y_LIFT, { align: 'center' });

  // Vendor (Garis 2, top=2.0): div left=ML, FitText leftCm=4.2 -> abs=5.1
  pdf.setFontSize(14 * PX_TO_PT);
  pdf.text(buildVendorText(form), ML + 4.2, 2.0 - Y_LIFT);

  // Terbilang
  // Garis 3 (top=2.7): FitText leftCm=LINE3_SPAN_LEFT_CM(3.8) -> abs=4.7
  //   maxW = LINE3_DIV_WIDTH_CM(16.3) - SPAN_L(3.8) - SPAN_R(0.6) = 11.9
  // Garis 4 (top=3.4): FitText leftCm=LINE4_SPAN_LEFT_CM(2.2) -> abs=3.1
  //   maxW = LINE4_DIV_WIDTH_CM(10.3) - SPAN_L(2.2) - SPAN_R(0.6) = 7.5
  const [t1, t2] = splitTerbilang(form.terbilang, 11.9, 7.5);
  pdf.text(t1, ML + 3.8, 2.7 - Y_LIFT);
  if (t2) pdf.text(t2, ML + 2.2, 3.4 - Y_LIFT);

  // Nominal: kotak top=2.9, h=0.5, left=11.9, padding=0.15 -> center y=3.15
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtNominal(form.nominal), 11.9 + 0.15, 2.9 + 0.25);
  pdf.setFont('helvetica', 'normal');
}

// ─── Sinarmas ─────────────────────────────────────────────────────────────────
// Layout: 17.7 x 7 cm  |  MARGIN_L=0.6  MARGIN_R=0.6
// Koordinat diambil dari konstanta di SinarmasCheck.jsx (tidak diubah).

export function drawSinarmasCheck(pdf, form) {
  const W  = 17.7;
  const ML = 0.6;

  pdf.setFont('helvetica', 'normal');

  // Tanggal: LINE_TANGGAL_TOP=1.2, right=0.6, w=5.5, centered
  const tglBoxL = W - 0.6 - 5.5; // 11.6
  const tglBoxR = W - 0.6;       // 17.1
  pdf.setFontSize(12 * PX_TO_PT);
  pdf.text(fmtTanggal(form.tanggal), (tglBoxL + tglBoxR) / 2, 1.2 - Y_LIFT, { align: 'center' });

  // Vendor (Garis 2, LINE2_TOP=2.0): div left=ML, FitText leftCm=6.2 -> abs=6.8
  pdf.setFontSize(14 * PX_TO_PT);
  pdf.text(buildVendorText(form), ML + 6.2, 2.0 - Y_LIFT);

  // Terbilang
  // Garis 3 (LINE3_TOP=2.6): FitText leftCm=LINE3_SPAN_LEFT_CM(5.5) -> abs=6.1
  //   maxW = LINE23_WIDTH_CM(16.5) - SPAN_L(5.5) - SPAN_R(0.6) = 10.4
  // Garis 4 (LINE4_TOP=3.3): FitText leftCm=LINE4_SPAN_LEFT_CM(0.1) -> abs=0.7
  //   maxW = LINE4_WIDTH_CM(10.3) - SPAN_L(0.1) - SPAN_R(0.6) = 9.6
  const [t1, t2] = splitTerbilang(form.terbilang, 10.4, 9.6);
  pdf.text(t1, ML + 5.5, 2.6 - Y_LIFT);
  if (t2) pdf.text(t2, ML + 0.1, 3.3 - Y_LIFT);

  // Nominal: KOTAK_NOMINAL_TOP=2.7, h=0.6, left=11.7, padding=0.15 -> center y=3.0
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtNominal(form.nominal), 11.7 + 0.15, 2.7 + 0.3);
  pdf.setFont('helvetica', 'normal');
}

// ─── Maybank ──────────────────────────────────────────────────────────────────
// Layout: 17.8 x 7 cm  |  MARGIN_L=0.9  MARGIN_R=0.7
// Koordinat diambil dari konstanta di MaybankCheck.jsx (tidak diubah).

export function drawMaybankCheck(pdf, form) {
  const W  = 17.8;
  const ML = 0.9;

  pdf.setFont('helvetica', 'normal');

  // Tanggal: LINE_TANGGAL_TOP=1.5, right=0.7, w=5.5, centered
  const tglBoxL = W - 0.7 - 5.5; // 11.6
  const tglBoxR = W - 0.7;       // 17.1
  pdf.setFontSize(12 * PX_TO_PT);
  pdf.text(fmtTanggal(form.tanggal), (tglBoxL + tglBoxR) / 2, 1.5 - Y_LIFT, { align: 'center' });

  // Vendor (Garis 2, LINE2_TOP=2.4): div left=ML, FitText leftCm=4.7 -> abs=5.6
  pdf.setFontSize(14 * PX_TO_PT);
  pdf.text(buildVendorText(form), ML + 4.7, 2.4 - Y_LIFT);

  // Terbilang
  // Garis 3 (LINE3_TOP=3.0): FitText leftCm=LINE3_SPAN_LEFT_CM(4.2) -> abs=5.1
  //   maxW = LINE23_WIDTH_CM(16.2) - SPAN_L(4.2) - SPAN_R(0.6) = 11.4
  // Garis 4 (LINE4_TOP=3.65): FitText leftCm=LINE4_SPAN_LEFT_CM(0.1) -> abs=1.0
  //   maxW = LINE4_WIDTH_CM(11.2) - SPAN_L(0.1) - SPAN_R(0.6) = 10.5
  const [t1, t2] = splitTerbilang(form.terbilang, 11.4, 10.5);
  pdf.text(t1, ML + 4.2, 3.0 - Y_LIFT);
  if (t2) pdf.text(t2, ML + 0.1, 3.65 - Y_LIFT);

  // Nominal: KOTAK_NOMINAL_TOP=3.3, h=0.5, left=12.7, padding=0.15 -> center y=3.55
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtNominal(form.nominal), 12.7 + 0.15, 3.3 + 0.25);
  pdf.setFont('helvetica', 'normal');
}

// ─── Peta Bank -> Drawer ───────────────────────────────────────────────────────
// Kalau nanti ada bank baru, cukup tambahkan satu entri di sini.
export const BANK_PDF_DRAWERS = {
  'Bank BCA':      drawBCACheck,
  'Bank Mandiri':  drawMandiriCheck,
  'Bank Sinarmas': drawSinarmasCheck,
  'Maybank':       drawMaybankCheck,
};
