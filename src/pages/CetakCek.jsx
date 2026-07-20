import { useState } from "react";
import { FaPrint, FaRedo, FaBan, FaFileSignature } from "react-icons/fa";

// ======================================================================
// KONFIGURASI TEMPLATE CEK PER BANK
//
// Setiap bank di perusahaan ini punya ukuran fisik cek & tata letak yang
// beda, jadi preview-nya juga harus menyesuaikan. Kalau nanti ada bank
// baru, tinggal tambah 1 entry object di sini — TIDAK perlu ubah JSX
// preview di bawah, karena semua nilai visual (tinggi, lebar, warna,
// posisi elemen) diambil dari sini.
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

// Data awal Daftar Cetak Cek (dummy — nanti diganti fetch dari backend)
const initialDataCek = [
  {
    id: 1,
    nomor: "CK-000001",
    tanggal: "2025-07-01",
    vendor: "PT ABC Indonesia",
    bank: "Bank Mandiri",
    buku: "BK-001",
    nominal: "25.000.000",
    status: "Belum Dicetak",
  },
  {
    id: 2,
    nomor: "CK-000002",
    tanggal: "2025-07-02",
    vendor: "PT Sinar Jaya",
    bank: "Bank Sinarmas",
    buku: "BK-001",
    nominal: "10.500.000",
    status: "Sudah Dicetak",
  },
  {
    id: 3,
    nomor: "CK-000003",
    tanggal: "2025-07-03",
    vendor: "PT Maju Bersama",
    bank: "Maybank",
    buku: "BK-002",
    nominal: "45.000.000",
    status: "Belum Dicetak",
  },
];

const initialForm = {
  bank: "",
  bukuCek: "",
  nomorCek: "000021",
  tanggal: "2025-07-31",
  tipeCek: "Cek Biasa",
  mataUang: "IDR",
  vendor: "",
  nominal: "",
  terbilang: "",
  referensi: "",
  keterangan: "",
};

export default function CetakCek() {
  // ================= FORM INFORMASI CEK =================
  const [form, setForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Template preview aktif berdasarkan bank yang dipilih di form
  const activeTemplate = BANK_TEMPLATES[form.bank] || null;

  // ================= DAFTAR CETAK CEK =================
  const [dataCek, setDataCek] = useState(initialDataCek);
  const [selectedId, setSelectedId] = useState(null);

  const selected = dataCek.find((item) => item.id === selectedId) || null;

  // ================= AKSI CEK =================

  // Cetak Cek: simpan form Informasi Cek yang sedang diisi jadi entry baru
  // di Daftar Cetak Cek, dengan status awal "Belum Dicetak". Cek fisiknya
  // baru dicetak belakangan lewat tombol "Cetak Fisik" di Daftar Cetak Cek.
  const handleCetakCek = () => {
    if (!form.bank || !form.vendor || !form.nominal) {
      alert("Lengkapi minimal Bank, Vendor, dan Nominal sebelum mencetak.");
      return;
    }

    const newItem = {
      id: Date.now(),
      nomor: `CK-${form.nomorCek}`,
      tanggal: form.tanggal,
      vendor: form.vendor,
      bank: form.bank,
      buku: form.bukuCek || "-",
      nominal: form.nominal
        ? Number(form.nominal).toLocaleString("id-ID")
        : "0",
      status: "Belum Dicetak",
    };

    setDataCek((prev) => [newItem, ...prev]);
    alert(
      "Cek berhasil disimpan. Pilih cek ini di Daftar Cetak Cek untuk mencetak fisik."
    );
    setForm(initialForm);
  };

  // Cetak Fisik: hanya berlaku untuk cek yang statusnya masih "Belum Dicetak".
  // Setelah dicetak fisik, status berubah jadi "Sudah Dicetak".
  const handleCetakFisik = () => {
    if (!selected) {
      alert("Pilih salah satu cek di Daftar Cetak Cek terlebih dahulu.");
      return;
    }
    if (selected.status !== "Belum Dicetak") {
      alert("Cek ini sudah pernah dicetak. Gunakan tombol Cetak Ulang.");
      return;
    }

    const confirmPrint = window.confirm(
      `Cetak fisik cek ${selected.nomor} sekarang?`
    );
    if (!confirmPrint) return;

    setDataCek((prev) =>
      prev.map((item) =>
        item.id === selected.id ? { ...item, status: "Sudah Dicetak" } : item
      )
    );
    alert(`Cek ${selected.nomor} berhasil dicetak.`);
  };

  // Cetak Ulang: hanya berlaku untuk cek yang statusnya sudah "Sudah Dicetak".
  // Murni re-print, tidak mengubah status.
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

  // Batalkan Cek: ubah status baris terpilih jadi "Dibatalkan"
  const handleBatalkanCek = () => {
    if (!selected) {
      alert("Pilih salah satu cek di Daftar Cetak Cek terlebih dahulu.");
      return;
    }
    if (selected.status === "Dibatalkan") {
      alert("Cek ini sudah dibatalkan.");
      return;
    }

    const confirmCancel = window.confirm(
      `Yakin ingin membatalkan cek ${selected.nomor}?`
    );
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
    <div className="space-y-8 px-10 pt-10 pb-10">
      {/* ================= 1. INFORMASI CEK ================= */}
      <div
        className="bg-white rounded-xl shadow border border-gray-200 p-6"
        style={{ marginLeft: "20px", marginRight: "20px", marginTop: "20px", marginBottom: "20px" }}
      >
        <h2
          className="text-lg font-semibold mb-6 text-gray-700"
          style={{ marginTop: "10px", marginLeft: "20px" }}
        >
          Informasi Cek
        </h2>

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}
        >
          {/* Kolom Kiri */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Bank <span className="text-red-500">*</span>
              </label>
              <select
                name="bank"
                value={form.bank}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Pilih Bank</option>
                <option value="Bank Mandiri">Bank Mandiri</option>
                <option value="Bank Sinarmas">Bank Sinarmas</option>
                <option value="Maybank">Maybank Indonesia</option>
              </select>
              {!form.bank && (
                <p className="text-xs text-gray-400 mt-1">
                  Ukuran & tata letak preview cek menyesuaikan bank yang dipilih.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Buku Cek <span className="text-red-500">*</span>
              </label>
              <select
                name="bukuCek"
                value={form.bukuCek}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Pilih Buku Cek</option>
                <option value="Book 01">Book 01 (000001 - 000025)</option>
                <option value="Book 02">Book 02</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Tipe Cek</label>
              <select
                name="tipeCek"
                value={form.tipeCek}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="Cek Biasa">Cek Biasa</option>
                <option value="Giro">Giro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Mata Uang <span className="text-red-500">*</span>
              </label>
              <select
                name="mataUang"
                value={form.mataUang}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="IDR">IDR - Rupiah</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Vendor / Penerima <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <select
                  name="vendor"
                  value={form.vendor}
                  onChange={handleChange}
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Pilih Vendor</option>
                  <option value="PT SMART Tbk">PT SMART Tbk</option>
                  <option value="PT ABC">PT ABC</option>
                </select>
                <button
                  type="button"
                  className="border border-gray-600 text-gray-600 px-5 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  + Vendor Baru
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Referensi</label>
              <input
                type="text"
                name="referensi"
                value={form.referensi}
                onChange={handleChange}
                placeholder="Masukkan Referensi"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Nomor Cek <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nomorCek"
                value={form.nomorCek}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 bg-gray-50 text-sm"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Nomor cek berikutnya: {form.nomorCek}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Tanggal Cek <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Nominal <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="nominal"
                value={form.nominal}
                onChange={handleChange}
                placeholder="0"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Terbilang <span className="text-red-500">*</span>
              </label>
              <textarea
                name="terbilang"
                value={form.terbilang}
                onChange={handleChange}
                rows="3"
                placeholder="Terbilang"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Keterangan</label>
              <textarea
                name="keterangan"
                value={form.keterangan}
                onChange={handleChange}
                rows="3"
                placeholder="Masukkan Keterangan"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. PREVIEW CETAK CEK ================= */}
      <div
        className="bg-white rounded-xl shadow border border-gray-200"
        style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}
      >
        <div className="border-b px-5 py-3">
          <h2
            className="font-semibold text-gray-700"
            style={{ marginTop: "10px", marginLeft: "20px" }}
          >
            Preview Cetak Cek
          </h2>
        </div>
        <div className="p-6 flex justify-center overflow-x-auto">
          {!activeTemplate ? (
            <div
              className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
              style={{ width: "21cm", height: "9.5cm", marginTop: "10px", marginBottom: "10px" }}
            >
              <p className="text-gray-400 text-sm">
                Pilih bank terlebih dahulu untuk melihat preview cek
              </p>
            </div>
          ) : (
            <div
              className={`${activeTemplate.accentBg} border ${activeTemplate.accentBorder} rounded-lg p-6 flex flex-col justify-between transition-all duration-300 shrink-0`}
              style={{
                width: `${activeTemplate.widthCm}cm`,
                height: `${activeTemplate.heightCm}cm`,
                marginTop: "10px",
                marginBottom: "10px",
              }}
            >
              <div className="flex justify-between">
                <div>
                  <h3 className={`font-bold text-lg ${activeTemplate.headerText}`}>
                    PT SMART Tbk
                  </h3>
                  <p className="text-sm">
                    Jl. Rungkut Industri Raya No. 19, Surabaya – 60293, Indonesia
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">No. {form.nomorCek}</p>
                  <p className="text-sm">
                    {new Date(form.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm mb-2">PAY TO THE ORDER OF</p>
                <div className="border-b h-8 bg-white"></div>
              </div>

              <div className="flex justify-between items-center">
                <div className="w-3/4">
                  <p className="text-sm mb-2">THE SUM OF</p>
                  <div className="border-b h-8 bg-white"></div>
                </div>
                <div className="border p-3 font-bold bg-white">
                  Rp {parseInt(form.nominal || 0).toLocaleString("id-ID")}
                </div>
              </div>

              <div
                className={`flex items-end ${activeTemplate.signaturePosition === "left"
                  ? "justify-between flex-row-reverse"
                  : "justify-between"
                  }`}
              >
                <div>
                  <p className={`font-semibold ${activeTemplate.headerText}`}>
                    {activeTemplate.label}
                  </p>
                  <p className="text-sm">{activeTemplate.branch}</p>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b mb-2"></div>
                  <p className="text-sm">AUTHORIZED SIGNATURE</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. DAFTAR CETAK CEK ================= */}
      <div
        className="bg-white rounded-2xl shadow border border-gray-200"
        style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}
      >
        <div
          className="flex justify-between items-center border-b px-6 py-4"
          style={{ marginLeft: "20px", marginRight: "20px", marginTop: "10px" }}
        >
          <h2 className="text-lg font-semibold text-gray-700">Daftar Cetak Cek</h2>
        </div>

        <div
          className="overflow-x-auto"
          style={{ marginLeft: "20px", marginRight: "20px", marginTop: "20px" }}
        >
          <table className="w-full border border-gray-300" style={{ borderCollapse: "collapse" }}>
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">
                  Nomor Cek
                </th>
                <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">
                  Tanggal
                </th>
                <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">
                  Vendor
                </th>
                <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">
                  Bank
                </th>
                <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">
                  Nominal
                </th>
                <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {dataCek.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-gray-300 p-8 text-center text-gray-400 text-sm">
                    Belum ada data cek.
                  </td>
                </tr>
              ) : (
                dataCek.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`hover:bg-gray-100 cursor-pointer transition ${selectedId === item.id ? "bg-gray-100" : ""
                      }`}
                  >
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.nomor}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.tanggal}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.vendor}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.bank}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">Rp {item.nominal}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      {statusBadge(item.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "10px", marginTop: "10px" }}
        >
          <span className="text-sm text-gray-500">
            Menampilkan 1 - {dataCek.length} dari {dataCek.length} data
          </span>
          <div className="flex gap-2">
            <button className="border border-gray-400 rounded-lg px-4 py-2 hover:bg-gray-100 text-sm" style={{ padding: "3px 7px" }}>
              Sebelumnya
            </button>
            <button className="bg-gray-700 text-white rounded-lg px-4 py-2 text-sm" style={{ padding: "3px 7px" }}>
              1
            </button>
            <button className="border border-gray-400 rounded-lg px-4 py-2 hover:bg-gray-100 text-sm" style={{ padding: "3px 7px" }}>
              Berikutnya
            </button>
          </div>
        </div>

        {selected && (
          <p
            className="text-sm text-gray-500 px-6 pb-4"
            style={{ marginLeft: "20px", marginBottom: "10px" }}
          >
            Cek terpilih: <span className="font-medium text-gray-700">{selected.nomor}</span> — gunakan tombol Cetak Fisik / Cetak Ulang / Batalkan Cek di bawah.
          </p>
        )}
      </div>

      {/* ================= BUTTON ACTION ================= */}
      <div
        className="flex justify-end gap-4"
        style={{ marginRight: "20px", marginLeft: "20px", marginBottom: "20px" }}
      >
        <button className="px-6 py-3 border rounded-lg hover:bg-gray-100 transition text-sm" style={{ padding: "5px 15px" }}>
          Batal
        </button>
        <button
          onClick={handleCetakCek}
          className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm" style={{ padding: "5px 15px" }}
        >
          <FaPrint />
          Cetak Cek
        </button>
        <button
          onClick={handleCetakFisik}
          disabled={!selected || selected.status !== "Belum Dicetak"}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition text-sm" style={{ padding: "5px 15px" }}
        >
          <FaFileSignature />
          Cetak Fisik
        </button>
        <button
          onClick={handleCetakUlang}
          disabled={!selected || selected.status !== "Sudah Dicetak"}
          className="flex items-center gap-2 px-6 py-3 bg-gray-400 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition text-sm" style={{ padding: "5px 15px" }}
        >
          <FaRedo />
          Cetak Ulang
        </button>
        <button
          onClick={handleBatalkanCek}
          disabled={!selected || selected.status === "Dibatalkan"}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition text-sm" style={{ padding: "5px 15px" }}
        >
          <FaBan />
          Batalkan Cek
        </button>
      </div>
    </div>
  );
}