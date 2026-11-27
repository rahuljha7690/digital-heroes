
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, LoaderCircle } from 'lucide-react';
import api from '../services/api';

export default function ProofReview() {
  const { orderId } = useParams();

  const [proofs, setProofs] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const latestProof = proofs.find(
    (proof) => proof.status === 'pending'
  );

  const fetchProofs = async () => {
    try {
      const { data } = await api.get(`/proofs/orders/${orderId}`);
      setProofs(data.proofs || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load proofs.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
  }, [orderId]);

  const handleReview = async (action) => {
    if (!latestProof || submitting) return;

    if (action === 'request_changes' && !comment.trim()) {
      setError('Please explain what changes you need.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const { data } = await api.patch(
        `/proofs/${latestProof._id}/review`,
        { action, comment }
      );

      setMessage(data.message);
      setComment('');

      await fetchProofs();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to submit your review.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/my-orders"
          className="text-sm font-semibold text-orange-600"
        >
          ← Back to my orders
        </Link>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
          Artwork approval
        </p>

        <h1 className="mt-3 text-4xl font-black text-gray-950">
          Review your proof
        </h1>

        <p className="mt-2 text-gray-500">
          Review the artwork carefully before approving it for production.
        </p>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {proofs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-4 text-xl font-bold">
              No proofs available
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Your artwork proof will appear here once it is prepared.
            </p>
          </div>
        ) : (
          <>
            {latestProof && (
              <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
                  <h2 className="text-lg font-bold">
                    Proof v{latestProof.version}
                  </h2>

                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                    Awaiting approval
                  </span>
                </div>

                <div className="bg-gray-100 p-4">
                  <img
                    src={latestProof.previewUrl}
                    alt={`Artwork proof version ${latestProof.version}`}
                    className="mx-auto max-h-[600px] max-w-full rounded-lg object-contain"
                  />
                </div>

                {latestProof.notes && (
                  <div className="border-t border-gray-100 p-5">
                    <h3 className="font-bold">Designer notes</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      {latestProof.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-4 border-t border-gray-100 p-5">
                  <label className="block text-sm font-bold">
                    Comments or requested changes
                  </label>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe any corrections needed..."
                    className="w-full rounded-xl border border-gray-200 p-4 text-sm outline-none focus:border-orange-500"
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleReview('approve')}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      {submitting ? 'Submitting...' : 'Approve proof'}
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleReview('request_changes')}
                      className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Request changes
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="text-xl font-black text-gray-900">
                Proof history
              </h2>

              <div className="mt-4 space-y-3">
                {proofs.map((proof) => (
                  <div
                    key={proof._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div>
                      <h3 className="font-bold">
                        Version {proof.version}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(proof.createdAt).toLocaleString('en-IN')}
                      </p>

                      {proof.customerComment && (
                        <p className="mt-2 text-sm text-gray-600">
                          Your comment: {proof.customerComment}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-2 text-xs font-bold capitalize text-gray-700">
                      {proof.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
