import {
  FaBell,
  FaUserCircle,
  FaChevronDown,
} from "react-icons/fa";

import { useLocation } from "react-router-dom";

export default function Navbar() {

  const location = useLocation();

  const pageTitle = {
    "/": "Dashboard",
    "/CetakCek": "Cetak Cek",
    "/CetakCekBaru": "Buat Cek Baru",
    "/Settlement": "Settlement",
    "/Advance": "Advance",
    "/Export": "Export SAP",
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

      {/* LEFT SIDE - Page Title */}
      <div style={{ marginLeft: "20px" }}>   {/* ← Geser sedikit ke kanan */}
        <h1 className="text-2xl font-bold text-gray-800">
          {pageTitle[location.pathname] || "Dashboard"}
        </h1>
      </div>

      {/* RIGHT SIDE - Notification & User */}
      <div className="flex items-center gap-6" style={{ marginRight: "30px" }}>   {/* ← Tambah jarak & geser sedikit ke kiri */}

        {/* Notification */}
        <button className="text-xl text-gray-600 hover:text-gray-800 transition">
          <FaBell />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <FaUserCircle className="text-3xl text-gray-500" />

          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-800">
              Finance Admin
            </h3>
            <p className="text-xs text-gray-500">
              PT SMART Tbk.
            </p>
          </div>

          <FaChevronDown className="text-gray-500 text-sm" />
        </div>

      </div>

    </header>
  );
}