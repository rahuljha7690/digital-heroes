import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, LoaderCircle, Repeat, Save, ShieldCheck, UserRound } from 'lucide-react';
import api from '../services/api';
import { downloadFile, blobErrorMessage } from '../services/download';
import { useAuth } from '../context/AuthContext';

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount || 0);

const Card = ({ title, children, action }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-black text-gray-950">{title}</h2>
      {action}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/customer/dashboard');
      setData(res);
      setForm((f) => ({ ...f, name: res.profile.name, phone: res.profile.phone || '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = { name: form.name, phone: form.phone };
      if (form.newPassword) Object.assign(payload, { currentPassword: form.currentPassword, newPassword: form.newPassword });
      await api.patch('/customer/profile', payload);
      setNotice('Profile updated.');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const reorder = async (orderId) => {
    setBusyId(orderId); setError('');
    try {
      await api.post(`/orders/${orderId}/reorder`);
      navigate('/my-orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reorder.');
    } finally {
      setBusyId('');
    }
  };

  const invoice = async (order) => {
    try {
      await downloadFile(`/orders/${order._id}/invoice`, `Invoice_${order.orderNumber}.pdf`);
    } catch (err) {
      setError(await blobErrorMessage(err, 'Unable to download invoice.'));
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoaderCircle className="animate-spin text-orange-600" size={32} /></div>;
  }
  if (!data) return <main className="mx-auto max-w-3xl px-5 py-20 text-red-600">{error}</main>;

  const { profile, stats, activeProofs, orders, savedDesigns } = data;
  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500';

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Customer workspace</p>
          <h1 className="mt-2 text-4xl font-black text-gray-950">Hi {user?.name?.split(' ')[0]}.</h1>
        </header>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ['Total orders', stats.totalOrders],
            ['In progress', stats.inProgress],
            ['Completed', stats.completed],
            ['Awaiting payment', stats.awaitingPayment],
            ['Saved designs', stats.savedDesigns],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Account & profile status */}
          <Card title="Account & profile">
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-800"><ShieldCheck size={13} /> {profile.isActive ? 'Active' : 'Inactive'}</span>
              <span className={`rounded-full px-3 py-1 ${profile.profileComplete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {profile.profileComplete ? 'Profile complete' : 'Add a phone number'}
              </span>
            </div>
            <p className="flex items-center gap-2 text-sm text-gray-600"><UserRound size={15} /> {profile.email}</p>
            <p className="mt-1 text-xs text-gray-400">Member since {new Date(profile.memberSince).toLocaleDateString('en-IN')}</p>
            <form onSubmit={saveProfile} className="mt-5 space-y-3">
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
              <input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
              <input className={input} type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} placeholder="Current password (to change it)" />
              <input className={input} type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="New password" />
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={16} /> {saving ? 'Saving...' : 'Save profile'}</button>
            </form>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            {/* Active proofs */}
            <Card title="Active proofs">
              {activeProofs.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing is waiting for your approval.</p>
              ) : (
                <ul className="space-y-3">
                  {activeProofs.map((item) => (
                    <li key={item.orderId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div>
                        <p className="font-bold text-gray-900">{item.orderNumber} · {item.product}</p>
                        <p className="text-xs text-gray-600">Proof v{item.proof.version} · {item.proof.status}</p>
                      </div>
                      <Link to={`/orders/${item.orderId}/proof`} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white">Review proof</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Order history */}
            <Card title="Order history" action={<Link to="/my-orders" className="text-sm font-bold text-orange-600">View all</Link>}>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs uppercase text-gray-400">
                      <tr><th className="pb-2">Order</th><th>Product</th><th>Status</th><th>Total</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map((order) => (
                        <tr key={order._id}>
                          <td className="py-3 font-bold">{order.orderNumber}</td>
                          <td>{order.product?.name}</td>
                          <td>
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold capitalize text-orange-700">{order.status}</span>
                            {order.currentProof && <span className="ml-2 text-xs text-gray-500">proof v{order.currentProof.version}</span>}
                          </td>
                          <td>{money(order.pricing?.total, order.pricing?.currency)}</td>
                          <td className="space-x-2 text-right">
                            <button onClick={() => invoice(order)} title="Download invoice" className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold hover:border-orange-500"><FileText size={14} /> Invoice</button>
                            <button onClick={() => reorder(order._id)} disabled={busyId === order._id} className="inline-flex items-center gap-1 rounded-lg bg-gray-950 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Repeat size={14} /> {busyId === order._id ? '...' : 'Reorder'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Saved designs with configuration */}
        <Card title="Saved designs" action={<Link to="/my-designs" className="text-sm font-bold text-orange-600">Manage designs</Link>}>
          {savedDesigns.length === 0 ? (
            <p className="text-sm text-gray-500">Approved and draft artwork will appear here.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedDesigns.map((design) => (
                <article key={design._id} className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="aspect-[3/2] bg-gray-100">
                    {design.previewUrl && <img src={design.previewUrl} alt={design.name} className="h-full w-full object-contain" />}
                  </div>
                  <div className="space-y-1 p-4 text-sm">
                    <p className="font-bold">{design.name}</p>
                    <p className="flex items-center gap-1 text-xs capitalize text-gray-500">
                      {design.status === 'approved' && <CheckCircle2 size={13} className="text-green-600" />} {design.product?.name} · {design.status}
                    </p>
                    <p className="text-xs text-gray-500">{design.canvas.text} text · {design.canvas.images} image · {design.canvas.shapes} shape</p>
                    {design.lastConfiguration && (
                      <p className="text-xs text-gray-500">
                        Last order: {design.lastConfiguration.quantity} pcs
                        {Object.entries(design.lastConfiguration.options || {}).length > 0 && ` · ${Object.values(design.lastConfiguration.options).join(', ')}`}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}