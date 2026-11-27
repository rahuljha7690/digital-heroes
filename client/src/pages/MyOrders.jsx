
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowUpRight, LoaderCircle } from 'lucide-react';
import api from '../services/api';

const stages = [
  'order',
  'artwork',
  'proof',
  'production',
  'completed',
];

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount || 0);

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/my');
        setOrders(data.orders || []);
      } catch (err) {
        setError(
          err.response?.data?.message || 'Unable to load your orders.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
          Customer workspace
        </p>

        <h1 className="mt-3 text-4xl font-black text-gray-950">
          My orders
        </h1>

        <p className="mt-2 text-gray-500">
          Track your custom print jobs from order to completion.
        </p>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <LoaderCircle className="animate-spin text-orange-600" size={32} />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
            <Package className="mx-auto text-gray-400" size={42} />

            <h2 className="mt-4 text-xl font-bold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Your placed orders will appear here.
            </p>

            <Link
              to="/"
              className="mt-6 inline-flex rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white"
            >
              Explore products
            </Link>
          </div>
        ) : (
          <div className="mt-9 space-y-5">
            {orders.map((order) => {
              const currentStage = stages.indexOf(order.status);

              return (
                <article
                  key={order._id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Order number
                      </p>

                      <h2 className="mt-1 text-lg font-black text-gray-950">
                        {order.orderNumber}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-bold capitalize text-orange-700">
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-gray-100 py-5">
                    {order.product?.image ? (
                      <img
                        src={order.product.image}
                        alt={order.product.name}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
                        <Package className="text-gray-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900">
                        {order.product?.name || 'Product'}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Quantity: {order.configuration?.quantity || 1}
                      </p>

                      {order.design?.name && (
                        <p className="mt-1 text-xs text-gray-500">
                          Design: {order.design.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Order total</p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {formatPrice(
                          order.pricing?.total,
                          order.pricing?.currency
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="mb-4 text-sm font-bold text-gray-800">
                      Production progress
                    </p>

                    <div className="grid grid-cols-5 gap-2">
                      {stages.map((stage, index) => {
                        const active =
                          currentStage >= 0 && index <= currentStage;

                        return (
                          <div key={stage}>
                            <div
                              className={`h-1.5 rounded-full ${
                                active ? 'bg-orange-500' : 'bg-gray-200'
                              }`}
                            />

                            <p
                              className={`mt-2 text-[10px] font-semibold capitalize sm:text-xs ${
                                active ? 'text-gray-900' : 'text-gray-400'
                              }`}
                            >
                              {stage}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      Payment: <span className="font-bold capitalize text-gray-800">
                        {order.paymentStatus}
                      </span>
                    </p>

                    {order.product?.slug && (
                      <Link
                        to={`/product/${order.product.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
                      >
                        Order again <ArrowUpRight size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
