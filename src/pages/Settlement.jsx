import SummaryCard from "../components/settlement/SummaryCard";
import SettlementPieChart from "../components/settlement/PieChart";
import SettlementBarChart from "../components/settlement/BarChart";
import RecentSettlementTable from "../components/settlement/Table";

export default function Settlement() {
    return (
        <div className="space-y-6">

            {/* Summary Card */}
            <SummaryCard />

            {/* Chart */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                <SettlementPieChart />

                <SettlementBarChart />

            </div>

            {/* Table */}
            <RecentSettlementTable />

        </div>
    );
}