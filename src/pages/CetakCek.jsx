import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaPrint,
  FaFileExport,
  FaTrash,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
} from "react-icons/fa";
import { generateCheckPdf, generatePrintHtml } from "../utils/checkPdfExport";
import CheckForm from "../components/cetakcek/CheckForm";
import MandiriCheck from "../components/cetakcek/MandiriCheck";
import BCACheck from "../components/cetakcek/BCACheck";
import SinarmasCheck from "../components/cetakcek/SinarmasCheck";
import MaybankCheck from "../components/cetakcek/MaybankCheck";
import { getChecks, createCheck, deleteCheck, exportCheck } from "../api/check";
import { getVendors } from "../api/vendor";

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

// Mapping nama bank frontend → nilai enum BankType backend
const BANK_TYPE_MAP = {
  "Bank Mandiri": "Mandiri",
  "Bank BCA": "BCA",
  "Bank Sinarmas": "Sinarmas",
  "Maybank": "Maybank",
};

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
  "Transfer Vendor": "bg-purple-100 text-purple-700",
};// Helper konversi angka ke terbilang bahasa Indonesia (presisi tanpa pembulatan)
function angkaKeTerbilang(angka) {
  if (angka === undefined || angka === null || angka === "") return "";
  const str = String(angka).trim();
  const num = Number(str);
  if (isNaN(num) || num === 0) return "";

  const bil = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  function convert(n) {
    n = Math.floor(Math.abs(n));
    if (n === 0) return "";
    if (n < 12) return bil[n];
    if (n < 20) return convert(n - 10) + " Belas";
    if (n < 100) return convert(Math.floor(n / 10)) + " Puluh" + (n % 10 !== 0 ? " " + convert(n % 10) : "");
    if (n < 200) return "Seratus" + (n - 100 !== 0 ? " " + convert(n - 100) : "");
    if (n < 1000) return convert(Math.floor(n / 100)) + " Ratus" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
    if (n < 2000) return "Seribu" + (n - 1000 !== 0 ? " " + convert(n - 1000) : "");
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Ribu" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Juta" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "");
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + " Milyar" + (n % 1000000000 !== 0 ? " " + convert(n % 1000000000) : "");
    return convert(Math.floor(n / 1000000000000)) + " Triliun" + (n % 1000000000000 !== 0 ? " " + convert(n % 1000000000000) : "");
  }

  const parts = str.split(".");
  const intPart = Math.floor(Math.abs(Number(parts[0])));
  let result = intPart === 0 ? "Nol" : convert(intPart);

  if (parts.length > 1 && parts[1]) {
    const decStr = parts[1];
    const decNum = Number(decStr);
    if (decNum > 0) {
      let decWords = [];
      for (let char of decStr) {
        const d = parseInt(char, 10);
        if (!isNaN(d)) {
          decWords.push(d === 0 ? "Nol" : bil[d]);
        }
      }
      result += " Koma " + decWords.join(" ");
    }
  }

  return (result + " Rupiah").replace(/\s+/g, " ").trim();
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Format nominal persis apa adanya tanpa pembulatan
function formatRupiah(amount) {
  if (amount === undefined || amount === null || amount === "") return "-";
  const str = String(amount).trim().replace(/,/g, ".");
  const dotIdx = str.indexOf(".");
  const intStr = dotIdx >= 0 ? str.slice(0, dotIdx) : str;
  const decStr = dotIdx >= 0 ? str.slice(dotIdx + 1) : "";
  const intFormatted = Number(intStr).toLocaleString("id-ID");
  if (decStr.length > 0) {
    return `Rp ${intFormatted},${decStr}`;
  }
  return `Rp ${intFormatted}`;
}

// Format nominal tampilan tanpa simbol Rp untuk preview cek
export function formatNominalDisplay(val) {
  if (val === undefined || val === null || val === "") return "";
  // Normalisasi: ganti koma desimal ke titik jika user input "25000000,75"
  const str = String(val).trim().replace(/,/g, ".");
  // Pisahkan bagian integer dan desimal berdasarkan titik pertama
  const dotIdx = str.indexOf(".");
  const intStr = dotIdx >= 0 ? str.slice(0, dotIdx) : str;
  const decStr = dotIdx >= 0 ? str.slice(dotIdx + 1) : "";
  const intFormatted = Number(intStr).toLocaleString("id-ID");
  // Tampilkan desimal hanya jika ada digit desimal yang tidak kosong
  if (decStr.length > 0) {
    return `${intFormatted},${decStr}`;
  }
  return intFormatted;
}

const initialForm = {
  id: null,
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

// Konversi list history -> file Excel (.xlsx) client-side fallback.
function exportToClientExcel(rows) {
  const header = ["Tanggal", "Bank", "Nomor Cek", "Nominal", "Vendor", "Nomor Rekening", "Status"];
  let tableHtml = `<table border="1"><thead><tr>`;
  header.forEach((h) => {
    tableHtml += `<th style="background-color:#f3f4f6;font-weight:bold;">${h}</th>`;
  });
  tableHtml += `</tr></thead><tbody>`;
  rows.forEach((r) => {
    tableHtml += `<tr>
      <td>${r.tanggal || ""}</td>
      <td>${r.bank || ""}</td>
      <td>${r.nomorCek || "-"}</td>
      <td>${r.nominal || 0}</td>
      <td>${r.vendor || ""}</td>
      <td>${r.nomorRekening || "-"}</td>
      <td>${r.jenisCek || ""}</td>
    </tr>`;
  });
  tableHtml += `</tbody></table>`;

  const excelFile = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>History Cek</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>${tableHtml}</body></html>`;

  const blob = new Blob([excelFile], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `export_historycek.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CetakCek() {
  // ================= FORM INFORMASI CEK =================
  const [form, setForm] = useState(initialForm);
  // ===========================================
  // State autocomplete vendor
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [bankPenerimaSuggestions, setBankPenerimaSuggestions] = useState([]);
  const [nomorRekeningSuggestions, setNomorRekeningSuggestions] = useState([]);
  // Ref ke elemen preview cek — dipakai oleh handleDownload() untuk
  // menangkap seluruh tampilan komponen cek (garis + label + teks).
  const checkPreviewRef = useRef(null);

  // Section Refs untuk fitur Auto Scroll
  const formRef = useRef(null);
  const previewContainerRef = useRef(null);
  const historyRef = useRef(null);

  // ================= HISTORY CETAK CEK =================
  const [history, setHistory] = useState([]);

  // Fetch history cek dari backend
  const fetchHistory = async () => {
    try {
      const result = await getChecks();
      setHistory(result.data || []);
    } catch (err) {
      console.error("Gagal fetch history cek:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter tabel history
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBank, setFilterBank] = useState("");

  // Pagination tabel history
  const [page, setPage] = useState(1);
  const perPage = 5;

  // Modal konfirmasi hapus history — pola batch (sama seperti Advance & CashOpname)
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

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

  // ================= HANDLE VENDOR SEARCH =================
  const handleVendorChange = async (keyword) => {
    setForm(prev => ({ ...prev, vendor: keyword }));

    if (!keyword) {
      setVendorSuggestions([]);
      return;
    }

    try {
      const vendors = await getVendors(keyword);
      setVendorSuggestions(vendors);
    } catch (err) {
      console.error(err);
      setVendorSuggestions([]);
    }
  };

  // ================= HANDLE VENDOR SELECT =================
  const handleVendorSelect = (vendorObj) => {
    setForm(prev => {
      const updated = { ...prev, vendor: vendorObj.vendor_name };
      if (prev.jenisCek === "Transfer") {
        updated.bankPenerima = vendorObj.bank_name || "";
        updated.nomorRekening = vendorObj.bank_account_no || "";
      }
      return updated;
    });
    setVendorSuggestions([]);
  };

  const handleJenisCekChange = (jenis) => {
    setForm((prev) => ({
      ...prev,
      jenisCek: jenis,
      // Bersihkan field Transfer saat beralih ke Tarik Tunai
      ...(jenis === "Tarik Tunai" ? { bankPenerima: "", nomorRekening: "" } : {}),
    }));
  };

  // State menyimpan data form terakhir yang disimpan/dicetak
  const [lastSavedForm, setLastSavedForm] = useState(null);

  // activePreviewForm: gunakan form saat diisi (form.bank ada), atau lastSavedForm saat form telah di-reset
  const activePreviewForm = form.bank ? form : (lastSavedForm || form);

  // Komponen bank yang aktif sesuai pilihan activePreviewForm.bank, untuk preview
  const SelectedCheck = activePreviewForm.bank ? BANK_COMPONENTS[activePreviewForm.bank] : null;

  // Validasi field wajib, dipakai bareng oleh Simpan & Cetak
  const validateForm = (formData = form) => {
    if (!formData.bank) {
      showToast("Silakan pilih Bank terlebih dahulu.");
      return false;
    }
    if (!formData.nomorCek) {
      showToast("Silakan isi Nomor Cek.");
      return false;
    }
    if (!formData.vendor) {
      showToast("Silakan isi atau pilih Nama Vendor / PT.");
      return false;
    }
    if (formData.jenisCek === "Transfer") {
      if (!formData.bankPenerima || !formData.nomorRekening) {
        showToast("Untuk transaksi Transfer, Nama Bank Penerima dan Nomor Rekening wajib diisi.");
        return false;
      }
    }
    if (!formData.nominal || Number(formData.nominal) <= 0) {
      showToast("Masukkan Jumlah Nominal yang valid.");
      return false;
    }
    return true;
  };

  // Helper simpan ke backend
  const saveCheckToBackend = async (formData) => {
    const bankType = BANK_TYPE_MAP[formData.bank] || formData.bank;
    const transactionType = formData.jenisCek === "Transfer" ? "Transfer Vendor" : "Tarik Tunai";

    const payload = {
      id: formData.id || null,
      transaction_date: formData.tanggal,
      check_number: formData.nomorCek,
      transaction_type: transactionType,
      bank_type: bankType,
      vendor_name: formData.vendor,
      amount: Number(formData.nominal),
      vendor_bank: formData.jenisCek === "Transfer" ? formData.bankPenerima : null,
      vendor_account_number: formData.jenisCek === "Transfer" ? formData.nomorRekening : null,
    };

    try {
      const res = await createCheck(payload);
      return res;
    } catch (err) {
      const msg = err?.response?.data?.detail || "Gagal menyimpan data cek.";
      showToast(msg);
      return null;
    }
  };

  // ================= AKSI SIMPAN KE HISTORY =================
  const handleSimpan = async () => {
    if (!validateForm()) return;

    const res = await saveCheckToBackend(form);
    if (res) {
      const alertMsg = res.message || (res.is_update ? "Data cek berhasil diperbarui" : "Data cek berhasil disimpan");
      showToast(alertMsg);
      setLastSavedForm(form);
      setForm(initialForm);
      await fetchHistory();

      // Layar otomatis mengarah ke table history setelah simpan
      if (historyRef.current) {
        historyRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Helper normalisasi nama bank agar sesuai dengan value <select> di CheckForm ("Bank Mandiri", "Bank BCA", "Bank Sinarmas", "Maybank")
  function normalizeBankForForm(bankStr, bankTypeStr) {
    const b = (bankStr || bankTypeStr || "").trim();
    if (!b) return "";
    const lower = b.toLowerCase();
    if (lower.includes("mandiri")) return "Bank Mandiri";
    if (lower.includes("bca")) return "Bank BCA";
    if (lower.includes("sinarmas")) return "Bank Sinarmas";
    if (lower.includes("maybank")) return "Maybank";
    return b;
  }

  // ================= AKSI KLIK BARIS HISTORY (PREVIEW TANPA EDIT) =================
  const handleRowClick = (item) => {
    let jenis = "Tarik Tunai";
    if (item.jenisCek === "Transfer Vendor" || item.jenisCek === "Transfer" || item.transaction_type === "Transfer Vendor") {
      jenis = "Transfer";
    }

    const bankName = normalizeBankForForm(item.bank, item.bank_type);

    const rowFormData = {
      id: item.id || null,
      bank: bankName,
      jenisCek: jenis,
      tanggal: item.tanggal || item.transaction_date || new Date().toISOString().split("T")[0],
      mataUang: "IDR",
      nomorCek: item.nomorCek || item.check_number || "",
      vendor: item.vendor || item.vendor_name || "",
      bankPenerima: item.vendor_bank || "",
      nomorRekening: item.nomorRekening || item.vendor_account_number || "",
      nominal: item.nominal !== undefined && item.nominal !== null ? String(item.nominal) : (item.amount !== undefined && item.amount !== null ? String(item.amount) : ""),
      terbilang: angkaKeTerbilang(item.nominal || item.amount || 0),
      referensi: "",
    };

    setLastSavedForm(rowFormData);
    setForm(initialForm); // Form tetap bersih (tanpa edit mode, id=null)

    // Scroll ke bagian preview layout cek
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ================= AKSI EDIT DARI HISTORY (SCROLL KE ATAS BAGIAN FORM) =================
  const handleEditRow = (item) => {
    let jenis = "Tarik Tunai";
    if (item.jenisCek === "Transfer Vendor" || item.jenisCek === "Transfer" || item.transaction_type === "Transfer Vendor") {
      jenis = "Transfer";
    }

    const bankName = normalizeBankForForm(item.bank, item.bank_type);

    setForm({
      id: item.id || null,
      bank: bankName,
      jenisCek: jenis,
      tanggal: item.tanggal || item.transaction_date || new Date().toISOString().split("T")[0],
      mataUang: "IDR",
      nomorCek: item.nomorCek || item.check_number || "",
      vendor: item.vendor || item.vendor_name || "",
      bankPenerima: item.vendor_bank || "",
      nomorRekening: item.nomorRekening || item.vendor_account_number || "",
      nominal: item.nominal !== undefined && item.nominal !== null ? String(item.nominal) : (item.amount !== undefined && item.amount !== null ? String(item.amount) : ""),
      terbilang: angkaKeTerbilang(item.nominal || item.amount || 0),
      referensi: "",
    });

    setLastSavedForm(null);

    // Layar otomatis scroll ke atas (bagian form)
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
    setDateFrom("");
    setDateTo("");
    setFilterBank("");
  };

  // ===== eksekusi hapus batch =====
  const handleDeleteBatchConfirm = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await Promise.all([...selectedIds].map((id) => deleteCheck(id)));
      setHistory((prev) => prev.filter((h) => !selectedIds.has(h.id)));
      setDeleteBatchOpen(false);
      setDeleteMode(false);
      setSelectedIds(new Set());

      // Reset filters to show remaining data
      setDateFrom("");
      setDateTo("");
      setFilterBank("");

      showToast("Data cek terpilih berhasil dihapus.");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Gagal menghapus data cek.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
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

  // ================= EXPORT HISTORY TO EXCEL =================
  const handleExportExcel = async () => {
    try {
      const blob = await exportCheck(dateFrom, dateTo, filterBank);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "export_historycek.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Backend Excel export failed, using fallback client export:", err);
      if (filteredHistory.length === 0) {
        showToast(err?.response?.data?.detail || "Tidak ada data history cek untuk di-export.");
        return;
      }
      exportToClientExcel(filteredHistory);
    }
  };

  // ================= AKSI CETAK LANGSUNG =================
  const handleCetak = async () => {
    let targetForm = form;

    if (!form.bank && lastSavedForm && lastSavedForm.bank) {
      targetForm = lastSavedForm;
    } else {
      if (!validateForm()) return;

      const currentForm = { ...form };
      const res = await saveCheckToBackend(currentForm);
      if (res) {
        setLastSavedForm(currentForm);
        setForm(initialForm);
        await fetchHistory();
      } else {
        return;
      }
      targetForm = currentForm;
    }

    let htmlContent;
    try {
      htmlContent = generatePrintHtml(targetForm);
    } catch (error) {
      console.error("Gagal generate data cetak:", error);
      showToast(`Terjadi kesalahan saat memproses cetak: ${error.message || error}`);
      return;
    }

    const printWin = window.open("", "_blank", "width=800,height=600");
    if (!printWin) {
      showToast(
        "Popup diblokir oleh browser. Izinkan popup untuk halaman ini, lalu coba lagi."
      );
      return;
    }
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // ================= AKSI DOWNLOAD =================
  const handleDownload = async () => {
    let targetForm = form;
    if (!form.bank && lastSavedForm && lastSavedForm.bank) {
      targetForm = lastSavedForm;
    } else {
      if (!validateForm()) return;

      const currentForm = { ...form };
      const res = await saveCheckToBackend(currentForm);
      if (res) {
        setLastSavedForm(currentForm);
        setForm(initialForm);
        await fetchHistory();
      } else {
        return;
      }
      targetForm = currentForm;
    }

    try {
      const pdf = generateCheckPdf(targetForm);
      pdf.save(`cek-${targetForm.bank || "preview"}-${targetForm.nomorCek || Date.now()}.pdf`);
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      showToast(`Terjadi kesalahan saat memproses PDF: ${error.message || error}`);
    }
  };

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {successMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translate(-50%, 0)",
            zIndex: 9999,
            background: "#ecfdf5",
            border: "1.5px solid #6ee7b7",
            color: "#047857",
            borderRadius: "10px",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
            animation: "toastIn 0.25s ease",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* ================= 1. INFORMASI CEK ================= */}
      <div ref={formRef}>
        <CheckForm
          form={form}
          onChange={handleChange}
          onVendorChange={handleVendorChange}
          onVendorSelect={handleVendorSelect}
          onJenisCekChange={handleJenisCekChange}
          onSimpan={handleSimpan}
          vendorSuggestions={vendorSuggestions}
          bankPenerimaSuggestions={bankPenerimaSuggestions}
          nomorRekeningSuggestions={nomorRekeningSuggestions}
        />
      </div>

      {/* ================= 2. PREVIEW CETAK CEK ================= */}
      <div ref={previewContainerRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ margin: "20px", padding: "20px" }}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between" style={{ marginBottom: "10px" }}>
          <h2 className="font-bold text-gray-600">Preview Layout Cek Fisik</h2>
          {activePreviewForm.bank && (
            <span className="text-xs text-gray-500">
              Format: <strong className="text-gray-700">{activePreviewForm.bank}</strong>
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
                Silakan pilih Bank pada form di atas atau klik baris history untuk menampilkan cetak cek
              </p>
            </div>
          ) : (
            <div ref={checkPreviewRef}>
              <SelectedCheck form={activePreviewForm} />
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
        ref={historyRef}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
        style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}
      >
        <div className="mb-4" style={{ marginLeft: "20px", marginRight: "20px", marginTop: "20px" }}>
          <h2 className="font-bold text-gray-600">History Cetak Cek</h2>
          <p className="text-xs text-gray-500 mt-0.5"></p>
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

          {/* Reset Filter */}
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setFilterBank("");
              setPage(1);
            }}
            className="border border-gray-400 rounded-lg hover:bg-gray-100 transition whitespace-nowrap text-sm"
            style={{ padding: "1px 12px" }}
          >
            Reset
          </button>

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

          <div className="flex items-center gap-2">
            {/* Mode hapus TIDAK aktif → tombol Export + trash */}
            {!deleteMode && (
              <>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{ padding: "5px 10px" }}
                >
                  <FaFileExport className="text-xs" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={handleEnterDeleteMode}
                  title="Pilih data untuk dihapus"
                  className="flex items-center justify-center bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-lg transition-colors"
                  style={{ padding: "8px 10px" }}
                >
                  <FaTrash />
                </button>
              </>
            )}

            {/* Mode hapus AKTIF → Batal + Hapus (N) */}
            {deleteMode && (
              <>
                <button
                  type="button"
                  onClick={handleExitDeleteMode}
                  className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
                  style={{ padding: "5px 10px" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteError(""); setDeleteBatchOpen(true); }}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  style={{ padding: "5px 10px" }}
                  title={selectedIds.size === 0 ? "Pilih data terlebih dahulu" : `Hapus ${selectedIds.size} data terpilih`}
                >
                  <FaTrash className="text-xs" />
                  Hapus {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto" style={{ marginLeft: "10px", marginRight: "10px" }}>
          <table className="w-full text-sm border border-gray-300">
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
                {deleteMode && (
                  <th className="p-3 font-medium border border-gray-300 text-center"></th>
                )}
              </tr>
            </thead>

            {currentRows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={deleteMode ? 9 : 8} className="p-8 text-center text-gray-400 border border-gray-300">
                    Belum ada data history cek.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {currentRows.map((item) => {
                  const isSelected = deleteMode && selectedIds.has(item.id);
                  const isEditing = !deleteMode && form.id === item.id;
                  const isPreviewSelected = !deleteMode && activePreviewForm?.nomorCek && activePreviewForm.nomorCek === (item.nomorCek || item.check_number);
                  const isActive = isEditing || isPreviewSelected;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => deleteMode ? toggleSelectRow(item.id) : handleRowClick(item)}
                      style={{
                        cursor: "pointer",
                        background: isActive
                          ? "#f3f4f6"
                          : isSelected
                            ? "#fef2f2"
                            : undefined,
                        outline: isActive ? "2px solid #9ca3af" : undefined,
                        outlineOffset: "-2px",
                      }}
                      className={`cursor-pointer transition-colors ${!isActive && !isSelected ? "hover:bg-gray-50" : ""}`}
                      title={deleteMode ? "Klik untuk pilih/batal pilih" : "Klik untuk lihat preview & cetak tanpa edit"}
                    >
                      <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{item.bank}</td>
                      <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{item.nomorCek || "-"}</td>
                      <td className="p-3 text-gray-700 whitespace-nowrap border border-gray-300 text-right" style={{ paddingRight: "10px" }}>
                        {formatRupiah(item.nominal !== undefined && item.nominal !== null ? item.nominal : item.amount)}
                      </td>
                      <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{item.vendor}</td>
                      <td className="p-3 text-gray-700 border border-gray-300 text-left" style={{ paddingLeft: "10px" }}>{item.nomorRekening || "-"}</td>
                      <td className="p-3 border border-gray-300" style={{ paddingLeft: "10px" }}>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${STATUS_STYLE[item.jenisCek]}`} style={{ paddingLeft: "5px", paddingRight: "5px" }}
                        >
                          {item.jenisCek}
                        </span>
                      </td>
                      <td
                        className="p-3 border border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRow(item);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md"
                            style={{ padding: "5px 5px" }}
                            title="Edit / Scroll ke Form"
                          >
                            <FaEdit className="text-xs" />
                          </button>
                        </div>
                      </td>
                      {/* Kolom checkbox seleksi hapus — hanya muncul saat deleteMode */}
                      {deleteMode && (
                        <td className="p-3 border border-gray-300 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelectRow(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 accent-red-600 cursor-pointer"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
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

        {/* ================= MODAL KONFIRMASI HAPUS BATCH ================= */}
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
                background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "380px", width: "100%",
                boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              }}
            >
              <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                Hapus Data Terpilih?
              </h4>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                <strong>{selectedIds.size} data</strong> cek yang dipilih akan dihapus secara permanen.
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
                    border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 20px",
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
                    border: "none", borderRadius: "10px", padding: "8px 20px",
                    fontSize: "13px", fontWeight: 600, color: "#fff",
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
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
    </div>
  );
}