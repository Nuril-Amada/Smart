import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ======================================================================
// KONFIGURASI TEMPLATE CEK PER BANK
//
// Setiap bank di perusahaan ini punya ukuran fisik cek & tata letak yang
// beda, jadi preview-nya juga harus menyesuaikan. Kalau nanti ada bank
// baru, tinggal tambah 1 entry object di sini — TIDAK perlu ubah JSX
// preview di bawah, karena semua nilai visual (tinggi, lebar, warna,
// posisi elemen) diambil dari sini.
//
// "widthClass"/"heightClass": ukuran kotak preview (mendekati proporsi
// asli fisik cek tiap bank — sesuaikan lagi kalau ukuran resmi dari
// masing-masing bank berbeda).
// "accentBg"/"accentText": warna tema sesuai identitas bank.
// "signaturePosition": beberapa bank naruh kolom tanda tangan di kiri,
// ada yang di kanan — ini directly mempengaruhi layout cetak fisiknya.
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
  "Maybank": {
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

export default function BuatCekBaru() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Template aktif berdasarkan bank yang dipilih (null kalau belum pilih)
  const activeTemplate = BANK_TEMPLATES[form.bank] || null;

  const handleSimpanDanCetak = () => {
    alert("Cek berhasil disimpan dan siap dicetak!");
    navigate("/CetakCek");
  };

  return (
    <div className="space-y-8 px-10 pt-10">

      {/* ================= INFORMASI CEK ================= */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6" style={{ marginTop: "20px", marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}>
        <h2 className="text-lg font-semibold mb-6 text-gray-700" style={{ marginTop: "10px", marginLeft: "20px" }}>Informasi Cek</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}>
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

      {/* ================= PREVIEW ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6" style={{ marginLeft: "20px" }}>

        {/* Preview Cek — layout & ukuran menyesuaikan bank yang dipilih */}
        <div className="bg-white rounded-xl shadow border border-gray-200" style={{ marginRight: "20px" }}>
          <div className="border-b px-5 py-3">
            <h2 className="font-semibold text-gray-700" style={{ marginTop: "10px", marginLeft: "20px" }}>Preview Cek</h2>
          </div>
          <div className="p-6 flex justify-center overflow-x-auto">
            {!activeTemplate ? (
              // Belum pilih bank — tampilkan placeholder, bukan preview kosong yang membingungkan
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
                    <p className="text-sm">Jl. Rungkut Industri Raya No. 19, Surabaya – 60293, Indonesia</p>
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

                {/* Baris tanda tangan — posisi beda tergantung bank (signaturePosition) */}
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
      </div>

      {/* ================= BUTTON ACTION ================= */}
      <div className="flex justify-end gap-4 mt-8" style={{ marginRight: "20px", marginTop: "10px", marginBottom: "10px" }}>
        <button className="px-8 py-3 border rounded-lg hover:bg-gray-100 transition" style={{ padding: "5px 7px" }}>
          Batal
        </button>
        <button className="px-8 py-3 border border-gray-600 text-gray-600 rounded-lg hover:bg-gray-50 transition" style={{ padding: "5px 8px" }}>
          Simpan Draft
        </button>
        <button
          onClick={handleSimpanDanCetak}
          disabled={!form.bank}
          className="px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition" style={{ padding: "5px 10px" }}
        >
          Simpan & Cetak
        </button>
      </div>
    </div>
  );
}