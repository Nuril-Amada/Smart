import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import MainLayout from "./layouts/MainLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import CetakCek from "./pages/CetakCek";
import BuatCekBaru from "./pages/BuatCekBaru";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />

        {/* Daftar Cetak Cek */}
        <Route path="/CetakCek" element={<MainLayout><CetakCek /></MainLayout>} />

        {/* Buat Cek Baru */}
        <Route path="/CetakCekBaru" element={<MainLayout><BuatCekBaru /></MainLayout>} />

        {/* Settlement */}
        <Route path="/Settlement" element={<MainLayout><Settlement /></MainLayout>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;