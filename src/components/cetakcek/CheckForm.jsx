import { FaMoneyBillWave, FaExchangeAlt } from "react-icons/fa";

export default function CheckForm({ form, onChange, onJenisCekChange }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200" style={{ margin: "20px", padding: "20px" }}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Pencetakan Cek</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Pilih bank dan jenis transaksi (Tarik Tunai / Transfer) untuk mencetak cek</p>
                </div>
                {form.jenisCek && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${form.jenisCek === "Tarik Tunai" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`} style={{ padding: "3px 5px" }}>
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
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs font-medium bg-white" style={{ padding: "1px 5px" }}
                        >
                            <option value="">Pilih Bank Terlebih Dahulu</option>
                            <option value="Bank Mandiri">Bank Mandiri</option>
                            <option value="Bank BCA">Bank BCA</option>
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
                                onClick={() => onJenisCekChange("Tarik Tunai")}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all ${form.jenisCek === "Tarik Tunai"
                                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`} style={{ padding: "1px 5px" }}
                            >
                                <FaMoneyBillWave />
                                Tarik Tunai
                            </button>
                            <button
                                type="button"
                                onClick={() => onJenisCekChange("Transfer")}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all ${form.jenisCek === "Transfer"
                                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`} style={{ padding: "1px 5px" }}
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
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs" style={{ padding: "1px 5px" }}
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
                            onChange={onChange}
                            placeholder="Contoh: PT SMART Tbk"
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs" style={{ padding: "1px 5px" }}
                        />
                    </div>

                    {/* KHUSUS TRANSFER: Nama Bank & Nomor Rekening */}
                    {form.jenisCek === "Transfer" && (
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-4 animate-fadeIn" style={{ marginTop: "10px" }}>
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
                                        onChange={onChange}
                                        placeholder="Contoh: BCA / Mandiri"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" style={{ padding: "1px 5px" }}
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
                                        onChange={onChange}
                                        placeholder="Contoh: 1234567890"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" style={{ padding: "1px 5px" }}
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
                            onChange={onChange}
                            placeholder="Masukkan nominal angka (misal: 25000000)"
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs font-semibold text-gray-800" style={{ padding: "1px 5px" }}
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
                            onChange={onChange}
                            rows="2"
                            placeholder="Terbilang dari nominal (otomatis terisi)"
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs bg-gray-50/50" style={{ padding: "1px 5px" }}
                        />
                    </div>
                </div>
            </div>
        </div >
    );
}