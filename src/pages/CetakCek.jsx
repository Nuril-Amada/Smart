import { useMemo, useRef, useState } from "react";
import {
  FaPrint,
  FaFileExport,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
} from "react-icons/fa";
import { generateCheckPdf } from "../utils/checkPdfExport";
import CheckForm from "../components/cetakcek/CheckForm";
import MandiriCheck from "../components/cetakcek/MandiriCheck";
import BCACheck from "../components/cetakcek/BCACheck";
import SinarmasCheck from "../components/cetakcek/SinarmasCheck";
import MaybankCheck from "../components/cetakcek/MaybankCheck";

// Peta nama bank (sesuai value pada <select> di CheckForm) ke komponennya
const BANK_COMPONENTS = {
  "Bank Mandiri": MandiriCheck,
  Mandiri: MandiriCheck,
  "Bank BCA": BCACheck,
  BCA: BCACheck,
  "Bank Sinarmas": SinarmasCheck,
  Sinarmas: SinarmasCheck,
  Maybank: MaybankCheck,
  "Maybank Indonesia": MaybankCheck,
  "Bank Maybank": MaybankCheck,
};

const BANK_OPTIONS = ["Bank Mandiri", "Bank BCA", "Bank Sinarmas", "Maybank"];

// Peta nama bank ke konfigurasi layout (widthCm x heightCm) masing-masing.
// Ukuran PDF otomatis mengikuti layout masing-masing bank yang dipilih user.
const BANK_LAYOUTS = {
  "Bank Mandiri": { widthCm: 17.8, heightCm: 7 },
  Mandiri: { widthCm: 17.8, heightCm: 7 },
  "Bank BCA": { widthCm: 17.7, heightCm: 7 },
  BCA: { widthCm: 17.7, heightCm: 7 },
  "Bank Sinarmas": { widthCm: 17.7, heightCm: 7 },
  Sinarmas: { widthCm: 17.7, heightCm: 7 },
  Maybank: { widthCm: 17.8, heightCm: 7 },
  "Maybank Indonesia": { widthCm: 17.8, heightCm: 7 },
  "Bank Maybank": { widthCm: 17.8, heightCm: 7 },
};

// STYLE badge status, sama pola dengan SOURCE_STYLE di tabel Settlement
const STATUS_STYLE = {
  "Tarik Tunai": "bg-green-100 text-green-700",
  Transfer: "bg-purple-100 text-purple-700",
};

// Helper konversi angka ke terbilang bahasa Indonesia
function angkaKeTerbilang(angka) {
  const bil = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const num = Math.floor(Math.abs(Number(angka)));
  if (isNaN(num) || num === 0) return "";

  function convert(n) {
    if (n < 12) return bil[n];
    if (n < 20) return convert(n - 10) + " Belas";
    if (n < 100) return convert(Math.floor(n / 10)) + " Puluh " + convert(n % 10);
    if (n < 200) return "Seratus " + convert(n - 100);
    if (n < 1000) return convert(Math.floor(n / 100)) + " Ratus " + convert(n % 100);
    if (n < 2000) return "Seribu " + convert(n - 1000);
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Ribu " + convert(n % 1000);
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Juta " + convert(n % 1000000);
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + " Milyar " + convert(n % 1000000000);
    return convert(Math.floor(n / 1000000000000)) + " Triliun " + convert(n % 1000000000000);
  }

  return (convert(num) + " Rupiah").replace(/\s+/g, " ").trim();
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));
}

// Konversi list history -> file CSV lalu trigger download di browser.
function exportToCSV(rows) {
  const header = ["Tanggal", "Nomor Cek", "Vendor", "Nominal", "Bank", "Rekening", "Status"];
  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        escape(r.tanggal),
        escape(r.nomorCek),
        escape(r.vendor),
        escape(r.nominal),
        escape(r.bank),
        escape(r.nomorRekening || "-"),
        escape(r.jenisCek),
      ].join(",")
    );
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `history-cetak-cek-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


const initialForm = {
  bank: "",
  jenisCek: "Tarik Tunai", // "Tarik Tunai" | "Transfer"
  tanggal: new Date().toISOString().split("T")[0],
  mataUang: "IDR",
  nomorCek: "",
  vendor: "",
  bankPenerima: "",
  nomorRekening: "",
  nominal: "",
  terbilang: "",
  referensi: "",
};

export default function CetakCek() {
  // ================= FORM INFORMASI CEK =================
  const [form, setForm] = useState(initialForm);

  // Ref ke elemen preview cek — dipakai oleh handleDownload() untuk
  // menangkap seluruh tampilan komponen cek (garis + label + teks).
  const checkPreviewRef = useRef(null);

  // ================= HISTORY CETAK CEK =================
  // Catatan: nantinya di-fetch dari backend (mis. lewat useEffect saat mount)
  // dan handleSimpan/handleDeleteConfirm di bawah tinggal diganti jadi
  // pemanggilan API.
  const [history, setHistory] = useState([]);

  // Filter tabel history
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBank, setFilterBank] = useState("");

  // Pagination tabel history
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modal konfirmasi hapus history (pola sama seperti tabel Settlement)
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Catatan: saran (suggestions) untuk Nama Vendor, Nama Bank Penerima,
  // dan Nomor Rekening nantinya diambil dari database backend. Untuk
  // sekarang masih kosong, tinggal diisi via API saat backend sudah siap
  // (mis. lewat useEffect yang memanggil endpoint pencarian).
  const [vendorSuggestions] = useState([]);
  const [bankPenerimaSuggestions] = useState([]);
  const [nomorRekeningSuggestions] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Otomatis terbilang jika nominal berubah
      if (name === "nominal") {
        updated.terbilang = angkaKeTerbilang(value);
      }
      return updated;
    });
  };

  const handleJenisCekChange = (jenis) => {
    setForm((prev) => ({ ...prev, jenisCek: jenis }));
  };

  // Komponen bank yang aktif sesuai pilihan form.bank, untuk preview
  const SelectedCheck = form.bank ? BANK_COMPONENTS[form.bank] : null;

  // Validasi field wajib, dipakai bareng oleh Simpan & Cetak
  const validateForm = () => {
    if (!form.bank) {
      alert("Silakan pilih Bank terlebih dahulu.");
      return false;
    }
    if (!form.nomorCek) {
      alert("Silakan isi Nomor Cek.");
      return false;
    }
    if (!form.vendor) {
      alert("Silakan isi atau pilih Nama Vendor / PT.");
      return false;
    }
    if (form.jenisCek === "Transfer") {
      if (!form.bankPenerima || !form.nomorRekening) {
        alert("Untuk transaksi Transfer, Nama Bank Penerima dan Nomor Rekening wajib diisi.");
        return false;
      }
    }
    if (!form.nominal || Number(form.nominal) <= 0) {
      alert("Masukkan Jumlah Nominal yang valid.");
      return false;
    }
    return true;
  };

  // ================= AKSI SIMPAN KE HISTORY =================
  const handleSimpan = () => {
    if (!validateForm()) return;

    const entry = {
      id: Date.now(),
      tanggal: form.tanggal,
      nomorCek: form.nomorCek,
      vendor: form.vendor,
      nominal: form.nominal,
      bank: form.bank,
      nomorRekening: form.jenisCek === "Transfer" ? form.nomorRekening : "",
      jenisCek: form.jenisCek,
    };

    // Nanti di sini tinggal panggil API backend untuk menyimpan entry ini.
    setHistory((prev) => [entry, ...prev]);

    alert("Data cek berhasil disimpan ke history.");
    setForm(initialForm);
  };

  // ================= AKSI HAPUS HISTORY (dengan modal konfirmasi) =================
  const handleDeleteClick = (item) => {
    setRowToDelete(item);
  };

  const handleDeleteCancel = () => {
    setRowToDelete(null);
  };

  const handleDeleteConfirm = () => {
    if (!rowToDelete) return;
    setDeleting(true);

    // Nanti di sini tinggal panggil API backend untuk menghapus data ini.
    setHistory((prev) => prev.filter((h) => h.id !== rowToDelete.id));

    setDeleting(false);
    setRowToDelete(null);
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (dateFrom && item.tanggal < dateFrom) return false;
      if (dateTo && item.tanggal > dateTo) return false;
      if (filterBank && item.bank !== filterBank) return false;
      return true;
    });
  }, [history, dateFrom, dateTo, filterBank]);

  // Pagination
  const total = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentRows = filteredHistory.slice((page - 1) * perPage, page * perPage);
  const startEntry = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, total);
  const visiblePages = [];
  for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

  // ================= AKSI CETAK LANGSUNG =================
  const handleCetak = () => {
    if (!validateForm()) return;

    const confirmPrint = window.confirm(
      `Cetak cek (${form.jenisCek}) untuk ${form.vendor} sebesar Rp ${Number(form.nominal).toLocaleString("id-ID")} sekarang?`
    );
    if (!confirmPrint) return;

    // Nanti di sini tinggal panggil API backend untuk kirim data cek
    // sekaligus memicu proses cetak fisik (mis. lewat printer driver / PDF).
    window.print();

    alert("Cek berhasil dicetak.");
    setForm(initialForm);
  };

  // ================= AKSI DOWNLOAD =================
  const handleDownload = () => {
    if (!validateForm()) return;

    try {
      const pdf = generateCheckPdf(form);
      pdf.save(`cek-${form.bank || "preview"}-${form.nomorCek || Date.now()}.pdf`);
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert(`Terjadi kesalahan saat memproses PDF: ${error.message || error}`);
    }
  };

  return (
    <div className="space-y-8">

      {/* ================= 1. INFORMASI CEK ================= */}
      <CheckForm
        form={form}
        onChange={handleChange}
        onJenisCekChange={handleJenisCekChange}
        onSimpan={handleSimpan}
        vendorSuggestions={vendorSuggestions}
        bankPenerimaSuggestions={bankPenerimaSuggestions}
        nomorRekeningSuggestions={nomorRekeningSuggestions}
      />

      {/* ================= 2. PREVIEW CETAK CEK ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ margin: "20px", padding: "20px" }}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between" style={{ marginBottom: "10px" }}>
          <h2 className="font-bold text-gray-600">Preview Layout Cek Fisik</h2>
          {form.bank && (
            <span className="text-xs text-gray-500">
              Format: <strong className="text-gray-700">{form.bank}</strong>
            </span>
          )}
        </div>
        <div className="p-6 flex justify-center overflow-x-auto bg-gray-50/50">
          {!SelectedCheck ? (
            <div
              className="rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center p-8 text-center"
              style={{ width: "21cm", height: "9.5cm" }}
            >
              <p className="text-gray-400 text-sm font-medium">
                Silakan pilih Bank pada form di atas untuk menampilkan cetak cek
              </p>
            </div>
          ) : (
            <div ref={checkPreviewRef}>
              <SelectedCheck form={form} />
            </div>
          )}
        </div>

        {/* Tombol Download & Cetak Cek — di dalam container preview, pojok kanan bawah */}
        <div className="flex justify-end gap-2 px-6 pb-6" style={{ marginTop: "20px" }}>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition shadow-sm"
            style={{ padding: "5px 10px" }}
          >
            <FaDownload />
            Download
          </button>
          <button
            type="button"
            onClick={handleCetak}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            style={{ padding: "5px 10px" }}
          >
            <FaPrint />
            Cetak Cek
          </button>
        </div>
      </div>

      {/* ================= 3. HISTORY CETAK CEK ================= */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
        style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}
      >
        <div className="mb-4" style={{ marginLeft: "20px", marginRight: "20px", marginTop: "20px" }}>
          <h2 className="font-bold text-gray-600">History Cetak Cek</h2>
          <p className="text-xs text-gray-500 mt-0.5">Daftar cek yang sudah pernah disimpan / dicetak</p>
        </div>

        {/* ================= FILTER ================= */}
        <div className="flex flex-wrap items-end gap-4 mb-5" style={{ marginLeft: "20px", marginRight: "20px", marginTop: "10px", marginBottom: "10px" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
              style={{ padding: "1px 5px" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
              style={{ padding: "1px 5px" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Filter Bank</label>
            <select
              value={filterBank}
              onChange={(e) => {
                setFilterBank(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
              style={{ padding: "1px 5px" }}
            >
              <option value="">Semua Bank</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => exportToCSV(filteredHistory)}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ padding: "5px 10px" }}
          >
            <FaFileExport className="text-xs" />
            Export
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
          <table className="w-full text-sm border border-gray-300 text-center">
            <thead>
              <tr className="text-xs uppercase tracking-wide bg-gray-50">
                <th className="p-3 font-medium border border-gray-300 text-center">Tanggal</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Bank</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Nomor Cek</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Nominal</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Vendor</th>
                <th className="p-3 font-medium border border-gray-300 text-center">No Rek</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Status</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Aksi</th>
              </tr>
            </thead>

            {currentRows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 border border-gray-300">
                    Belum ada data history cek.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {currentRows.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                      {formatDate(item.tanggal)}
                    </td>
                    <td className="p-3 text-gray-700 border border-gray-300">{item.bank}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{item.nomorCek || "-"}</td>
                    <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300">
                      {formatRupiah(item.nominal)}
                    </td>
                    <td className="p-3 text-gray-700 border border-gray-300">{item.vendor}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{item.nomorRekening || "-"}</td>
                    <td className="p-3 border border-gray-300">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${STATUS_STYLE[item.jenisCek]}`}
                      >
                        {item.jenisCek}
                      </span>
                    </td>
                    <td className="p-3 border border-gray-300">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md"
                          style={{ padding: "5px 5px" }}
                          title="Hapus"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        <div
          className="flex items-center justify-between mt-4 text-sm text-gray-500"
          style={{
            marginLeft: "10px",
            marginRight: "10px",
            marginTop: "10px",
            marginBottom: "10px",
          }}
        >
          <span>
            Showing {startEntry} to {endEntry} of {total} entries
          </span>

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
                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${page === p
                  ? "bg-gray-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
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

        {/* ================= MODAL KONFIRMASI HAPUS ================= */}
        {rowToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-none shadow-lg w-full max-w-sm">
              <div className="px-8 py-7" style={{ paddingLeft: "20px", paddingRight: "20px", marginTop: "15px" }}>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Hapus Data</h3>
                <p className="text-sm text-gray-500">
                  Apakah anda yakin ingin menghapus data cek nomor{" "}
                  <span className="font-medium text-gray-700">{rowToDelete.nomorCek || "-"}</span> atas nama{" "}
                  <span className="font-medium text-gray-700">{rowToDelete.vendor}</span>?
                </p>
              </div>

              <div
                className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100"
                style={{ marginBottom: "10px", marginRight: "10px", marginTop: "10px" }}
              >
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="border border-gray-300 rounded-lg text-sm px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  style={{ padding: "5px 7px" }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-sm px-4 py-2"
                  style={{ padding: "5px 7px" }}
                >
                  {deleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}