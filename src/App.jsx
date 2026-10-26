import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout
import MainLayout from "./layouts/MainLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CetakCek from "./pages/CetakCek";
import Settlement from "./pages/Settlement";
import Advance from "./pages/Advance";
import CashOpname from "./pages/CashOpname";
import MasterData from "./pages/MasterData";
import Notification from './pages/Notification';

// Component Proteksi Rute (Harus Login Dulu & Cek Role)
function ProtectedRoute({ children, disallowAdmin = false }) {
  const userStr = localStorage.getItem("navicash_user");
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  let isAdmin = false;
  try {
    const u = JSON.parse(userStr);
    if (u && (u.role || "").toLowerCase() === "admin") {
      isAdmin = true;
    }
  } catch (e) {
    console.error(e);
  }

  // Jika halaman ini dilarang untuk Admin (misal menu operasional), redirect ke MasterData
  if (disallowAdmin && isAdmin) {
    return <Navigate to="/MasterData" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* Redirect Root ke Login */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Dashboard */}
        <Route path="/Dashboard" element={<ProtectedRoute disallowAdmin={true}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />

        {/* Daftar Cetak Cek */}
        <Route path="/CetakCek" element={<ProtectedRoute disallowAdmin={true}><MainLayout><CetakCek /></MainLayout></ProtectedRoute>} />

        {/* Settlement */}
        <Route path="/Settlement" element={<ProtectedRoute disallowAdmin={true}><MainLayout><Settlement /></MainLayout></ProtectedRoute>} />

        {/* Advance */}
        <Route path="/Advance" element={<ProtectedRoute disallowAdmin={true}><MainLayout><Advance /></MainLayout></ProtectedRoute>} />

        {/* Cash Opname */}
        <Route path="/CashOpname" element={<ProtectedRoute disallowAdmin={true}><MainLayout><CashOpname /></MainLayout></ProtectedRoute>} />

        {/* Master Data */}
        <Route path="/MasterData" element={<ProtectedRoute><MainLayout><MasterData /></MainLayout></ProtectedRoute>} />

        {/* Notifikasi */}
        <Route path="/notifications" element={<ProtectedRoute disallowAdmin={true}><MainLayout><Notification /></MainLayout></ProtectedRoute>} />
        
        {/* Catch all route - Redirect to Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;