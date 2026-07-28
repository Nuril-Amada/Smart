// Konfigurasi tampilan cek Bank Mandiri
const template = {
    widthCm: 17.8,
    heightCm: 7,
};

export default function MandiriCheck({ form }) {
    return (
        <div
            className="relative bg-white border border-gray-300 shrink-0 overflow-hidden font-sans"
            style={{
                width: `${template.widthCm}cm`,
                height: `${template.heightCm}cm`,
            }}
        >
            {/* ===== Tanggal ===== */}
            <div
                className="absolute border-b border-gray-400 flex items-end justify-center"
                style={{ top: "1.3cm", right: "0.5cm", width: "5.8cm", height: "0.5cm" }}
            >
                <span className="text-xs text-blue-900 font-medium">
                    {form.tanggal
                        ? new Date(form.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })
                        : "\u00A0"}
                </span>
            </div>

            {/* ===== Atas penyerahan (penerima) ===== */}
            <div className="absolute" style={{ top: "2.0cm", left: "0.9cm", width: "16.3cm" }}>
                {/* Baris label: "Atas penyerahan..." dan "atau pembawa *" sejajar */}
                <div className="flex justify-between items-baseline">
                    <span
                        className="text-[9px] font-bold text-gray-900 leading-tight"
                        style={{ width: "4cm" }}
                    >
                        Atas penyerahan cek ini bayarlah kepada
                    </span>
                    <span
                        className="text-[9px] font-bold text-gray-900 leading-tight text-right"
                        style={{ width: "1.5cm" }}
                    >
                        atau pembawa *
                    </span>
                </div>

                {/* Garis, tepat di bawah label, panjang penuh 16,3 cm */}
                <div
                    className="border-b border-gray-400 flex items-end mt-1"
                    style={{ width: "16.3cm", height: "0.5cm" }}
                >
                    <span className="text-sm text-blue-900 italic font-medium">
                        {form.vendor || ""}
                    </span>
                </div>

                {/* Keterangan, di bawah garis */}
                <p className="text-[10px] text-gray-400 italic mt-0.5">Pay to the order of</p>
            </div>

            {/* Info tambahan jika jenis cek Transfer */}
            {form.jenisCek === "Transfer" && (
                <div
                    className="absolute text-[11px] text-blue-900 bg-blue-50 px-3 py-1 rounded border border-blue-200 flex justify-between font-mono"
                    style={{ top: "3.5cm", left: "0.9cm", width: "16.3cm" }}
                >
                    <span>
                        TRANSFER TO: <strong>{form.bankPenerima || "-"}</strong>
                    </span>
                    <span>
                        NO. REK: <strong>{form.nomorRekening || "-"}</strong>
                    </span>
                </div>
            )}

            {/* ===== Uang sejumlah (terbilang) ===== */}
            <div
                className="absolute"
                style={{
                    top: form.jenisCek === "Transfer" ? "4.1cm" : "3.5cm",
                    left: "0.9cm",
                    width: "16.3cm",
                }}
            >
                <p className="text-xs font-bold text-gray-900">
                    uang sejumlah Rupiah (dalam huruf)
                </p>

                {/* Garis, panjang penuh sama dengan garis penerima: 16,3 cm */}
                <div
                    className="border-b border-gray-400 flex items-end mt-1"
                    style={{ width: "16.3cm", height: "0.5cm" }}
                >
                    <span className="text-sm text-blue-900 italic font-medium">
                        {form.terbilang || ""}
                    </span>
                </div>

                <p className="text-[10px] text-gray-400 italic mt-0.5">The Sum of (in words)</p>
            </div>

            {/* ===== Nominal ===== */}
            <div className="absolute flex items-center gap-2" style={{ bottom: "0.4cm", right: "0.5cm" }}>
                <span className="text-sm font-bold text-gray-800">Rp.</span>
                <div className="min-w-[9rem] px-3 py-1.5 bg-blue-100 border border-blue-300 rounded text-right font-mono font-bold text-base text-gray-900">
                    {form.nominal ? Number(form.nominal).toLocaleString("id-ID") : ""}
                </div>
            </div>
        </div>
    );
}