import {
  FaUserCircle,
} from "react-icons/fa";

import { useLocation } from "react-router-dom";

export default function Navbar() {

  const location = useLocation();

  const pageTitle = {
    "/Dashboard": "Dashboard",
    "/CetakCek": "Cetak Cek",
    "/CetakCekBaru": "Buat Cek Baru",
    "/Settlement": "Dashboard Settlement",
    "/Advance": "Dashboard Advance",
    "/Export": "Export SAP",
  };

  return (
    <header
      className="h-16 bg-[#363D48] rounded-2xl shadow-md px-8 flex items-center justify-between"
      style={{ marginLeft: "5px", marginRight: "5px", marginTop: "5px" }}
    >

      {/* LEFT SIDE - Page Title */}
      <div style={{ marginLeft: "20px" }}>
        <h1 className="text-2xl font-bold text-white">
          {pageTitle[location.pathname] || "Dashboard"}
        </h1>
      </div>

      {/* RIGHT SIDE - Notification & User */}
      <div className="flex items-center gap-6" style={{ marginRight: "30px" }}>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <FaUserCircle className="text-3xl text-white" />

          <div className="text-right">
            <h3 className="text-sm font-semibold text-white">
              Finance Admin
            </h3>
            <p className="text-xs text-white">
              PT SMART Tbk.
            </p>
          </div>
        </div>

      </div>

    </header>
  );
}