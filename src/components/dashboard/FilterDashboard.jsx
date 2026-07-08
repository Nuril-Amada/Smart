export default function FilterDashboard({
  tanggalAwal,
  setTanggalAwal,
  tanggalAkhir,
  setTanggalAkhir,
}) {
  const handleReset = () => {
    setTanggalAwal("");
    setTanggalAkhir("");
  };

  const handleFilter = () => {
    console.log({
      tanggalAwal,
      tanggalAkhir,
    });

    // Nanti ketika backend sudah jadi
    // tinggal panggil API di sini
  };

  return (
    <div className="w-full flex" style={{ marginTop: "15px", marginBottom: "15px", paddingLeft: "20px", paddingRight: "20px" }}>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200" style={{ padding: "15px" }}>

        <div className="flex flex-wrap justify-between items-end gap-5">

          {/* Left Side: Filter inputs and buttons */}
          <div className="flex flex-wrap gap-5 items-end">
            {/* Dari Tanggal */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={tanggalAwal}
                onChange={(e) => setTanggalAwal(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-52 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            {/* Sampai */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => setTanggalAkhir(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-52 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            {/* Filter */}
            <button
              onClick={handleFilter}
              className="bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition"
              style={{ padding: "5px 15px" }}
            >
              Filter
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="border border-gray-400 rounded-lg hover:bg-gray-100 transition"
              style={{ padding: "5px 15px" }}
            >
              Reset
            </button>
          </div>

          {/* Right Side: Actions (Import File and Export Report) */}
          <div className="flex flex-wrap gap-3 items-end">
            <button
              className="border border-gray-600 text-gray-500 font-medium rounded-lg hover:bg-gray-50 transition"
              style={{ padding: "5px 15px" }}
            >
              Import File
            </button>
            <button
              className="bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition"
              style={{ padding: "5px 15px" }}
            >
              Export Report
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}