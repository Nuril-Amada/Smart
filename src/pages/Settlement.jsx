import SummaryCard from "../components/settlement/SummaryCard";
import SettlementTrendChart from "../components/settlement/TrendChart";
import RecentSettlementTable from "../components/settlement/Table";

export default function Settlement() {
    return (
        <div className="space-y-6">

            {/* Summary Card */}
            <SummaryCard />

            {/* Chart */}
            {/* Table */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                <div className="xl:col-span-4">
                    <SettlementTrendChart />
                </div>

                <div className="xl:col-span-8 min-w-0">
                    <RecentSettlementTable />
                </div>

            </div>

        </div>
    );
}