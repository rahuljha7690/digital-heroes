
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileImage,
  LoaderCircle,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  AlertCircle,
} from 'lucide-react';

import api from '../services/api';
import AdminPrintFiles from '../components/AdminPrintFiles';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) =>
  date ? new Date(date).toLocaleString('en-IN') : '—';

const badgeStyles = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  changes_requested: 'bg-red-100 text-red-800',
  superseded: 'bg-gray-100 text-gray-600',
};

const statusFlow = {
  order: ['artwork', 'cancelled'],
  artwork: ['proof', 'cancelled'],
  proof: ['production', 'cancelled'],
  production: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function AdminOrderDetails() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [proofs, setProofs] = useState([]);

  const [previewUrl, setPreviewUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [creatingProof, setCreatingProof] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchOrderData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [orderResponse, proofResponse] = await Promise.all([
        api.get(`/admin/orders/${orderId}`),
        api.get(`/admin/orders/${orderId}/proofs`),
      ]);

      setOrder(orderResponse.data.order);
      setProofs(proofResponse.data.proofs || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load order information.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  const createProof = async (e) => {
    e.preventDefault();

    if (!previewUrl.trim()) {
      setError('Please provide a proof preview URL.');
      return;
    }

    try {
      setCreatingProof(true);
      setError('');
      setMessage('');

      const { data } = await api.post(
        `/proofs/orders/${orderId}`,
        {
          previewUrl: previewUrl.trim(),
          notes: notes.trim(),
        }
      );

      setMessage(data.message);
      setPreviewUrl('');
      setNotes('');

      await fetchOrderData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to create proof.'
      );
    } finally {
      setCreatingProof(false);
    }
  };

  // Render the customer's saved design into a proof automatically.
  const generateProof = async () => {
    try {
      setCreatingProof(true);
      setError('');
      setMessage('');

      const { data } = await api.post(
        `/proofs/orders/${orderId}/generate`,
        {
          notes: notes.trim(),
        }
      );

      setMessage(data.message);
      setNotes('');

      await fetchOrderData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to generate proof.'
      );
    } finally {
      setCreatingProof(false);
    }
  };

  const toggleArchive = async () => {
    try {
      const { data } = await api.patch(
        `/admin/orders/${orderId}/archive`,
        {
          archived: !order.archived,
        }
      );

      setMessage(data.message);
      await fetchOrderData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to update archive state.'
      );
    }
  };

  const updateStatus = async (nextStatus) => {
    if (
      nextStatus === 'production' &&
      (!order.currentProof || !order.proofApproved)
    ) {
      setError(
        'Customer proof approval is required before production.'
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to move this order to ${nextStatus}?`
      )
    ) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError('');
      setMessage('');

      const { data } = await api.patch(
        `/admin/orders/${orderId}/status`,
        { status: nextStatus }
      );

      setOrder(data.order);
      setMessage(data.message);

      await fetchOrderData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to update order status.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoaderCircle
          size={34}
          className="animate-spin text-orange-600"
        />
      </div>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8">
          <p className="text-red-600">
            {error || 'Order not found.'}
          </p>

          <Link
            to="/admin"
            className="mt-5 inline-block font-bold text-orange-600"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const nextStatuses = statusFlow[order.status] || [];
  const latestProof = proofs[0];

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600"
            >
              <ArrowLeft size={17} />
              Back to dashboard
            </Link>

            <p className="mt-5 text-xs font-bold uppercase tracking-widest text-orange-600">
              Production workspace
            </p>

            <h1 className="mt-2 text-3xl font-black text-gray-950">
              {order.orderNumber}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Created {formatDate(order.createdAt)}
            </p>
          </div>

          <button
            onClick={fetchOrderData}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {message && (
          <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {/* Order status */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Current production stage
              </p>

              <h2 className="mt-2 text-2xl font-black capitalize">
                {order.status}
              </h2>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${
                order.proofApproved
                  ? 'bg-green-100 text-green-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.proofApproved
                ? 'Proof approved'
                : 'Proof not approved'}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {nextStatuses.map((nextStatus) => {
              const disabled =
                nextStatus === 'production' &&
                (!order.currentProof || !order.proofApproved);

              return (
                <button
                  key={nextStatus}
                  disabled={disabled || updatingStatus}
                  onClick={() => updateStatus(nextStatus)}
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold capitalize text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {updatingStatus
                    ? 'Updating...'
                    : `Move to ${nextStatus}`}
                </button>
              );
            })}
          </div>

          {['completed', 'cancelled'].includes(order.status) && (
            <button
              onClick={toggleArchive}
              className="mt-4 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold hover:bg-gray-50"
            >
              {order.archived
                ? 'Restore from archive'
                : 'Archive order'}
            </button>
          )}

          {order.status === 'proof' && !order.proofApproved && (
            <p className="mt-4 text-xs text-amber-700">
              Production remains locked until the customer approves the latest proof.
            </p>
          )}
        </section>

        {/* Customer and product */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <User size={21} />
              </div>
              <h2 className="text-lg font-bold">
                Customer information
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-gray-400">
                  Customer name
                </p>
                <p className="mt-1 font-semibold">
                  {order.customer?.name || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Email address
                </p>
                <p className="mt-1 break-all font-semibold">
                  {order.customer?.email || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Phone
                </p>
                <p className="mt-1 font-semibold">
                  {order.customer?.phone || '—'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-3 text-orange-700">
                <Package size={21} />
              </div>
              <h2 className="text-lg font-bold">
                Product information
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-gray-400">
                  Product
                </p>
                <p className="mt-1 font-semibold">
                  {order.product?.name || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Division
                </p>
                <p className="mt-1 capitalize font-semibold">
                  {order.product?.division || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Quantity
                </p>
                <p className="mt-1 font-semibold">
                  {order.configuration?.quantity || 1}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Order total
                </p>
                <p className="mt-1 text-xl font-black">
                  {formatCurrency(order.pricing?.total)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Payment status
                </p>
                <p className="mt-1 capitalize font-semibold">
                  {order.paymentStatus}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Configuration */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            Order configuration
          </h2>

          <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-700">
            {JSON.stringify(order.configuration || {}, null, 2)}
          </pre>

          {order.design?.previewUrl && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-bold">
                Submitted design preview
              </p>

              <img
                src={order.design.previewUrl}
                alt="Submitted design"
                className="max-h-96 rounded-xl border border-gray-200 object-contain"
              />
            </div>
          )}
        </section>

        {/* Admin print files */}
        <AdminPrintFiles
          orderId={orderId}
          onMessage={setMessage}
          onError={setError}
        />

        {/* Proof creation */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-700">
              <FileImage size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Create artwork proof
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Submit a preview for customer approval.
              </p>
            </div>
          </div>

          {['completed', 'cancelled'].includes(order.status) ? (
            <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              Proof creation is unavailable for this order.
            </p>
          ) : (
            <>
              {/* Automatic proof generation */}
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-bold text-orange-900">
                  Generate from the customer&apos;s design
                </p>

                <p className="mt-1 text-xs text-orange-800">
                  Renders the saved artwork server-side and creates the next proof version. Optional notes below are included.
                </p>

                <button
                  type="button"
                  onClick={generateProof}
                  disabled={creatingProof || !order.design}
                  className="mt-3 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40"
                >
                  {creatingProof
                    ? 'Working...'
                    : 'Generate proof from design'}
                </button>
              </div>

              {/* Manual proof creation */}
              <form
                onSubmit={createProof}
                className="mt-6 space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Proof preview URL
                  </label>

                  <input
                    type="url"
                    required
                    maxLength={2048}
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    placeholder="https://example.com/proof-preview.png"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    Provide a publicly accessible image URL for the proof preview.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Designer notes
                  </label>

                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add printing instructions or details for the customer..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingProof}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
                >
                  <Send size={17} />
                  {creatingProof
                    ? 'Creating proof...'
                    : 'Create new proof revision'}
                </button>
              </form>
            </>
          )}
        </section>

        {/* Proof history */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-orange-600" size={23} />
            <h2 className="text-lg font-bold">
              Proof version history
            </h2>
          </div>

          {proofs.length === 0 ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center">
              <Clock3 className="mx-auto text-gray-300" size={30} />
              <p className="mt-3 text-sm text-gray-500">
                No proof revisions have been created yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {proofs.map((proof) => (
                <article
                  key={proof._id}
                  className="rounded-xl border border-gray-100 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        Proof version {proof.version}
                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        Created {formatDate(proof.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${
                        badgeStyles[proof.status] ||
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {proof.status.replace('_', ' ')}
                    </span>
                  </div>

                  <img
                    src={proof.previewUrl}
                    alt={`Proof version ${proof.version}`}
                    className="mt-5 max-h-72 rounded-lg border border-gray-100 object-contain"
                  />

                  {proof.notes && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-gray-500">
                        Designer notes
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {proof.notes}
                      </p>
                    </div>
                  )}

                  {proof.customerComment && (
                    <div className="mt-4 rounded-lg bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-800">
                        Customer feedback
                      </p>
                      <p className="mt-2 text-sm text-amber-900">
                        {proof.customerComment}
                      </p>
                    </div>
                  )}

                  {proof.reviewedAt && (
                    <p className="mt-4 text-xs text-gray-400">
                      Reviewed {formatDate(proof.reviewedAt)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="pb-5 text-xs text-gray-400">
          Digital Heroes / Production / {order.orderNumber}
        </div>
      </div>
    </main>
  );
}
