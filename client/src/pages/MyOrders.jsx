import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Repeat, FileText, CreditCard, Upload, LoaderCircle } from 'lucide-react';
import api from '../services/api';
import { downloadFile, blobErrorMessage } from '../services/download';

const stages = ['order', 'artwork', 'proof', 'production', 'completed'];

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount || 0);

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/my');
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Returning from Stripe: confirm the payment server-side, then refresh.
    const paidId = searchParams.get('paid');
    const run = async () => {
      if (paidId) {
        try {
          const { data } = await api.post(`/payments/orders/${paidId}/confirm`);
          setNotice(data.paymentStatus === 'paid' ? 'Payment received. Thank you!' : 'Payment is still processing. Refresh in a moment.');
        } catch {
          setError('Unable to confirm your payment yet.');
        }
        setSearchParams({}, { replace: true });
      } else if (searchParams.get('cancelled')) {
        setNotice('Payment was cancelled. You can pay any time from this page.');
        setSearchParams({}, { replace: true });
      }
      fetchOrders();
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(await blobErrorMessage(err, 'Something went wrong.'));
    } finally {
      setBusy('');
    }
  };

  const reorder = (order) =>
    act(`re-${order._id}`, async () => {
      await api.post(`/orders/${order._id}/reorder`);
      setNotice('Reorder placed from your saved artwork.');
      await fetchOrders();
    });

  const pay = (order) =>
    act(`pay-${order._id}`, async () => {
      const { data } = await api.post(`/payments/orders/${order._id}/checkout`);
      window.location.href = data.url;
    });

  const invoice = (order) =>
    act(`inv-${order._id}`, () => downloadFile(`/orders/${order._id}/invoice`, `Invoice_${order.orderNumber}.pdf`));

  const uploadArtwork = (order, file) => {
    if (!file) return;
    act(`up-${order._id}`, async () => {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/orders/${order._id}/artwork`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNotice(`"${file.name}" uploaded. Our team will prepare your proof.`);
      await fetchOrders();
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Customer workspace</p>
        <h1 className="mt-3 text-4xl font-black text-gray-950">My orders</h1>
        <p className="mt-2 text-gray-500">Track your custom print jobs from order to completion.</p>

        {error && <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {notice && <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

        {loading ? (
          <div className="flex justify-center py-24"><LoaderCircle className="animate-spin text-orange-600" size={32} /></div>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
            <Package className="mx-auto text-gray-400" size={42} />
            <h2 className="mt-4 text-xl font-bold">No orders yet</h2>
            <p className="mt-2 text-sm text-gray-500">Your placed orders will appear here.</p>
            <Link to="/" className="mt-6 inline-flex rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white">Explore products</Link>
          </div>
        ) : (
          <div className="mt-9 space-y-5">
            {orders.map((order) => {
              const currentStage = stages.indexOf(order.status);
              const canPay = order.paymentStatus !== 'paid' && order.status !== 'cancelled';
              const canUpload = !['completed', 'cancelled'].includes(order.status);
              return (
                <article key={order._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Order number</p>
                      <h2 className="mt-1 text-lg font-black text-gray-950">{order.orderNumber}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                        {order.reorderOf && ' · reorder'}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-bold capitalize text-orange-700">{order.status}</span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-gray-100 py-5">
                    {order.design?.previewUrl || order.product?.image ? (
                      <img src={order.design?.previewUrl || order.product.image} alt={order.product?.name} className="h-20 w-20 rounded-xl border border-gray-100 object-contain" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100"><Package className="text-gray-400" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900">{order.product?.name || 'Product'}</h3>
                      <p className="mt-1 text-sm text-gray-500">Quantity: {order.configuration?.quantity || 1}</p>
                      {order.design?.name && <p className="mt-1 text-xs text-gray-500">Design: {order.design.name}</p>}
                      {order.currentProof && <p className="mt-1 text-xs text-gray-500">Proof v{order.currentProof.version} · {order.currentProof.status.replace('_', ' ')}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Order total (incl. tax)</p>
                      <p className="mt-1 text-lg font-black text-gray-950">{formatPrice(order.pricing?.total, order.pricing?.currency)}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="mb-4 text-sm font-bold text-gray-800">Production progress</p>
                    <div className="grid grid-cols-5 gap-2">
                      {stages.map((stage, index) => {
                        const active = currentStage >= 0 && index <= currentStage;
                        return (
                          <div key={stage}>
                            <div className={`h-1.5 rounded-full ${active ? 'bg-orange-500' : 'bg-gray-200'}`} />
                            <p className={`mt-2 text-[10px] font-semibold capitalize sm:text-xs ${active ? 'text-gray-900' : 'text-gray-400'}`}>{stage}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      Payment: <span className="font-bold capitalize text-gray-800">{order.paymentStatus}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {canPay && (
                        <button onClick={() => pay(order)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">
                          <CreditCard size={15} /> {busy === `pay-${order._id}` ? 'Redirecting...' : 'Pay now'}
                        </button>
                      )}
                      {order.status === 'proof' && (
                        <Link to={`/orders/${order._id}/proof`} className="inline-flex items-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Review artwork proof</Link>
                      )}
                      {canUpload && (
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-orange-500">
                          <Upload size={15} /> {busy === `up-${order._id}` ? 'Uploading...' : 'Upload artwork'}
                          <input type="file" accept=".pdf,.svg,.ai,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { uploadArtwork(order, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                      )}
                      <button onClick={() => invoice(order)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-orange-500 disabled:opacity-50">
                        <FileText size={15} /> Invoice
                      </button>
                      <button onClick={() => reorder(order)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
                        <Repeat size={15} /> {busy === `re-${order._id}` ? 'Placing...' : 'Reorder'}
                      </button>
                    </div>
                  </div>
                  {order.artworkFiles?.length > 0 && (
                    <p className="mt-3 text-xs text-gray-500">Uploaded artwork: {order.artworkFiles.map((f) => f.originalName).join(', ')}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}