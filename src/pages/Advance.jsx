import { useState } from "react";
import SummaryCard from "../components/advance/SummaryCard";
import FilterAdvance from "../components/advance/FilterAdvance";
import WaitingAdvanceTable from "../components/advance/WaitingAdvanceTable";


export default function Advance() {
    // State filter tanggal — WAJIB dideklarasikan di sini,
    // karena FilterAdvance butuh prop-prop ini dikirim dari parent.
    const [tanggalAwal, setTanggalAwal] = useState("");
    const [tanggalAkhir, setTanggalAkhir] = useState("");

    return (
        <div className="space-y-6">

            {/* Filter Advance — di atas KPI Card */}
            <FilterAdvance
                tanggalAwal={tanggalAwal}
                setTanggalAwal={setTanggalAwal}
                tanggalAkhir={tanggalAkhir}
                setTanggalAkhir={setTanggalAkhir}
            />

            {/* Summary */}

            <SummaryCard />

            {/* Table */}

            <WaitingAdvanceTable />

        </div>
    );
}