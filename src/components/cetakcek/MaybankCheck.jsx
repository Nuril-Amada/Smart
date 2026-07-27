// Konfigurasi tampilan cek khusus Maybank Indonesia
const template = {
    label: "Maybank Indonesia",
    branch: "Cab. Jakarta Senayan",
    widthCm: 21,
    heightCm: 10.5,
    accentBg: "bg-yellow-50",
    accentBorder: "border-yellow-300",
    headerText: "text-yellow-900",
    signaturePosition: "right",
};

export default function MaybankCheck({ form }) {
    return (
        <div
            className={`${template.accentBg} border ${template.accentBorder} rounded-xl p-6 flex flex-col justify-between transition-all duration-300 shrink-0 shadow-md relative`}
            style={{
                width: `${template.widthCm}cm`,
                height: `${template.heightCm}cm`,
            }}
        >
            {/* Watermark Jenis Cek */}
            <div className="absolute top-3 right-4 opacity-15 text-xs font-extrabold uppercase tracking-widest pointer-events-none">
                [{form.jenisCek}]
            </div>

            {/* Header Cek */}
            <div className="flex justify-between">
                <div>
                    <h3 className={`font-bold text-base ${template.headerText}`}>
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
                className={`flex items-end ${template.signaturePosition === "left" ? "justify-between flex-row-reverse" : "justify-between"
                    }`}
            >
                <div>
                    <p className={`font-bold text-xs ${template.headerText}`}>
                        {template.label}
                    </p>
                    <p className="text-[11px] text-gray-500">{template.branch}</p>
                </div>
                <div className="text-center">
                    <div className="w-36 border-b border-gray-800 mb-1"></div>
                    <p className="text-[10px] font-semibold text-gray-600">AUTHORIZED SIGNATURE</p>
                </div>
            </div>
        </div>
    );
}