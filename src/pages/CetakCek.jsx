import { useState } from "react";
import { useNavigate } from "react-router-dom"; // navigation
import {
  FaSearch,
  FaUndo,
  FaPlus,
  FaPrint,
  FaTrash,
  FaEye,
  FaSort,
} from "react-icons/fa";

const dataCek = [
  {
    id: 1,
    nomor: "CK-000001",
    tanggal: "2025-07-01",
    vendor: "PT ABC Indonesia",
    bank: "BCA",
    buku: "BK-001",
    nominal: "25.000.000",
    status: "Belum Dicetak",
  },
  {
    id: 2,
    nomor: "CK-000002",
    tanggal: "2025-07-02",
    vendor: "PT Sinar Jaya",
    bank: "Mandiri",
    buku: "BK-001",
    nominal: "10.500.000",
    status: "Sudah Dicetak",
  },
  {
    id: 3,
    nomor: "CK-000003",
    tanggal: "2025-07-03",
    vendor: "PT Maju Bersama",
    bank: "BNI",
    buku: "BK-002",
    nominal: "45.000.000",
    status: "Belum Dicetak",
  },
];

export default function CetakCek() {
  const navigate = useNavigate();

  // filter state
  const [tanggalAwal, setTanggalAwal] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [bank, setBank] = useState("");
  const [vendor, setVendor] = useState("");
  const [status, setStatus] = useState("");
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // table & selected row
  const [selected, setSelected] = useState(dataCek[0]);

  // navigation to create page
  const handleBuatCekBaru = () => {
    navigate("/CetakCekBaru");
  };

  return (
    // Wrapper halaman — padding 20px di semua sisi,
    // dan jarak antar section (vertical) juga 20px.
    <div style={{ padding: "10px" }} className="space-y-5">

      {/* Filter Card — margin 20px di semua sisi */}
      <div
        className="bg-white rounded-2xl shadow border border-gray-200"
        style={{ marginTop: "10px", marginLeft: "10px", marginRight: "10px" }}
      >
        <div className="flex justify-between items-center border-b px-6 py-4" style={{ marginLeft: "20px", marginTop: "10px", marginRight: "20px" }}>
          <h2 className="text-xl font-semibold text-gray-700">
            Pencarian Data Cek
          </h2>
          <button
            className="text-gray-600 hover:underline"
            onClick={() => setFilterCollapsed(!filterCollapsed)}
          >
            {filterCollapsed ? "Tampilkan Filter" : "Sembunyikan Filter"}
          </button>
        </div>
        {!filterCollapsed && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5" style={{ marginLeft: "20px", marginRight: "20px", marginTop: "10px" }}>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={tanggalAwal}
                  onChange={(e) => setTanggalAwal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={tanggalAkhir}
                  onChange={(e) => setTanggalAkhir(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Bank
                </label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Semua Bank</option>
                  <option>BCA</option>
                  <option>Mandiri</option>
                  <option>BNI</option>
                  <option>BRI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Semua Status</option>
                  <option>Belum Dicetak</option>
                  <option>Sudah Dicetak</option>
                </select>
              </div>
              <div className="xl:col-span-2">
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Vendor
                </label>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Cari Vendor..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8" style={{ marginTop: "10px", marginRight: "20px", marginBottom: "20px" }}>
              <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition text-sm" style={{ padding: "5px 7px" }}>
                <FaSearch />
                Cari
              </button>
              <button
                className="flex items-center gap-2 border border-gray-400 px-6 py-2 rounded-lg hover:bg-gray-100 transition text-sm" style={{ padding: "5px 7px" }}
                onClick={() => {
                  setTanggalAwal("");
                  setTanggalAkhir("");
                  setVendor("");
                  setBank("");
                  setStatus("");
                }}
              >
                <FaUndo />
                Reset
              </button>
              <button
                onClick={handleBuatCekBaru}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition text-sm" style={{ padding: "5px 7px" }}
              >
                <FaPlus />
                Buat Cek Baru
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content — gap antar kolom 20px */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Daftar Cek — margin 20px di semua sisi */}
        <div
          className="xl:col-span-2 bg-white rounded-2xl shadow border border-gray-200"
          style={{ marginTop: "20px", marginLeft: "10px", marginRight: "10px" }}
        >
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ marginLeft: "20px", marginRight: "20px", marginTop: "10px" }}>
            <h2 className="text-lg font-semibold text-gray-700">Daftar Cek</h2>
            <span className="text-sm text-gray-500">
              Total Data : {dataCek.length}
            </span>
          </div>
          <div className="overflow-x-auto" style={{ marginLeft: "20px", marginRight: "20px", marginTop: "10px", marginBottom: "10px" }}>
            <table className="w-full border border-gray-300" style={{ borderCollapse: "collapse" }}>
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700 cursor-pointer">
                    Nomor Cek
                  </th>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700 cursor-pointer">
                    Tanggal
                  </th>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">Vendor</th>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">Bank</th>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">Nominal</th>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">Status</th>
                  <th className="border border-gray-300 text-center px-4 py-3 text-sm text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dataCek.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`hover:bg-gray-100 cursor-pointer transition ${selected?.id === item.id ? "bg-gray-100" : ""
                      }`}
                  >
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.nomor}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.tanggal}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.vendor}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.bank}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">Rp {item.nominal}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      {item.status === "Sudah Dicetak" ? (
                        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                          Sudah Dicetak
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                          Belum Dicetak
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-400 flex items-center justify-center">
                          <FaPrint />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-4" style={{ marginLeft: "20px", marginRight: "20px" }}>
            <span className="text-sm text-gray-500">
              Menampilkan 1 - {dataCek.length} data
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
        </div>

        {/* Detail Cek — margin 20px di semua sisi */}
        <div
          className="bg-white rounded-2xl shadow border border-gray-200"
          style={{ marginRight: "15px", marginTop: "20px", marginLeft: "-10px" }}
        >
          <div className="border-b px-6 py-4 flex justify-between items-center" style={{ marginLeft: "10px", marginRight: "10px", marginTop: "10px" }}>
            <h2 className="text-lg font-semibold text-gray-700">Detail Cek</h2>
          </div>
          <div className="p-6 space-y-4" style={{ marginLeft: "10px", marginRight: "10px" }}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium text-sm">Nomor Cek:</span>
              <span>{selected.nomor}</span>
              <span className="font-medium text-sm">Tanggal:</span>
              <span>{selected.tanggal}</span>
              <span className="font-medium text-sm">Vendor:</span>
              <span>{selected.vendor}</span>
              <span className="font-medium text-sm">Bank:</span>
              <span>{selected.bank}</span>
              <span className="font-medium text-sm">Buku Cek:</span>
              <span>{selected.buku}</span>
              <span className="font-medium text-sm">Nominal:</span>
              <span className="text-xl font-bold text-gray-700 text-xs">Rp {selected.nominal}</span>
              <span className="font-medium text-sm">Status:</span>
              <span>
                {selected.status === "Sudah Dicetak" ? (
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs">
                    Sudah Dicetak
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs">
                    Belum Dicetak
                  </span>
                )}
              </span>
            </div>
            <div className="pt-6">
              <h3 className="font-semibold text-gray-700 mb-3" style={{ marginTop: "10px" }}>Preview Cek</h3>
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 h-[240px] flex flex-col items-center justify-center">
                <FaEye className="text-5xl text-gray-400 mb-4" />
                <p className="text-gray-500 text-sm">Preview cek akan tampil di sini</p>
              </div>
            </div>
            <div className="pt-6 flex flex-col gap-3" style={{ marginTop: "10px", marginBottom: "10px" }}>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition text-sm">
                <FaPrint />
                Cetak Cek
              </button>
              <button className="w-full bg-gray-400 hover:bg-gray-500 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition text-sm">
                <FaPrint />
                Cetak Ulang
              </button>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition text-sm">
                <FaTrash />
                Batalkan Cek
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}