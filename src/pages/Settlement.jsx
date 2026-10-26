import { useEffect, useState } from "react";

import FilterSettlement from "../components/settlement/FilterSettlement";
import SummaryCard from "../components/settlement/SummaryCard";
import RecentSettlementTable from "../components/settlement/Table";
import {getSettlementSummary} from "../api/settlement";
import { exportSettlement } from "../api/export";
export default function Settlement() {

    const [tanggalAwal, setTanggalAwal] = useState("");
    const [tanggalAkhir, setTanggalAkhir] = useState("");
    const [summary, setSummary] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);

    // LIFTED FILTER STATES
    const [filterUser, setFilterUser] = useState("");
    const [filterCostCenter, setFilterCostCenter] = useState("");
    const [filterStatus, setFilterStatus] = useState("All Source");

    // Load Summary
    const loadSummary = async () => {

        try {

            const result = await getSettlementSummary({

                start_date: tanggalAwal || undefined,
                end_date: tanggalAkhir || undefined,

            });

            setSummary(result);

        } catch (err) {

            console.error(err);

        }
    };

    useEffect(() => {

        loadSummary();

    }, [
        refreshKey,
        tanggalAwal,
        tanggalAkhir,
    ]);

    // Export Excel
    const handleExport = async () => {
        try {
            const blob = await exportSettlement(
                tanggalAwal,
                tanggalAkhir,
                filterUser,
                filterCostCenter,
                filterStatus,
                filterStatus
            );
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "Settlement Report.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                "Export Settlement gagal."
            );
        }
    };

    return (

        <div className="space-y-6">
            <FilterSettlement
                tanggalAwal={tanggalAwal}
                setTanggalAwal={setTanggalAwal}
                tanggalAkhir={tanggalAkhir}
                setTanggalAkhir={setTanggalAkhir}
                onExport={handleExport}
            />

            <SummaryCard
                data={summary}
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                <div className="xl:col-span-12 min-w-0">

                    <RecentSettlementTable
                        startDate={tanggalAwal}
                        endDate={tanggalAkhir}
                        refreshKey={refreshKey}
                        onSummaryUpdate={setSummary}
                        filterUser={filterUser}
                        setFilterUser={setFilterUser}
                        filterCostCenter={filterCostCenter}
                        setFilterCostCenter={setFilterCostCenter}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                    />

                </div>

            </div>

        </div>

    );

}