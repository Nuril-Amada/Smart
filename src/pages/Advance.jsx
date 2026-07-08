import SummaryCard from "../components/advance/SummaryCard";
import AdvancePieChart from "../components/advance/AdvancePieChart";
import AdvanceBarChart from "../components/advance/AdvanceBarChart";
import WaitingAdvanceTable from "../components/advance/WaitingAdvanceTable";

export default function Advance() {
    return (
        <div className="space-y-6">

            {/* Header */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">
                    Advance
                </h1>

                <p className="text-gray-500 mt-1">
                    Monitoring transaksi advance dan status penyelesaiannya.
                </p>

            </div>

            {/* Summary */}

            <SummaryCard />

            {/* Chart */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                <AdvancePieChart />

                <AdvanceBarChart />

            </div>

            {/* Table */}

            <WaitingAdvanceTable />

        </div>
    );
}