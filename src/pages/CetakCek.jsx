import { useState } from "react";
import { FaRedo, FaBan, FaFileSignature } from "react-icons/fa";
import CheckForm from "../components/cetakcek/CheckForm";
import CheckPreview from "../components/cetakcek/CheckPreview";

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

// Counter lokal sederhana untuk nomor cek (sebaiknya nanti nomor cek
// digenerate oleh backend, ini hanya fallback sementara)
let cekCounter = 1;

// Data awal Daftar Cetak Cek — kosong, akan diisi dari backend/database
const initialDataCek = [];

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

  const handleJenisCekChange = (jenis) => {
    setForm((prev) => ({ ...prev, jenisCek: jenis }));
  };

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
      <CheckForm form={form} onChange={handleChange} onJenisCekChange={handleJenisCekChange} dataCek={dataCek} onSimpanCek={handleCetakCek} />

      {/* ================= 2. PREVIEW CETAK CEK ================= */}
      <CheckPreview form={form} />

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
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition shadow-sm" style={{ padding: "5px 15px" }}
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