import { useState, useEffect } from "react";
import { FaPrint, FaRedo, FaBan, FaFileSignature, FaMoneyBillWave, FaExchangeAlt } from "react-icons/fa";

// ======================================================================
// KONFIGURASI TEMPLATE CEK PER BANK
// ======================================================================
const BANK_TEMPLATES = {
  "Bank Mandiri": {
    label: "Bank Mandiri (001)",
    branch: "Cab. Jakarta Thamrin",
    widthCm: 21,
    heightCm: 10,
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-200",
    headerText: "text-sky-900",
    signaturePosition: "right",
  },
  "Bank Sinarmas": {
    label: "Bank Sinarmas",
    branch: "Cab. Jakarta Sudirman",
    widthCm: 21,
    heightCm: 9.5,
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    headerText: "text-amber-900",
    signaturePosition: "left",
  },
  Maybank: {
    label: "Maybank Indonesia",
    branch: "Cab. Jakarta Senayan",
    widthCm: 21,
    heightCm: 10.5,
    accentBg: "bg-yellow-50",
    accentBorder: "border-yellow-300",
    headerText: "text-yellow-900",
    signaturePosition: "right",
  },
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

// Counter global sederhana untuk nomor cek otomatis (pengganti input manual)
let cekCounter = 21;

// Data awal Daftar Cetak Cek (dummy)
const initialDataCek = [
  {
    id: 1,
    nomor: "CK-000001",
    jenisCek: "Tarik Tunai",
    tanggal: "2025-07-01",
    vendor: "PT ABC Indonesia",
    bank: "Bank Mandiri",
    bankPenerima: "-",
    nomorRekening: "-",
    nominal: "25.000.000",
    terbilang: "Dua Puluh Lima Juta Rupiah",
    status: "Belum Dicetak",
  },
  {
    id: 2,
    nomor: "CK-000002",
    jenisCek: "Transfer",
    tanggal: "2025-07-02",
    vendor: "PT Sinar Jaya",
    bank: "Bank Sinarmas",
    bankPenerima: "BCA",
    nomorRekening: "8830129481",
    nominal: "10.500.000",
    terbilang: "Sepuluh Juta Lima Ratus Ribu Rupiah",
    status: "Sudah Dicetak",
  },
  {
    id: 3,
    nomor: "CK-000003",
    jenisCek: "Tarik Tunai",
    tanggal: "2025-07-03",
    vendor: "PT Maju Bersama",
    bank: "Maybank",
    bankPenerima: "-",
    nomorRekening: "-",
    nominal: "45.000.000",
    terbilang: "Empat Puluh Lima Juta Rupiah",
    status: "Belum Dicetak",
  },
];

const initialForm = {
  bank: "",
  jenisCek: "Tarik Tunai", // "Tarik Tunai" | "Transfer"
  tanggal: new Date().toISOString().split("T")[0],
  mataUang: "IDR",
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

  // Template preview aktif berdasarkan bank yang dipilih di form
  const activeTemplate = BANK_TEMPLATES[form.bank] || null;

  // ================= DAFTAR CETAK CEK =================
  const [dataCek, setDataCek] = useState(initialDataCek);
  const [selectedId, setSelectedId] = useState(null);

  const selected = dataCek.find((item) => item.id === selectedId) || null;

  // ================= AKSI CEK =================
  const handleCetakCek = () => {
    if (!form.bank) {
      alert("Silakan pilih Bank terlebih dahulu.");
      return;
    }
    if (!form.vendor) {
      alert("Silakan isi atau pilih Nama Vendor / PT.");
      return;
    }
    if (form.jenisCek === "Transfer") {
      if (!form.bankPenerima || !form.nomorRekening) {
        alert("Untuk transaksi Transfer, Nama Bank Penerima dan Nomor Rekening wajib diisi.");
        return;
      }
    }
    if (!form.nominal || Number(form.nominal) <= 0) {
      alert("Masukkan Jumlah Nominal yang valid.");
      return;
    }

    const nomorCekOtomatis = String(cekCounter++).padStart(6, "0");

    const newItem = {
      id: Date.now(),
      nomor: `CK-${nomorCekOtomatis}`,
      jenisCek: form.jenisCek,
      tanggal: form.tanggal,
      vendor: form.vendor,
      bank: form.bank,
      bankPenerima: form.jenisCek === "Transfer" ? form.bankPenerima : "-",
      nomorRekening: form.jenisCek === "Transfer" ? form.nomorRekening : "-",
      nominal: Number(form.nominal).toLocaleString("id-ID"),
      terbilang: form.terbilang || angkaKeTerbilang(form.nominal),
      status: "Belum Dicetak",
    };

    setDataCek((prev) => [newItem, ...prev]);
    alert(`Cek (${form.jenisCek}) berhasil disimpan ke daftar. Pilih di tabel di bawah untuk Cetak Fisik.`);
    setForm(initialForm);
  };

  const handleCetakFisik = () => {
    if (!selected) {
      alert("Pilih salah satu cek di Daftar Cetak Cek terlebih dahulu.");
      return;
    }
    if (selected.status !== "Belum Dicetak") {
      alert("Cek ini sudah pernah dicetak. Gunakan tombol Cetak Ulang.");
      return;
    }

    const confirmPrint = window.confirm(`Cetak fisik cek ${selected.nomor} (${selected.jenisCek}) sekarang?`);
    if (!confirmPrint) return;

    setDataCek((prev) =>
      prev.map((item) =>
        item.id === selected.id ? { ...item, status: "Sudah Dicetak" } : item
      )
    );
    alert(`Cek ${selected.nomor} berhasil dicetak.`);
  };

  const handleCetakUlang = () => {
    if (!selected) {
      alert("Pilih salah satu cek di Daftar Cetak Cek terlebih dahulu.");
      return;
    }
    if (selected.status !== "Sudah Dicetak") {
      alert("Cetak Ulang hanya berlaku untuk cek yang sudah dicetak sebelumnya.");
      return;
    }
    alert(`Mencetak ulang cek ${selected.nomor}...`);
  };

  const handleBatalkanCek = () => {
    if (!selected) {
      alert("Pilih salah satu cek di Daftar Cetak Cek terlebih dahulu.");
      return;
    }
    if (selected.status === "Dibatalkan") {
      alert("Cek ini sudah dibatalkan.");
      return;
    }

    const confirmCancel = window.confirm(`Yakin ingin membatalkan cek ${selected.nomor}?`);
    if (!confirmCancel) return;

    setDataCek((prev) =>
      prev.map((item) =>
        item.id === selected.id ? { ...item, status: "Dibatalkan" } : item
      )
    );
  };

  const statusBadge = (status) => {
    if (status === "Sudah Dicetak") {
      return (
        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
          Sudah Dicetak
        </span>
      );
    }
    if (status === "Dibatalkan") {
      return (
        <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
          Dibatalkan
        </span>
      );
    }
    return (
      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
        Belum Dicetak
      </span>
    );
  };

  return (
    <div className="space-y-8">

      {/* ================= 1. INFORMASI CEK ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200" style={{ margin: "20px", padding: "20px" }}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Pencetakan Cek</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pilih bank dan jenis transaksi (Tarik Tunai / Transfer) untuk mencetak cek</p>
          </div>
          {form.jenisCek && (
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${form.jenisCek === "Tarik Tunai" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
              {form.jenisCek === "Tarik Tunai" ? <FaMoneyBillWave /> : <FaExchangeAlt />}
              Mode: {form.jenisCek}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* KOLOM KIRI */}
          <div className="space-y-5">
            {/* STEP 1: Pilih Bank */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                1. Pilih Bank <span className="text-red-500">*</span>
              </label>
              <select
                name="bank"
                value={form.bank}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium bg-white"
              >
                <option value="">-- Pilih Bank Terlebih Dahulu --</option>
                <option value="Bank Mandiri">Bank Mandiri</option>
                <option value="Bank Sinarmas">Bank Sinarmas</option>
                <option value="Maybank">Maybank Indonesia</option>
              </select>
            </div>

            {/* STEP 2: Pilih Jenis Cetak Cek (Tarik Tunai vs Transfer) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                2. Pilih Jenis Cetak Cek <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, jenisCek: "Tarik Tunai" }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${form.jenisCek === "Tarik Tunai"
                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <FaMoneyBillWave />
                  Tarik Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, jenisCek: "Transfer" }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${form.jenisCek === "Transfer"
                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <FaExchangeAlt />
                  Transfer
                </button>
              </div>
            </div>

            {/* STEP 3: Tanggal Cek */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tanggal Cek <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              />
            </div>

            {/* STEP 4: Nama Vendor / PT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Vendor / PT <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vendor"
                value={form.vendor}
                onChange={handleChange}
                placeholder="Contoh: PT SMART Tbk / PT ABC Indonesia"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              />
            </div>

            {/* KHUSUS TRANSFER: Nama Bank & Nomor Rekening */}
            {form.jenisCek === "Transfer" && (
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wide">
                  <FaExchangeAlt /> Informasi Rekening Penerima (Transfer)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Bank Penerima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="bankPenerima"
                      value={form.bankPenerima}
                      onChange={handleChange}
                      placeholder="Contoh: BCA / Mandiri"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nomor Rekening <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nomorRekening"
                      value={form.nomorRekening}
                      onChange={handleChange}
                      placeholder="Contoh: 1234567890"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN */}
          <div className="space-y-5">
            {/* Jumlah Nominal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Jumlah Nominal (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="nominal"
                value={form.nominal}
                onChange={handleChange}
                placeholder="Masukkan nominal angka (misal: 25000000)"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-semibold text-gray-800"
              />
            </div>

            {/* Terbilang */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Terbilang <span className="text-red-500">*</span>
              </label>
              <textarea
                name="terbilang"
                value={form.terbilang}
                onChange={handleChange}
                rows="2"
                placeholder="Terbilang dari nominal (otomatis terisi)"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm bg-gray-50/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. PREVIEW CETAK CEK ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ margin: "20px", padding: "20px" }}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Preview Layout Cek Fisik</h2>
          {activeTemplate && (
            <span className="text-xs text-gray-500">
              Format: <strong className="text-gray-700">{activeTemplate.label}</strong> ({activeTemplate.widthCm}cm × {activeTemplate.heightCm}cm)
            </span>
          )}
        </div>
        <div className="p-6 flex justify-center overflow-x-auto bg-gray-50/50">
          {!activeTemplate ? (
            <div
              className="rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center p-8 text-center"
              style={{ width: "21cm", height: "9.5cm" }}
            >
              <p className="text-gray-400 text-sm font-medium">
                ⚠️ Silakan pilih Bank pada form di atas untuk menampilkan simulasi cetak cek
              </p>
            </div>
          ) : (
            <div
              className={`${activeTemplate.accentBg} border ${activeTemplate.accentBorder} rounded-xl p-6 flex flex-col justify-between transition-all duration-300 shrink-0 shadow-md relative`}
              style={{
                width: `${activeTemplate.widthCm}cm`,
                height: `${activeTemplate.heightCm}cm`,
              }}
            >
              {/* Watermark Jenis Cek */}
              <div className="absolute top-3 right-4 opacity-15 text-xs font-extrabold uppercase tracking-widest pointer-events-none">
                [{form.jenisCek}]
              </div>

              {/* Header Cek */}
              <div className="flex justify-between">
                <div>
                  <h3 className={`font-bold text-base ${activeTemplate.headerText}`}>
                    PT SMART Tbk.
                  </h3>
                  <p className="text-xs text-gray-600">
                    Jl. Rungkut Industri Raya No. 19, Surabaya
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    TGL: {form.tanggal ? new Date(form.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
              </div>

              {/* Penerima Cek */}
              <div>
                <div className="flex justify-between items-baseline text-xs mb-1 font-semibold text-gray-600">
                  <span>BAYAR KEPADA / PAY TO THE ORDER OF:</span>
                  <span className="font-bold text-gray-800">{form.vendor || "____________________"}</span>
                </div>
                <div className="border-b border-gray-400 h-1"></div>
              </div>

              {/* Khusus Transfer */}
              {form.jenisCek === "Transfer" && (
                <div className="text-xs text-blue-900 bg-blue-100/70 px-3 py-1 rounded border border-blue-200 flex justify-between font-mono">
                  <span>TRANSFER TO: <strong>{form.bankPenerima || "-"}</strong></span>
                  <span>NO. REK: <strong>{form.nomorRekening || "-"}</strong></span>
                </div>
              )}

              {/* Sum Of & Amount */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-gray-600 mb-0.5">TERBILANG / THE SUM OF:</p>
                  <p className="text-xs italic font-medium text-gray-800 border-b border-gray-400 pb-1">
                    # {form.terbilang || "...................................................................."} #
                  </p>
                </div>
                <div className="border-2 border-gray-800 px-4 py-2 font-bold text-sm bg-white rounded shadow-sm whitespace-nowrap">
                  Rp {form.nominal ? Number(form.nominal).toLocaleString("id-ID") : "0"}
                </div>
              </div>

              {/* Footer Bank & Signature */}
              <div
                className={`flex items-end ${activeTemplate.signaturePosition === "left" ? "justify-between flex-row-reverse" : "justify-between"
                  }`}
              >
                <div>
                  <p className={`font-bold text-xs ${activeTemplate.headerText}`}>
                    {activeTemplate.label}
                  </p>
                  <p className="text-[11px] text-gray-500">{activeTemplate.branch}</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-gray-800 mb-1"></div>
                  <p className="text-[10px] font-semibold text-gray-600">AUTHORIZED SIGNATURE</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. DAFTAR CETAK CEK ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ margin: "20px", padding: "20px" }}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">Daftar Cetak Cek</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300 text-center">
            <thead>
              <tr className="text-xs uppercase tracking-wide bg-gray-50">
                <th className="p-3 font-medium border border-gray-300 text-center">No. Cek</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Jenis Cek</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Tanggal</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Vendor / Penerima</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Bank & Rekening</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Nominal (Rp)</th>
                <th className="p-3 font-medium border border-gray-300 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataCek.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 border border-gray-300">
                    Belum ada data cetak cek.
                  </td>
                </tr>
              ) : (
                dataCek.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`hover:bg-gray-50 cursor-pointer transition ${selectedId === item.id ? "bg-blue-50/60 font-medium" : ""
                      }`}
                  >
                    <td className="p-3 text-gray-700 border border-gray-300 font-mono">{item.nomor}</td>
                    <td className="p-3 border border-gray-300">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${item.jenisCek === "Tarik Tunai" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                        }`}>
                        {item.jenisCek}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 border border-gray-300">{item.tanggal}</td>
                    <td className="p-3 text-gray-700 border border-gray-300">{item.vendor}</td>
                    <td className="p-3 text-gray-700 border border-gray-300 text-xs">
                      <div><strong>{item.bank}</strong></div>
                      {item.jenisCek === "Transfer" && (
                        <div className="text-gray-500">{item.bankPenerima} - {item.nomorRekening}</div>
                      )}
                    </td>
                    <td className="p-3 text-gray-700 border border-gray-300 font-semibold">Rp {item.nominal}</td>
                    <td className="p-3 border border-gray-300">{statusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            Terpilih: <strong className="text-gray-900">{selected.nomor}</strong> ({selected.jenisCek} - {selected.vendor})
          </div>
        )}
      </div>

      {/* ================= BUTTON ACTION ================= */}
      <div className="flex flex-wrap justify-end gap-3 pt-2" style={{ marginRight: "20px", marginBottom: "20px" }}>
        <button
          onClick={handleCetakCek}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition shadow-sm" style={{ padding: "5px 15px" }}
        >
          <FaPrint />
          Simpan Cek
        </button>
        <button
          onClick={handleCetakFisik}
          disabled={!selected || selected.status !== "Belum Dicetak"}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition shadow-sm" style={{ padding: "5px 15px" }}
        >
          <FaFileSignature />
          Cetak Fisik
        </button>
        <button
          onClick={handleCetakUlang}
          disabled={!selected || selected.status !== "Sudah Dicetak"}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-500 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition shadow-sm" style={{ padding: "5px 15px" }}
        >
          <FaRedo />
          Cetak Ulang
        </button>
        <button
          onClick={handleBatalkanCek}
          disabled={!selected || selected.status === "Dibatalkan"}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition shadow-sm" style={{ padding: "5px 15px" }}
        >
          <FaBan />
          Batalkan Cek
        </button>
      </div>
    </div>
  );
}