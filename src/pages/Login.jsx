import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaUserPlus, FaIdCard, FaCheckCircle } from "react-icons/fa";
import logo from "../assets/LOGO.png";
import { loginApi, registerApi } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();

  // Mode: "login" atau "register"
  const [mode, setMode] = useState("login");

  // Form Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Form Register states
  const [regUsername, setRegUsername] = useState("");
  const [regNamaLengkap, setRegNamaLengkap] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Status states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username dan Password wajib diisi.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await loginApi({ username, password });
      if (res && res.user) {
        localStorage.setItem("navicash_user", JSON.stringify(res.user));
        if (res.token) {
          localStorage.setItem("navicash_token", res.token);
        }
        const role = (res.user.role || "").toLowerCase();
        if (role === "admin") {
          navigate("/MasterData", { replace: true });
        } else {
          navigate("/Dashboard", { replace: true });
        }
      } else {
        setErrorMsg("Gagal melakukan login. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      const detail = err.response?.data?.detail || "Username atau Password yang Anda masukkan salah.";
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regUsername.trim() || !regNamaLengkap.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      setErrorMsg("Semua kolom pendaftaran wajib diisi.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    if (regPassword.length < 4) {
      setErrorMsg("Password minimal 4 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await registerApi({
        username: regUsername.trim(),
        nama_lengkap: regNamaLengkap.trim(),
        password: regPassword.trim(),
      });

      setSuccessMsg(res.message || "Pendaftaran akun berhasil! Silakan login.");
      setUsername(regUsername.trim());
      setPassword("");
      setRegUsername("");
      setRegNamaLengkap("");
      setRegPassword("");
      setRegConfirmPassword("");

      // Pindah ke mode login setelah 1.5 detik
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err) {
      console.error("Register Error:", err);
      const detail = err.response?.data?.detail || "Gagal melakukan pendaftaran akun.";
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
      {/* CARD CONTAINER */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#363D48",
          color: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px 36px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid #4B5563",
          boxSizing: "border-box"
        }}
      >
        {/* LOGO & BRANDING */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "14px" }}>
          <img
            src={logo}
            alt="Logo Navicash"
            style={{ width: "48px", height: "48px", objectFit: "contain", marginBottom: "6px" }}
          />
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#FFFFFF", margin: 0, lineHeight: "1.2" }}>
            Navicash
          </h1>
          <p style={{ fontSize: "11px", color: "#D1D5DB", fontWeight: "500", marginTop: "3px", margin: 0 }}>
            PT. SMART Tbk. - Petty Cash & Finance System
          </p>
        </div>



        {/* ALERT NOTIFIKASI ERROR / SUKSES */}
        {errorMsg && (
          <div style={{ marginBottom: "14px", padding: "10px 14px", backgroundColor: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.5)", borderRadius: "8px", color: "#FCA5A5", fontSize: "12px", textAlign: "center", fontWeight: "500" }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ marginBottom: "14px", padding: "10px 14px", backgroundColor: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.5)", borderRadius: "8px", color: "#6EE7B7", fontSize: "12px", textAlign: "center", fontWeight: "500" }}>
            {successMsg}
          </div>
        )}

        {/* FORM LOGIN */}
        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* USERNAME */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#E5E7EB", letterSpacing: "0.05em" }}>
                USERNAME
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "16px", color: "#9CA3AF", zIndex: 10, pointerEvents: "none" }}>
                  <FaUser size={14} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  style={{
                    width: "100%",
                    backgroundColor: "#2B303A",
                    border: "1px solid #4B5563",
                    borderRadius: "8px",
                    paddingTop: "9px",
                    paddingBottom: "9px",
                    paddingLeft: "46px",
                    paddingRight: "16px",
                    fontSize: "13px",
                    color: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#E5E7EB", letterSpacing: "0.05em" }}>
                PASSWORD
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "16px", color: "#9CA3AF", zIndex: 10, pointerEvents: "none" }}>
                  <FaLock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  style={{
                    width: "100%",
                    backgroundColor: "#2B303A",
                    border: "1px solid #4B5563",
                    borderRadius: "8px",
                    paddingTop: "9px",
                    paddingBottom: "9px",
                    paddingLeft: "46px",
                    paddingRight: "48px",
                    fontSize: "13px",
                    color: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "16px", color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0, zIndex: 10 }}
                >
                  {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "4px",
                backgroundColor: "#59616F",
                color: "#FFFFFF",
                fontWeight: "600",
                paddingTop: "10px",
                paddingBottom: "10px",
                borderRadius: "8px",
                border: "1px solid #6B7280",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "13px"
              }}
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <FaSignInAlt size={14} />
                  <span>Masuk</span>
                </>
              )}
            </button>

            {/* LINK KE REGISTER */}
            <p style={{ textAlign: "center", fontSize: "12px", color: "#9CA3AF", margin: 0, marginTop: "4px" }}>
              Belum memiliki akun?{" "}
              <button
                type="button"
                onClick={() => { setMode("register"); setErrorMsg(""); setSuccessMsg(""); }}
                style={{ background: "none", border: "none", color: "#93C5FD", fontWeight: "600", cursor: "pointer", fontSize: "12px", padding: 0, textDecoration: "underline" }}
              >
                Daftar di sini
              </button>
            </p>
          </form>
        ) : (
          /* FORM REGISTER */
          <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* NAMA LENGKAP */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#E5E7EB" }}>
                NAMA LENGKAP
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "16px", color: "#9CA3AF", zIndex: 10, pointerEvents: "none" }}>
                  <FaIdCard size={14} />
                </span>
                <input
                  type="text"
                  value={regNamaLengkap}
                  onChange={(e) => setRegNamaLengkap(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  style={{
                    width: "100%",
                    backgroundColor: "#2B303A",
                    border: "1px solid #4B5563",
                    borderRadius: "8px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    paddingLeft: "46px",
                    paddingRight: "16px",
                    fontSize: "13px",
                    color: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* USERNAME */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#E5E7EB" }}>
                USERNAME
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "16px", color: "#9CA3AF", zIndex: 10, pointerEvents: "none" }}>
                  <FaUser size={14} />
                </span>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Username baru"
                  style={{
                    width: "100%",
                    backgroundColor: "#2B303A",
                    border: "1px solid #4B5563",
                    borderRadius: "8px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    paddingLeft: "46px",
                    paddingRight: "16px",
                    fontSize: "13px",
                    color: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#E5E7EB" }}>
                PASSWORD
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "16px", color: "#9CA3AF", zIndex: 10, pointerEvents: "none" }}>
                  <FaLock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Password"
                  style={{
                    width: "100%",
                    backgroundColor: "#2B303A",
                    border: "1px solid #4B5563",
                    borderRadius: "8px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    paddingLeft: "46px",
                    paddingRight: "48px",
                    fontSize: "13px",
                    color: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "16px", color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0, zIndex: 10 }}
                >
                  {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
            </div>

            {/* KONFIRMASI PASSWORD */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#E5E7EB" }}>
                KONFIRMASI PASSWORD
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "16px", color: "#9CA3AF", zIndex: 10, pointerEvents: "none" }}>
                  <FaLock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  style={{
                    width: "100%",
                    backgroundColor: "#2B303A",
                    border: "1px solid #4B5563",
                    borderRadius: "8px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    paddingLeft: "46px",
                    paddingRight: "16px",
                    fontSize: "13px",
                    color: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
            </div>

            {/* REGISTER BUTTON */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "4px",
                backgroundColor: "#4F46E5",
                color: "#FFFFFF",
                fontWeight: "600",
                paddingTop: "10px",
                paddingBottom: "10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "13px"
              }}
            >
              {loading ? (
                <span>Mendaftarkan...</span>
              ) : (
                <>
                  <FaUserPlus size={14} />
                  <span>Daftar Akun Baru</span>
                </>
              )}
            </button>

            {/* LINK KEMBALI KE LOGIN */}
            <p style={{ textAlign: "center", fontSize: "12px", color: "#9CA3AF", margin: 0, marginTop: "4px" }}>
              Sudah punya akun?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
                style={{ background: "none", border: "none", color: "#93C5FD", fontWeight: "600", cursor: "pointer", fontSize: "12px", padding: 0, textDecoration: "underline" }}
              >
                Masuk di sini
              </button>
            </p>
          </form>
        )}

        {/* FOOTER COPYRIGHT */}
        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(75, 85, 99, 0.6)", textAlign: "center", fontSize: "10px", color: "#9CA3AF" }}>
          © 2026 PT. SMART Tbk. All rights reserved.
        </div>
      </div>
    </div>
  );
}
