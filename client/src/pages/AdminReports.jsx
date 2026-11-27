import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, LoaderCircle } from 'lucide-react';
import api from '../services/api';
import { downloadFile } from '../services/download';

const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const label = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState({ from: '', to: '', paidOnly: true });

  useEffect(() => {
    api.get('/admin/reports').then(({ data: res }) => setData(res)).catch((e) => setError(e.response?.data?.message || 'Unable to load reports.'));
  }, []);

  const exportXero = () => {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    if (range.paidOnly) params.set('paidOnly', 'true');
    downloadFile(`/admin/export/xero?${params}`, 'xero-invoices.csv').catch(() => setError('Export failed.'));
  };

  if (!data) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-50">{error ? <p className="text-red-600">{error}</p> : <LoaderCircle className="animate-spin text-orange-600" size={32} />}</main>;
  }
  const maxOrders = Math.max(1, ...data.byDivision.map((d) => d.orders));
  const maxMonth = Math.max(1, ...data.byMonth.map((m) => m.revenue));

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600"><ArrowLeft size={17} /> Back to dashboard</Link>
        <h1 className="text-3xl font-black text-gray-950">Reports & analytics</h1>

        <div className="grid gap-4 sm:grid-cols-3">
          {[['Orders (excl. cancelled)', data.totals.orders], ['Revenue collected', money(data.totals.revenue)], ['Billed value', money(data.totals.billed)]].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs text-gray-500">{k}</p><p className="mt-1 text-3xl font-black">{v}</p></div>
          ))}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-bold">Product-family throughput</h2>
          <div className="mt-4 space-y-4">
            {data.byDivision.map((d) => (
              <div key={d.division}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{label(d.division)}</span><span className="text-gray-500">{d.orders} orders · {d.units} units · {money(d.revenue)}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-gray-100"><div className="h-2.5 rounded-full bg-orange-500" style={{ width: `${(d.orders / maxOrders) * 100}%` }} /></div>
                <p className="mt-1 text-xs text-gray-400">{d.inProduction} in production · {d.completed} completed</p>
              </div>
            ))}
            {data.byDivision.length === 0 && <p className="text-sm text-gray-500">No orders yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-bold">Revenue by month</h2>
          <div className="mt-6 flex h-48 items-end gap-2">
            {data.byMonth.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${m.month}: ${money(m.revenue)} · ${m.orders} orders`}>
                <div className="w-full rounded-t bg-gray-900" style={{ height: `${Math.max(4, (m.revenue / maxMonth) * 100)}%` }} />
                <span className="text-[10px] text-gray-500">{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-bold">Accounting export (Xero invoice CSV)</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold">From<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-semibold">To<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="flex items-center gap-2 pb-2 text-xs"><input type="checkbox" checked={range.paidOnly} onChange={(e) => setRange({ ...range, paidOnly: e.target.checked })} /> Paid orders only</label>
            <button onClick={exportXero} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white"><Download size={16} /> Export CSV</button>
          </div>
        </section>
      </div>
    </main>
  );
}