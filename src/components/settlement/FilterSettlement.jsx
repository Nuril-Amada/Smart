export default function FilterSettlement({
    tanggalAwal,
    setTanggalAwal,
    tanggalAkhir,
    setTanggalAkhir,
    onExport
}) {

    // RESET FILTER
    const handleReset = () => {
        setTanggalAwal("");
        setTanggalAkhir("");
    };

    return (
        <div className="w-full flex" style={{ marginTop: "10px", marginBottom: "10px", paddingLeft: "20px", paddingRight: "20px" }}>
            <div
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-200"
                style={{ padding: "15px" }}
            >
                <div className="flex flex-nowrap justify-between items-end gap-2">

                    {/* ================= LEFT ================= */}
                    <div className="flex flex-nowrap items-end gap-2">
                        {/* Dari Tanggal */}
                        <div>
                            <label className="block text-xs text-gray-600 mb-1 whitespace-nowrap">
                                Dari Tanggal
                            </label>

                            <input
                                type="date"
                                value={tanggalAwal}
                                onChange={(e) =>
                                    setTanggalAwal(e.target.value)
                                }
                                className="border border-gray-300 rounded-lg px-2 py-1.5 w-36 text-sm focus:ring-2 focus:ring-blue-600 outline-none" style={{ padding: "1px 5px" }}
                            />
                        </div>

                        {/* Sampai Tanggal */}
                        <div>
                            <label className="block text-xs text-gray-600 mb-1 whitespace-nowrap">
                                Sampai Tanggal
                            </label>

                            <input
                                type="date"
                                value={tanggalAkhir}
                                onChange={(e) =>
                                    setTanggalAkhir(e.target.value)
                                }
                                className="border border-gray-300 rounded-lg px-2 py-1.5 w-36 text-sm focus:ring-2 focus:ring-blue-600 outline-none" style={{ padding: "1px 5px" }}
                            />
                        </div>

                        {/* Reset */}
                        <button
                            type="button"
                            onClick={handleReset}
                            className="border border-gray-400 rounded-lg hover:bg-gray-100 transition whitespace-nowrap text-sm"
                            style={{ padding: "1px 12px" }}
                        >
                            Reset
                        </button>

                    </div>

                    {/* ================= RIGHT ================= */}
                    <div className="flex flex-nowrap items-end gap-2">

                        {/* Export */}
                        <button
                            type="button"
                            onClick={onExport}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition whitespace-nowrap text-sm"
                            style={{ padding: "6px 12px" }}
                        >
                            Export Report
                        </button>

                    </div>

                </div>
            </div>
        </div>
    );
}