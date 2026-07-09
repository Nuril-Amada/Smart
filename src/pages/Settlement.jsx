import { useState } from "react";
import FilterSettlement from "../components/settlement/FilterSettlement";
import SummaryCard from "../components/settlement/SummaryCard";
import RecentSettlementTable from "../components/settlement/Table";

export default function Settlement() {
    // State filter tanggal — dikelola di sini (parent),
    // supaya nanti bisa dipakai bareng buat fetch data KPI Card,
    // Chart, dan Table sekaligus (semua ikut filter yang sama).
    const [tanggalAwal, setTanggalAwal] = useState("");
    const [tanggalAkhir, setTanggalAkhir] = useState("");

    return (
        <div className="space-y-6">

            {/* Filter Settlement — di atas KPI Card */}
            <FilterSettlement
                tanggalAwal={tanggalAwal}
                setTanggalAwal={setTanggalAwal}
                tanggalAkhir={tanggalAkhir}
                setTanggalAkhir={setTanggalAkhir}
            />

            {/* Summary Card / KPI Card */}
            <SummaryCard />

            {/* Chart & Table */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                <div className="xl:col-span-12 min-w-0">
                    <RecentSettlementTable />
                </div>

            </div>

        </div>
    );
}