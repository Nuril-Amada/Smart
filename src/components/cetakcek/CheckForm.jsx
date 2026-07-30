import { useState } from "react";
import { FaMoneyBillWave, FaExchangeAlt, FaSave } from "react-icons/fa";

// ======================================================================
// AutocompleteInput — input teks dengan dropdown saran otomatis.
// Dipakai untuk field Nama Vendor, Nama Bank Penerima, dan Nomor
// Rekening di bawah, sama seperti pola autocomplete Nama User & Cost
// Center di tabel Settlement.
// ======================================================================
function AutocompleteInput({
    name,
    value,
    onChange,
    suggestions = [],
    placeholder,
    className,
    inputStyle,
}) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);

    const handleChange = (e) => {
        onChange(e.target.value);
        setOpen(true);
        setHighlight(-1);
    };

    const handleSelect = (val) => {
        onChange(val);
        setOpen(false);
        setHighlight(-1);
    };

    const handleKeyDown = (e) => {
        if (!open || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            if (highlight >= 0) {
                e.preventDefault();
                handleSelect(suggestions[highlight]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                name={name}
                value={value}
                onChange={handleChange}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 100)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                className={className}
                style={inputStyle}
            />

            {open && value && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-md py-1">
                    {suggestions.map((s, i) => (
                        <li
                            key={s}
                            onMouseDown={() => handleSelect(s)}
                            className={`px-3 py-2 text-xs cursor-pointer ${i === highlight
                                ? "bg-gray-100 text-gray-800"
                                : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Catatan: saran (suggestions) untuk Nama Vendor, Nama Bank Penerima, dan
// Nomor Rekening TIDAK lagi dihitung dari histori lokal — nantinya akan
// diambil dari database backend, lalu dioper ke komponen ini lewat props
// `vendorSuggestions`, `bankPenerimaSuggestions`, `nomorRekeningSuggestions`.
// Contoh nanti (setelah backend siap):
//
//   const [vendorSuggestions, setVendorSuggestions] = useState([]);
//   useEffect(() => {
//     searchVendor(form.vendor).then(setVendorSuggestions);
//   }, [form.vendor]);
//
// Catatan tambahan: field `nomorCek` di bawah ini SENGAJA input manual biasa
// (tanpa autocomplete/suggestion). Nilainya TIDAK dikirim ke komponen preview
// cetak cek (MandiriCheck) — nomor cek hanya dipakai saat data disimpan ke
// tabel history cetak cek lewat tombol "Simpan".


export default function CheckForm({
    form,
    onChange,
    onJenisCekChange,
    onSimpan,
    vendorSuggestions = [],
    bankPenerimaSuggestions = [],
    nomorRekeningSuggestions = [],
}) {
    const setField = (name, value) => onChange({ target: { name, value } });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200" style={{ margin: "20px", padding: "20px" }}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-lg font-bold text-gray-600">Pencetakan Cek</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Pilih bank dan jenis transaksi (Tarik Tunai / Transfer) untuk mencetak cek</p>
                </div>
                {form.jenisCek && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${form.jenisCek === "Tarik Tunai" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`} style={{ padding: "3px 5px" }}>
                        {form.jenisCek === "Tarik Tunai" ? <FaMoneyBillWave /> : <FaExchangeAlt />}
                        {form.jenisCek}
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
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs font-medium bg-white text-gray-600" style={{ padding: "2px 5px" }}
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
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-medium border transition-all ${form.jenisCek === "Tarik Tunai"
                                    ? "bg-gray-600 text-white border-gray-600 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`} style={{ padding: "2px 5px" }}
                            >
                                <FaMoneyBillWave />
                                Tarik Tunai
                            </button>
                            <button
                                type="button"
                                onClick={() => onJenisCekChange("Transfer")}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-medium border transition-all ${form.jenisCek === "Transfer"
                                    ? "bg-gray-600 text-white border-gray-600 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`} style={{ padding: "2px 5px" }}
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
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs" style={{ padding: "2px 5px" }}
                        />
                    </div>

                    {/* STEP 4: Nomor Cek — input manual biasa, TANPA autocomplete/rekomendasi.
                        Tidak dipakai di preview cetak (MandiriCheck), hanya untuk tabel history. */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nomor Cek <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nomorCek"
                            value={form.nomorCek || ""}
                            onChange={onChange}
                            autoComplete="off"
                            placeholder="Contoh: JL 919116"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs" style={{ padding: "2px 5px" }}
                        />
                    </div>

                    {/* STEP 5: Nama Vendor / PT — dengan autocomplete dari histori cek */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nama Vendor / PT <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            name="vendor"
                            value={form.vendor}
                            onChange={(val) => setField("vendor", val)}
                            suggestions={vendorSuggestions}
                            placeholder="Contoh: PT SMART Tbk"
                            className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs"
                            inputStyle={{ padding: "2px 5px" }}
                        />
                    </div>

                    {/* KHUSUS TRANSFER: Nama Bank & Nomor Rekening — dengan autocomplete dari histori cek */}
                    {form.jenisCek === "Transfer" && (
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-4 animate-fadeIn" style={{ marginTop: "10px" }}>
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wide" style={{ marginTop: "10px", marginLeft: "10px" }}>
                                <FaExchangeAlt /> Informasi Rekening Penerima (Transfer)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginLeft: "10px", marginRight: "10px", marginBottom: "10px" }}>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Nama Bank Penerima <span className="text-red-500">*</span>
                                    </label>
                                    <AutocompleteInput
                                        name="bankPenerima"
                                        value={form.bankPenerima}
                                        onChange={(val) => setField("bankPenerima", val)}
                                        suggestions={bankPenerimaSuggestions}
                                        placeholder="Contoh: BCA / Mandiri"
                                        className="w-full border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        inputStyle={{ padding: "2px 5px" }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Nomor Rekening <span className="text-red-500">*</span>
                                    </label>
                                    <AutocompleteInput
                                        name="nomorRekening"
                                        value={form.nomorRekening}
                                        onChange={(val) => setField("nomorRekening", val)}
                                        suggestions={nomorRekeningSuggestions}
                                        placeholder="Contoh: 1234567890"
                                        className="w-full border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        inputStyle={{ padding: "2px 5px" }}
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
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs font-semibold text-gray-800" style={{ padding: "2px 5px" }}
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
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs bg-gray-50/50" style={{ padding: "2px 5px" }}
                        />
                    </div>
                </div>
            </div>

            {/* Tombol Simpan — pojok kanan bawah */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onSimpan}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg px-5 py-2.5 shadow-sm transition-all" style={{ padding: "5px 10px" }}
                >
                    <FaSave />
                    Simpan
                </button>
            </div>
        </div>
    );
}