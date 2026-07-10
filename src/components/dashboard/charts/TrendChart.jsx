import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

import { useState } from 'react';

export default function TrendChart({ data, startDate, endDate, tanggalAwal, setTanggalAwal, tanggalAkhir, setTanggalAkhir }) {
  // calculate average of total values
  const average = data && data.length > 0 ? data.reduce((sum, item) => sum + (item.total || 0), 0) / data.length : 0;
  const [filterPeriod, setFilterPeriod] = useState('hari');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative" style={{ marginRight: "20px", marginBottom: "20px" }}>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 text-center mb-2" style={{ marginTop: "10px" }}>Trend Pengeluaran</h3>
        <div className="flex justify-end">
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="border border-gray-300 rounded px-1 py-0.5 text-xs" style={{ marginRight: "20px", marginBottom: "10px" }}>
            <option value="hari">Hari</option>
            <option value="bulan">Bulan</option>
            <option value="tahun">Tahun</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ left: 15, right: 15 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} interval={0} />
          <YAxis tickFormatter={(value) => `${value / 1000000}M`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatRupiah(value)} />
          {/* Average reference line */}
          {/* <ReferenceLine y={average} stroke="#ff0000" strokeWidth={2} strokeDasharray="3 3" /> */}
          <Line type="monotone" dataKey="total" stroke="#899097" strokeWidth={3} dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}