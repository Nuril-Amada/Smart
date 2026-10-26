import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaKey, FaTimes, FaLock } from "react-icons/fa";
import { changePasswordApi } from "../../api/auth";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMsg("Semua isian password wajib diisi.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi password baru tidak cocok.");
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg("Password baru minimal 4 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await changePasswordApi({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccessMsg(res.message || "Password berhasil diperbarui!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Auto logout setelah ganti password — best practice keamanan
      setTimeout(() => {
        localStorage.removeItem("navicash_user");
        localStorage.removeItem("navicash_token");
        navigate("/", { replace: true });
      }, 2000);
    } catch (err) {
      const detail =
        err.response?.data?.detail || "Gagal mengubah password. Silakan periksa password lama Anda.";
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "400px",
          maxWidth: "90%",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
        }}
      >
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "#e0e7ff",
                color: "#4338ca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              }}
            >
              <FaKey />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e1b4b" }}>
                Ganti Password
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                Perbarui kata sandi akun Anda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: "16px",
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* NOTIFIKASI ERROR / SUKSES */}
        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              marginBottom: "14px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#059669",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              marginBottom: "14px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "2px" }}>{successMsg}</div>
            <div style={{ fontSize: "11px", color: "#047857" }}>Anda akan diarahkan ke halaman login...</div>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#475569" }}>
              Password Saat Ini (Lama)
            </label>
            <div style={{ position: "relative" }}>
              <FaLock style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "12px" }} />
              <input
                type="password"
                required
                placeholder="Masukkan password lama"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#475569" }}>
              Password Baru
            </label>
            <div style={{ position: "relative" }}>
              <FaKey style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "12px" }} />
              <input
                type="password"
                required
                placeholder="Minimal 4 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#475569" }}>
              Konfirmasi Password Baru
            </label>
            <div style={{ position: "relative" }}>
              <FaKey style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "12px" }} />
              <input
                type="password"
                required
                placeholder="Ketik ulang password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "9px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#4338ca",
                color: "#fff",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(67, 56, 202, 0.3)",
              }}
            >
              {loading ? "Memproses..." : "Simpan Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
