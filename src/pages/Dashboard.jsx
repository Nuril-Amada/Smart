import { useState, useEffect } from "react";

import FilterDashboard from "../components/dashboard/FilterDashboard";
import KPICard from "../components/dashboard/KPICard";

import GLAccountChart from "../components/dashboard/charts/GLAccountChart";
import CostCenterChart from "../components/dashboard/charts/CostCenterChart";
import TopCostCenterChart from "../components/dashboard/charts/TopCostCenterChart";
import TrendChart from "../components/dashboard/charts/TrendChart";

// import { getDashboardData } from "../api/dashboard";
// import TransactionTable from "../components/dashboard/TransactionTable";

export default function Dashboard() {

  const [tanggalAwal, setTanggalAwal] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");

  // State untuk data dashboard
  const [dashboardData, setDashboardData] = useState({
    kpi: {},
    glAccountData: [],
    costCenterData: [],
    topCostCenterData: [],
    trendData: [],
    transactionData: [],
  });

  // State loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch data dari backend database saat tanggal filter berubah
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        // Hubungkan ke API backend database di sini:
        // const result = await getDashboardData({
        //   start_date: tanggalAwal || undefined,
        //   end_date: tanggalAkhir || undefined,
        // });
        // setDashboardData(result);
      } catch (err) {
        console.error("Gagal memuat data dashboard:", err);
        setError("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [tanggalAwal, tanggalAkhir]);

  return (
    <div className="space-y-8">

      <FilterDashboard
        tanggalAwal={tanggalAwal}
        setTanggalAwal={setTanggalAwal}
        tanggalAkhir={tanggalAkhir}
        setTanggalAkhir={setTanggalAkhir}
      />

      <KPICard
        data={dashboardData.kpi}
        loading={loading}
        tanggalAwal={tanggalAwal}
        tanggalAkhir={tanggalAkhir}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <TopCostCenterChart
          data={dashboardData.topCostCenterData}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

        <CostCenterChart
          data={dashboardData.costCenterData}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <GLAccountChart
          data={dashboardData.glAccountData}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

        <TrendChart
          data={dashboardData.trendData}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

      </div>

      {/*
      <TransactionTable
        data={dashboardData.transactionData}
        loading={loading}
        tanggalAwal={tanggalAwal}
        tanggalAkhir={tanggalAkhir}
      />
      */}

    </div>
  );
}