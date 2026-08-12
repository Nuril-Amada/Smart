import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import MainLayout from "./layouts/MainLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import CetakCek from "./pages/CetakCek";
import Settlement from "./pages/Settlement";
import Advance from "./pages/Advance";
import CashOpname from "./pages/CashOpname";
import MasterData from "./pages/MasterData";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard */}
        <Route path="/Dashboard" element={<MainLayout><Dashboard /></MainLayout>} />

        {/* Daftar Cetak Cek */}
        <Route path="/CetakCek" element={<MainLayout><CetakCek /></MainLayout>} />

        {/* Settlement */}
        <Route path="/Settlement" element={<MainLayout><Settlement /></MainLayout>} />

        {/* Advance */}
        <Route path="/Advance" element={<MainLayout><Advance /></MainLayout>} />

        {/* Cash Opname */}
        <Route path="/CashOpname" element={<MainLayout><CashOpname /></MainLayout>} />

        {/* Master Data */}
        <Route path="/MasterData" element={<MainLayout><MasterData /></MainLayout>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;