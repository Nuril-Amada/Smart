import { useState, useEffect } from "react";

import SummaryCard from "../components/advance/SummaryCard";
import FilterAdvance from "../components/advance/FilterAdvance";
import WaitingAdvanceTable from "../components/advance/WaitingAdvanceTable";

import { getAdvanceSummary } from "../api/advance";
import { exportAdvance } from "../api/export";

export default function Advance() {
    const [tanggalAwal, setTanggalAwal] = useState("");
    const [tanggalAkhir, setTanggalAkhir] = useState("");
    const [summaryData, setSummaryData] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);

    // LIFTED FILTER STATES
    const [filterUser, setFilterUser] = useState("");
    const [filterCostCenter, setFilterCostCenter] = useState("");
    const [filterStatus, setFilterStatus] = useState("All Status");

    // LOAD SUMMARY
    const loadSummary = async () => {
        try {
            const data = await getAdvanceSummary({
                start_date: tanggalAwal || undefined,
                end_date: tanggalAkhir || undefined,
            });

            setSummaryData(data);

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadSummary();
    }, [tanggalAwal, tanggalAkhir, refreshKey]);


    // EXPORT REPORT
    const handleExport = async () => {
        try {
            const blob = await exportAdvance(
                tanggalAwal,
                tanggalAkhir,
                filterUser,
                filterCostCenter,
                filterStatus
            );
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "Advance Report.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                "Export Advance gagal."
            );
        }
    };


    return (
        <div className="space-y-6">

            <FilterAdvance
                tanggalAwal={tanggalAwal}
                setTanggalAwal={setTanggalAwal}
                tanggalAkhir={tanggalAkhir}
                setTanggalAkhir={setTanggalAkhir}
                onExport={handleExport}
            />


            <SummaryCard
                data={summaryData}
            />


            <WaitingAdvanceTable
                startDate={tanggalAwal}
                endDate={tanggalAkhir}
                refreshKey={refreshKey}
                setRefreshKey={setRefreshKey}
                onSummaryUpdate={setSummaryData}
                filterUser={filterUser}
                setFilterUser={setFilterUser}
                filterCostCenter={filterCostCenter}
                setFilterCostCenter={setFilterCostCenter}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
            />

        </div>
    );
}