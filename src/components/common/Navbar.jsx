import React, { useState, useEffect, useMemo, useRef } from "react";
import { FaBell, FaKey, FaUserCircle, FaShieldAlt, FaUser, FaChevronDown } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { getReminderLogs } from "../../api/notification";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [overdueCount, setOverdueCount] = useState(0);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef(null);

  // Ambil data user dari localStorage
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("navicash_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const displayName = currentUser?.nama_lengkap || currentUser?.username || "Pengguna";
  const username = currentUser?.username || "-";

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Fetch + update badge ──
  useEffect(() => {
    const updateCount = () => {
      getReminderLogs()
        .then((data) => {
          if (Array.isArray(data)) {
            const groups = new Set();
            data.forEach((item) => {
              if (item.employee_name && !item.is_sent) {
                groups.add(item.employee_name);
              }
            });
            setOverdueCount(groups.size);
          }
        })
        .catch((err) => {
          console.error("Gagal memuat jumlah notifikasi:", err);
        });
    };

    updateCount();
    const interval = setInterval(updateCount, 10000);
    window.addEventListener("reminder-updated", updateCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener("reminder-updated", updateCount);
    };
  }, [location.pathname]);

  const pageTitle = {
    "/Dashboard": "Dashboard Petty Cash",
    "/CetakCek": "Cetak Cek",
    "/Settlement": "Reimbursement & Settlement",
    "/Advance": "Advance",
    "/CashOpname": "Cash Opname",
    "/MasterData": "Master Data",
    "/notifications": "Notifikasi Overdue Advance",
  };

  return (
    <>
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

        {/* RIGHT SIDE - Notification Bell & Circle User Profile Avatar Button */}
        <div className="flex items-center gap-4" style={{ marginRight: "20px" }}>
          {/* TOMBOL LONCENG NOTIFIKASI */}
          <button
            onClick={() => navigate("/notifications")}
            title="Notifikasi Overdue Advance"
            className="relative p-2 text-gray-300 hover:text-white transition-colors duration-200 focus:outline-none"
          >
            <FaBell className="text-xl" />

            {/* Badge Merah */}
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 color-white text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#363D48]">
                {overdueCount}
              </span>
            )}
          </button>

          {/* CIRCLE USER PROFILE AVATAR BUTTON (TANPA PADDING TRANSPARAN) */}
          <div className="relative flex items-center" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              title="Profil Pengguna"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "transparent",
                padding: 0,
                border: "none",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {/* CIRCLE AVATAR ICON: BIRU UNTUK ADMIN, ABU-ABU UNTUK USER */}
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: isAdmin ? "#2563eb" : "#475569",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  flexShrink: 0,
                  boxShadow: isAdmin ? "0 2px 6px rgba(37,99,235,0.3)" : "none"
                }}
              >
                <FaUser />
              </div>

              <FaChevronDown className="text-gray-300 text-xs" />
            </button>

            {/* POPUP DROPDOWN PROFILE USER */}
            {isProfileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  minWidth: "260px",
                  width: "max-content",
                  maxWidth: "340px",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  zIndex: 999,
                  animation: "fadeIn 0.2s ease"
                }}
              >
                {/* USER PROFILE INFO */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: isAdmin ? "#e0e7ff" : "#f1f5f9",
                      color: isAdmin ? "#2563eb" : "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0
                    }}
                  >
                    <FaUserCircle />
                  </div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1e293b", wordBreak: "break-word" }}>
                      {displayName}
                    </h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b", wordBreak: "break-all" }}>
                      @{username}
                    </p>
                  </div>
                </div>

                {/* ROLE BADGE */}
                <div style={{ marginBottom: "12px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "10px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      background: isAdmin ? "#dbeafe" : "#f1f5f9",
                      color: isAdmin ? "#1d4ed8" : "#475569"
                    }}
                  >
                    {isAdmin ? <FaShieldAlt size={9} /> : <FaUser size={9} />}
                    {isAdmin ? "ADMIN" : "USER"}
                  </span>
                </div>

                <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "10px 0" }} />

                {/* BUTTON GANTI PASSWORD */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsChangePassOpen(true);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#f8fafc",
                    color: "#334155",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (isAdmin) {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                      e.currentTarget.style.color = "#2563eb";
                    } else {
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                      e.currentTarget.style.color = "#1e293b";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.color = "#334155";
                  }}
                >
                  <FaKey size={12} />
                  <span>Ganti Password</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODAL GANTI PASSWORD */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />
    </>
  );
}