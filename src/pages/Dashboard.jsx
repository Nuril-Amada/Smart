import { useState } from "react";

import FilterDashboard from "../components/dashboard/FilterDashboard";
import KPICard from "../components/dashboard/KPICard";

import GLAccountChart from "../components/dashboard/charts/GLAccountChart";
import CostCenterChart from "../components/dashboard/charts/CostCenterChart";
import TopCostCenterChart from "../components/dashboard/charts/TopCostCenterChart";
import TrendChart from "../components/dashboard/charts/TrendChart";

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
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <TopCostCenterChart
          data={dashboardData.topCostCenterData}
          loading={loading}
        />

        <CostCenterChart
          data={dashboardData.costCenterData}
          loading={loading}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <GLAccountChart
          data={dashboardData.glAccountData}
          loading={loading}
        />

        <TrendChart
          data={dashboardData.trendData}
          loading={loading}
        />

      </div>

      {/*
      <TransactionTable
        data={dashboardData.transactionData}
        loading={loading}
      />
      */}

    </div>
  );
}