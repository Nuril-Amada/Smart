import { useState } from "react";
import { useNavigate } from "react-router-dom";   // ← Tambahan
import { FaPlus } from "react-icons/fa";

export default function BuatCekBaru() {
  const navigate = useNavigate();   // ← Tambahan

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

  // Fungsi Simpan & Cetak
  const handleSimpanDanCetak = () => {
    // Di sini nanti bisa ditambahkan logic save ke database / API
    // Untuk sementara kita tampilkan alert
    alert("Cek berhasil disimpan dan siap dicetak!");

    // Arahkan ke halaman Daftar Cek
    navigate("/CetakCek");
  };

  return (
    <div className="space-y-8 px-10 pt-10">

      {/* ================= INFORMASI CEK ================= */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6" style={{ marginTop: "20px", marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}>
        <h2 className="text-lg font-semibold mb-6" style={{ marginTop: "10px", marginLeft: "20px" }}>Informasi Cek</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginLeft: "20px", marginRight: "20px", marginBottom: "20px" }}>
          {/* Kolom Kiri */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bank <span className="text-red-500">*</span>
              </label>
              <select
                name="bank"
                value={form.bank}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Bank</option>
                <option value="Bank Mandiri">Bank Mandiri (001)</option>
                <option value="BCA">BCA</option>
                <option value="BRI">BRI</option>
                <option value="BNI">BNI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Buku Cek <span className="text-red-500">*</span>
              </label>
              <select
                name="bukuCek"
                value={form.bukuCek}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Buku Cek</option>
                <option value="Book 01">Book 01 (000001 - 000025)</option>
                <option value="Book 02">Book 02</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipe Cek</label>
              <select
                name="tipeCek"
                value={form.tipeCek}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cek Biasa">Cek Biasa</option>
                <option value="Giro">Giro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mata Uang <span className="text-red-500">*</span>
              </label>
              <select
                name="mataUang"
                value={form.mataUang}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IDR">IDR - Rupiah</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Vendor / Penerima <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <select
                  name="vendor"
                  value={form.vendor}
                  onChange={handleChange}
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Vendor</option>
                  <option value="PT SMART Tbk">PT SMART Tbk</option>
                  <option value="PT ABC">PT ABC</option>
                </select>
                <button
                  type="button"
                  className="border border-gray-600 text-gray-600 px-5 rounded-lg hover:bg-gray-50 transition"
                >
                  + Vendor Baru
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Referensi</label>
              <input
                type="text"
                name="referensi"
                value={form.referensi}
                onChange={handleChange}
                placeholder="Masukkan Referensi"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nomor Cek <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nomorCek"
                value={form.nomorCek}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Nomor cek berikutnya: {form.nomorCek}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tanggal Cek <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Nominal <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="nominal"
                value={form.nominal}
                onChange={handleChange}
                placeholder="0"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Terbilang <span className="text-red-500">*</span>
              </label>
              <textarea
                name="terbilang"
                value={form.terbilang}
                onChange={handleChange}
                rows="3"
                placeholder="Terbilang"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Keterangan</label>
              <textarea
                name="keterangan"
                value={form.keterangan}
                onChange={handleChange}
                rows="3"
                placeholder="Masukkan Keterangan"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= DETAIL TRANSAKSI & PREVIEW ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ marginLeft: "20px" }}>
        {/* Detail Transaksi */}
        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="border-b px-5 py-3">
            <h2 className="font-semibold text-gray-700" style={{ marginTop: "10px", marginLeft: "20px" }}>Detail Transaksi (Opsional)</h2>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-3">No.</th>
                  <th className="text-left p-3">Deskripsi</th>
                  <th className="text-left p-3">Akun</th>
                  <th className="text-left p-3">Nominal</th>
                  <th className="text-center p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <div className="text-6xl mb-3">📄</div>
                      <p className="font-medium">Belum ada detail transaksi</p>
                      <p className="text-sm mt-1">
                        Tambahkan detail transaksi jika diperlukan.
                      </p>
                      <button className="mt-5 border border-blue-600 text-blue-600 hover:bg-blue-50 px-5 py-2 rounded-lg transition">
                        + Tambah Detail
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="border-t flex justify-between px-5 py-4 font-semibold">
            <span>Total Nominal</span>
            <span>Rp 0</span>
          </div>
        </div>

        {/* Preview Cek */}
        <div className="bg-white rounded-xl shadow border border-gray-200" style={{ marginRight: "20px" }}>
          <div className="border-b px-5 py-3">
            <h2 className="font-semibold text-gray-700" style={{ marginTop: "10px", marginLeft: "20px" }}>Preview Cek</h2>
          </div>
          <div className="p-6">
            <div className="rounded-lg border bg-sky-50 p-6 h-[360px] flex flex-col justify-between" style={{ marginTop: "10px", marginBottom: "10px", marginLeft: "10px", marginRight: "10px" }}>
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold text-lg">PT SMART Tbk</h3>
                  <p className="text-sm">Jl. MH. Thamrin No.51</p>
                  <p className="text-sm">Jakarta Pusat</p>
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

              <div className="flex justify-between items-end">
                <div>
                  <p className="font-semibold">Bank Mandiri</p>
                  <p className="text-sm">Cab. Jakarta Thamrin</p>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b mb-2"></div>
                  <p className="text-sm">AUTHORIZED SIGNATURE</p>
                </div>
              </div>
            </div>
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
          className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition" style={{ padding: "5px 10px" }}
        >
          Simpan & Cetak
        </button>
      </div>
    </div>
  );
}