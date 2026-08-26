import { useEffect, useState } from "react";
import FilterDashboard from "../components/dashboard/FilterDashboard";
import KPICard from "../components/dashboard/KPICard";
import GLAccountChart from "../components/dashboard/charts/GLAccountChart";
import CostCenterChart from "../components/dashboard/charts/CostCenterChart";
import TopCostCenterChart from "../components/dashboard/charts/TopCostCenterChart";
import TrendChart from "../components/dashboard/charts/TrendChart";
// import {
//   getSummary,
//   getGLAccount,
//   getCostCenters,
//   getTopCostCenters,
//   getTrend,
// } from "../api/dashboard";
// import { uploadSAP } from "../api/upload";
// import {
//   exportPDF,
//   exportExcel,
// } from "../api/export";
// import { deleteTransactions } from "../api/dashboard";

export default function Dashboard() {

  const [tanggalAwal, setTanggalAwal] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");


  //Trend filter
  const [trendPeriod, setTrendPeriod] = useState("month");

  // Source Dashboard
  const [source, setSource] = useState("rungkut");

  // State Dashboard
  const [dashboardData, setDashboardData] = useState({
    kpi: {},
    glAccountData: [],
    costCenterData: [],
    topCostCenterData: [],
    topCostCenter: null,
    trendData: [],
    transactionData: [],
  });

  const [loading, setLoading] = useState(false);
  // Uploading state
  const [uploading, setUploading] = useState(false);
  // Load Dashboard

  const loadDashboard = async (
    startDate = tanggalAwal,
    endDate = tanggalAkhir,
    period = trendPeriod
  ) => {

    try {

      setLoading(true);

      const [
        summary,
        gl,
        cost,
        top,
        trend,
      ] = await Promise.all([
        getSummary(source, startDate, endDate),
        getGLAccount(source, startDate, endDate),
        getCostCenters(source, startDate, endDate),
        getTopCostCenters(source, startDate, endDate),
        getTrend(
          source,
          period,
          startDate,
          endDate
        ),
      ]);

      setDashboardData({
        kpi: summary.data,
        glAccountData: gl.data,
        costCenterData: cost.data,
        topCostCenterData: top.data.details,
        topCostCenter: top.data.cost_center || null,
        trendData: trend.data,
        transactionData: [],
      });

    } catch (err) {
      console.error(
        "Gagal memuat dashboard :",
        err
      );
      setDashboardData({

        kpi: {},
        glAccountData: [],
        costCenterData: [],
        topCostCenterData: [],
        trendData: [],
        transactionData: []

      });

    } finally {
      setLoading(false);
    }
  };

  // Load Pertama
  useEffect(() => {
    loadDashboard(
      tanggalAwal,
      tanggalAkhir,
      trendPeriod
    );

  }, [source, tanggalAwal, tanggalAkhir]);

  //  Ganti Trend Period
  const handleTrendPeriodChange = (period) => {
    setTrendPeriod(period);
    loadDashboard(
      tanggalAwal,
      tanggalAkhir,
      period
    );

  };

  // Filter Tanggal
  const handleFilter = () => {

    loadDashboard(
      tanggalAwal,
      tanggalAkhir,
      trendPeriod
    );

  };

  // Reset Filter

  const handleReset = () => {

    setTanggalAwal("");
    setTanggalAkhir("");
    loadDashboard(
      "",
      "",
      trendPeriod
    );
  };

  // Import SAP
  // NOTE: tidak pakai alert() lagi. Jika sukses, return pesan (string) yang
  // akan ditampilkan FilterDashboard sebagai toast hijau. Jika gagal, throw
  // error supaya FilterDashboard menangkapnya dan menampilkan toast gagal.
  const handleImport = async (file) => {
    if (!file) return;

    try {
      setUploading(true);

      const response = await uploadSAP(file, source);

      // reload dashboard setelah upload
      loadDashboard(
        tanggalAwal,
        tanggalAkhir,
        trendPeriod
      );

      return (
        `Import berhasil. Rows: ${response.data.rows}, ` +
        `Inserted: ${response.data.inserted}, ` +
        `Skipped: ${response.data.skipped}`
      );

    } catch (err) {

      console.error(err);

      throw new Error(
        err.response?.data?.detail ||
        "Import gagal."
      );

    } finally {

      setUploading(false);

    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {

      const blob = await exportPDF(
        source,
        tanggalAwal,
        tanggalAkhir,
        trendPeriod
      );

      const locationName = source === "perak" ? "Perak" : "Rungkut";
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        `Report Petty Cash ${locationName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return "Export PDF berhasil.";

    } catch (err) {
      console.error(err);
      throw new Error("Gagal export PDF.");
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {

      const blob = await exportExcel(
        source,
        tanggalAwal,
        tanggalAkhir
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        `Export Dashboard_${source}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return "Export Excel berhasil.";
    } catch (err) {
      console.error(err);
      throw new Error("Gagal export Excel.");
    }
  };

  // Hapus Transaksi Per Periode
  const handleDeletePeriod = async ({ tanggalAwal, tanggalAkhir, source }) => {
    try {
      const res = await deleteTransactions(source, tanggalAwal, tanggalAkhir);

      loadDashboard("", "", trendPeriod);
      setTanggalAwal("");
      setTanggalAkhir("");

      return (
        res.data?.message ||
        `Berhasil menghapus ${res.data?.deleted ?? 0} transaksi.`
      );
    } catch (err) {
      console.error(err);
      throw new Error(
        err.response?.data?.detail ||
        "Gagal menghapus transaksi."
      );
    }
  };

  return (
    <div className="space-y-8">
      <FilterDashboard
        source={source}
        setSource={setSource}
        tanggalAwal={tanggalAwal}
        setTanggalAwal={setTanggalAwal}
        tanggalAkhir={tanggalAkhir}
        setTanggalAkhir={setTanggalAkhir}
        onFilter={handleFilter}
        onReset={handleReset}
        onImport={handleImport}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onDeletePeriod={handleDeletePeriod}
        uploading={uploading}
      />

      <KPICard
        data={dashboardData.kpi}
        loading={loading}
        tanggalAwal={tanggalAwal}
        tanggalAkhir={tanggalAkhir}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top 10 Cost Center: butuh data costCenterData ({cost_center, total_amount}) */}
        <TopCostCenterChart
          data={dashboardData.costCenterData}
          totalExpense={dashboardData.kpi.total_expense}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

        {/* Highest Cost Center Detail: butuh data topCostCenterData ({gl_account, gl_name, total_amount}) */}
        <CostCenterChart
          data={dashboardData.topCostCenterData}
          costCenter={dashboardData.topCostCenter}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <GLAccountChart
          data={dashboardData.glAccountData}
          totalExpense={dashboardData.kpi.total_expense}
          loading={loading}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />

        <TrendChart
          data={dashboardData.trendData}
          loading={loading}
          filterPeriod={trendPeriod}
          onChangePeriod={handleTrendPeriodChange}
          tanggalAwal={tanggalAwal}
          tanggalAkhir={tanggalAkhir}
        />
      </div>

    </div>

  );

}