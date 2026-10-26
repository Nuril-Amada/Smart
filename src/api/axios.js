import axios from "axios";

// Ambil baseURL dari .env atau gunakan URL otomatis sesuai IP/host server
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const pathname = window.location.pathname;

    // Jika di-deploy di Apache (folder /navicash)
    if (pathname.includes("/navicash")) {
      return `${origin}/navicash/api`;
    }
  }
  return "http://localhost:8000";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;