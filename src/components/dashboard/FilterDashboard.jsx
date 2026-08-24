import { useState } from "react";
export default function FilterDashboard({
  source,
  setSource,
  tanggalAwal,
  setTanggalAwal,
  tanggalAkhir,
  setTanggalAkhir,
  onFilter,
  onReset,
  onImport,
  onExportPDF,
  onExportExcel,
}) {

  // const handleFilter = () => {
  //   if (onFilter) {
  //     onFilter();
  //   }
  // };

  const handleReset = () => {
    setTanggalAwal("");
    setTanggalAkhir("");

    if (onReset) {
      onReset();
    }
  };

  return (
    <div
      className="w-full flex"
      style={{
        marginTop: "10px",
        marginBottom: "10px",
        paddingLeft: "20px",
        paddingRight: "20px"
      }}
    >

      <div
        className="w-full bg-white rounded-2xl shadow-sm border border-gray-200"
        style={{ padding: "15px" }}
      >

        <div className="flex flex-nowrap justify-between items-end gap-2">


          {/* Left Side: Filter */}
          <div className="flex flex-nowrap items-end gap-2">

            {/* Dari Tanggal */}
            <div>
              <label className="block text-xs text-gray-600 mb-1 whitespace-nowrap">
                Dari Tanggal
              </label>

              <input
                type="date"
                value={tanggalAwal}
                onChange={(e) => setTanggalAwal(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 w-36 text-sm focus:ring-2 focus:ring-blue-600outline-none" style={{ padding: "1px 5px" }}
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
                onChange={(e) => setTanggalAkhir(e.target.value)}
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

          {/* Right Side: Toggle Lokasi + Actions (Import File and Export Report) */}
          <div className="flex flex-nowrap items-end gap-2">
            {/* Toggle Lokasi: Rungkut / Perak — mepet ke Import/Export */}
            <div className="inline-flex bg-gray-100 border border-gray-200 rounded-lg p-1 shrink-0">
              <button
                type="button"
                onClick={() => setSource("rungkut")}
                className={`rounded-md font-medium transition whitespace-nowrap text-sm ${source === "rungkut"
                  ? "bg-gray-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
                  }`}
                style={{ padding: "5px 10px" }}
              >
                Rungkut
              </button>
              <button
                type="button"
                onClick={() => setSource("perak")}
                className={`rounded-md font-medium transition whitespace-nowrap text-sm ${source === "perak"
                  ? "bg-gray-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
                  }`}
                style={{ padding: "5px 10px", marginLeft: "2px" }}
              >
                Perak
              </button>
            </div>

            {/* Import */}
            <input
              type="file"
              id="importExcel"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  onImport(e.target.files[0]);
                }
              }}
            />
            <button
              onClick={() => document.getElementById("importExcel").click()}
              className="border border-gray-600 text-gray-500 font-medium rounded-lg hover:bg-gray-50 transition whitespace-nowrap text-sm"
              style={{ padding: "6px 12px" }}
            >
              Import File
            </button>


            {/* Export */}
            <div className="relative group">

              <button
                className="bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition whitespace-nowrap text-sm"
                style={{ padding: "6px 12px" }}
              >
                Export Report
              </button>

              <div
                className="
                  absolute
                  right-0
                  mt-1
                  hidden
                  group-hover:block
                  bg-white
                  border
                  border-gray-200
                  rounded-lg
                  shadow-lg
                  min-w-[170px]
                  z-50
                "
              >

                <button
                  onClick={onExportExcel}
                  className="w-full text-left px-6 py-4 text-gray-600 hover:bg-gray-100" style={{ padding: "2px 10px" }}
                >
                  Export Excel
                </button>

                <button
                  onClick={onExportPDF}
                  className="w-full text-left px-6 py-4 text-gray-600 hover:bg-gray-100" style={{ padding: "2px 10px" }}
                >
                  Export PDF
                </button>

              </div>

            </div>

          </div>


        </div>

      </div>

    </div>
  );
}