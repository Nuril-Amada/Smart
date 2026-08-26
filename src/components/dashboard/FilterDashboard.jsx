import { useState } from "react";
import { FaTrash } from "react-icons/fa";

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

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
  onDeletePeriod,
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleOpenDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (onDeletePeriod) {
      onDeletePeriod({
        tanggalAwal,
        tanggalAkhir,
        source,
      });
    }
    setShowDeleteModal(false);
  };

  const isPeriodSelected = Boolean(tanggalAwal && tanggalAkhir);

  return (
    <>
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
                  className="border border-gray-300 rounded-lg px-2 py-1.5 w-36 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  style={{ padding: "1px 5px" }}
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
                  className="border border-gray-300 rounded-lg px-2 py-1.5 w-36 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  style={{ padding: "1px 5px" }}
                />
              </div>

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="border border-gray-400 rounded-lg hover:bg-gray-100 transition whitespace-nowrap text-sm cursor-pointer"
                style={{ padding: "1px 12px" }}
              >
                Reset
              </button>
            </div>

            {/* Right Side: Toggle Lokasi + Actions + Trash Icon */}
            <div className="flex flex-nowrap items-end gap-2">
              {/* Toggle Lokasi: Rungkut / Perak */}
              <div className="inline-flex bg-gray-100 border border-gray-200 rounded-lg p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSource && setSource("rungkut")}
                  className={`rounded-md font-medium transition whitespace-nowrap text-sm cursor-pointer ${source === "rungkut"
                    ? "bg-gray-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-200"
                    }`}
                  style={{ padding: "5px 10px" }}
                >
                  Rungkut
                </button>
                <button
                  type="button"
                  onClick={() => setSource && setSource("perak")}
                  className={`rounded-md font-medium transition whitespace-nowrap text-sm cursor-pointer ${source === "perak"
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
                  if (e.target.files.length > 0 && onImport) {
                    onImport(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("importExcel").click()}
                className="border border-gray-600 text-gray-500 font-medium rounded-lg hover:bg-gray-50 transition whitespace-nowrap text-sm cursor-pointer"
                style={{ padding: "6px 12px" }}
              >
                Import File
              </button>

              {/* Export */}
              <div className="relative group">
                <button
                  type="button"
                  className="bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition whitespace-nowrap text-sm cursor-pointer"
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
                    type="button"
                    onClick={onExportExcel}
                    className="w-full text-left px-6 py-4 text-gray-600 hover:bg-gray-100 cursor-pointer"
                    style={{ padding: "2px 10px" }}
                  >
                    Export Excel
                  </button>

                  <button
                    type="button"
                    onClick={onExportPDF}
                    className="w-full text-left px-6 py-4 text-gray-600 hover:bg-gray-100 cursor-pointer"
                    style={{ padding: "2px 10px" }}
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Trash Icon (Delete Period) - Sesuai warna & style di Master Data */}
              <button
                type="button"
                onClick={handleOpenDelete}
                title="Hapus data berdasarkan periode"
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                style={{ padding: "8px 10px" }}
              >
                <FaTrash className="text-xs" />
              </button>

            </div>

          </div>
        </div>
      </div>

      {/* MODAL KONFIRMASI HAPUS DATA PERIODE - Gaya & Margin/Padding sama persis dengan Master Data */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              width: "100%",
              maxWidth: "380px",
              animation: "slideDown 0.25s ease",
            }}
          >
            <div style={{ padding: "20px 20px 15px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>
                {isPeriodSelected ? "Hapus Data Periode" : "Peringatan Filter Tanggal"}
              </h3>

              {isPeriodSelected ? (
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", lineHeight: "1.5" }}>
                  Apakah Anda yakin ingin menghapus data dari periode{" "}
                  <span style={{ fontWeight: 700, color: "#dc2626" }}>
                    {formatDateDisplay(tanggalAwal)}
                  </span>{" "}
                  hingga{" "}
                  <span style={{ fontWeight: 700, color: "#dc2626" }}>
                    {formatDateDisplay(tanggalAkhir)}
                  </span>
                  {source && (
                    <>
                      {" "}pada lokasi{" "}
                      <span style={{ fontWeight: 600, color: "#374151", textTransform: "capitalize" }}>
                        {source}
                      </span>
                    </>
                  )}
                  ?
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", lineHeight: "1.5" }}>
                  Silakan tentukan <strong style={{ color: "#374151" }}>Dari Tanggal</strong> dan{" "}
                  <strong style={{ color: "#374151" }}>Sampai Tanggal</strong> terlebih dahulu untuk memilih periode data yang akan dihapus.
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "16px 24px 24px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {isPeriodSelected ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    style={{
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      color: "#6b7280",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      border: "none",
                      borderRadius: "10px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Ya, Hapus
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    background: "linear-gradient(135deg, #363D48)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "8px 20px",
                    fontSize: "13px",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Mengerti
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
