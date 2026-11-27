import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const STATUS_OPTIONS = [
  "all",
  "order",
  "artwork",
  "proof",
  "production",
  "completed",
  "cancelled",
];

const NEXT_STATUSES = {
  quote: ["order", "cancelled"],
  order: ["artwork", "cancelled"],
  artwork: ["proof", "cancelled"],
  proof: ["production", "cancelled"],
  production: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusStyles = {
  quote: "bg-purple-50 text-purple-700",
  order: "bg-blue-50 text-blue-700",
  artwork: "bg-amber-50 text-amber-700",
  proof: "bg-orange-50 text-orange-700",
  production: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

const StatCard = ({ title, value, icon: Icon, detail, color }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon size={20} />
      </div>
    </div>

    <h3 className="mt-5 text-2xl font-bold tracking-tight text-gray-900">
      {value}
    </h3>

    <p className="mt-2 text-xs text-gray-500">{detail}</p>
  </div>
);

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold capitalize ${
      statusStyles[status] || "bg-gray-100 text-gray-600"
    }`}
  >
    {status || "unknown"}
  </span>
);

function AdminDashboard() {
  const { user, logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const { data } = await api.get("/admin/dashboard/stats");
      setStats(data.stats);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load dashboard statistics.",
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/admin/orders", {
        params: {
          search: search.trim(),
          status,
          page,
          limit: 10,
        },
      });

      setOrders(data.orders || []);
      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalOrders: 0,
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load orders. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const refreshDashboard = async () => {
    setNotice("");
    await Promise.all([fetchStats(), fetchOrders()]);
  };

  const changeStatus = async (order) => {
    const nextStatuses = NEXT_STATUSES[order.status] || [];

    if (!nextStatuses.length) return;

    let nextStatus;

    if (order.status === "proof") {
      if (!order.currentProof || !order.proofApproved) {
        setNotice(
          `Order ${order.orderNumber} needs customer proof approval before production.`,
        );
        return;
      }

      nextStatus = "production";
    } else {
      nextStatus = nextStatuses.find((item) => item !== "cancelled");
    }

    if (!nextStatus) return;

    const confirmed = window.confirm(
      `Move ${order.orderNumber} from ${order.status} to ${nextStatus}?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingOrder(order._id);
      setNotice("");

      await api.patch(`/admin/orders/${order._id}/status`, {
        status: nextStatus,
      });

      setNotice(`${order.orderNumber} moved to ${nextStatus} successfully.`);

      await Promise.all([fetchOrders(), fetchStats()]);
    } catch (err) {
      setNotice(
        err.response?.data?.message || "Unable to update order status.",
      );
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const pageTitle =
    status === "all"
      ? "All orders"
      : `${status.charAt(0).toUpperCase()}${status.slice(1)} orders`;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-100 bg-[#111827] text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              DIGITAL<span className="text-orange-400">.</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[3px] text-gray-400">
              Heroes Admin
            </p>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <div className="px-4 py-7">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[2px] text-gray-500">
            Workspace
          </p>

          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold">
            <LayoutDashboard size={19} className="text-orange-400" />
            Dashboard
          </div>

          <button
            onClick={() => {
              setStatus("all");
              setPage(1);
              setSidebarOpen(false);
              document.getElementById("orders-section")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <ClipboardList size={19} />
            Orders
          </button>

          <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-500">
            <Package size={19} />
            Products
            <span className="ml-auto text-[9px]">NEXT</span>
          </div>

          <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-500">
            <Users size={19} />
            Customers
            <span className="ml-auto text-[9px]">NEXT</span>
          </div>

          <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-500">
            <Activity size={19} />
            Analytics
            <span className="ml-auto text-[9px]">NEXT</span>
          </div>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 font-bold text-gray-900">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name || "Administrator"}
              </p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs text-gray-400">
                Digital Heroes / Workspace
              </p>
              <h1 className="text-lg font-bold">Production overview</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={refreshDashboard}
              disabled={loading || statsLoading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 sm:text-sm"
            >
              <RefreshCw
                size={15}
                className={loading || statsLoading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="hidden h-8 w-px bg-gray-200 sm:block" />

            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold">{user?.name}</p>
              <p className="text-[10px] text-gray-400">Admin account</p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-8">
          {/* Page heading */}
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[2px] text-orange-600">
                Operations center
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                Good to see you, {user?.name?.split(" ")[0] || "Admin"}.
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Here's what's happening across your production floor.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-500">
              <ShieldCheck size={16} className="text-emerald-600" />
              Secure admin workspace
            </div>
          </section>

          {/* Notifications */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={17} />
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1">{notice}</div>
              <button onClick={() => setNotice("")} aria-label="Dismiss notice">
                <X size={17} />
              </button>
            </div>
          )}

          {/* Statistics */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Business snapshot</h3>
              <span className="text-xs text-gray-400">
                Live database figures
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total revenue"
                value={
                  statsLoading ? "..." : formatCurrency(stats?.totalRevenue)
                }
                icon={DollarSign}
                detail="Orders marked as paid"
                color="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Total orders"
                value={statsLoading ? "..." : (stats?.totalOrders ?? 0)}
                icon={ClipboardList}
                detail="All orders received"
                color="bg-blue-50 text-blue-700"
              />

              <StatCard
                title="Active jobs"
                value={statsLoading ? "..." : (stats?.pendingOrders ?? 0)}
                icon={Clock3}
                detail="Not yet completed or cancelled"
                color="bg-amber-50 text-amber-700"
              />

              <StatCard
                title="Completed jobs"
                value={statsLoading ? "..." : (stats?.completedOrders ?? 0)}
                icon={CheckCircle2}
                detail="Successfully completed"
                color="bg-purple-50 text-purple-700"
              />
            </div>
          </section>

          {/* Secondary statistics */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-sm text-gray-500">Registered customers</p>
                <p className="mt-2 text-2xl font-bold">
                  {statsLoading ? "..." : (stats?.totalCustomers ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Users size={22} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-sm text-gray-500">Active products</p>
                <p className="mt-2 text-2xl font-bold">
                  {statsLoading ? "..." : (stats?.totalProducts ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-orange-50 p-3 text-orange-700">
                <Box size={22} />
              </div>
            </div>
          </section>

          {/* Production pipeline */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h3 className="font-bold">Production pipeline</h3>
              <p className="mt-1 text-xs text-gray-500">
                Overview of jobs across every production stage.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {STATUS_OPTIONS.slice(1, 6).map((item, index) => {
                const icons = [
                  ClipboardList,
                  Package,
                  ShieldCheck,
                  Printer,
                  CheckCircle2,
                ];

                const Icon = icons[index];

                return (
                  <button
                    key={item}
                    onClick={() => {
                      setStatus(item);
                      setPage(1);
                      document
                        .getElementById("orders-section")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        });
                    }}
                    className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                      status === item
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <Icon size={19} className="mb-3 text-orange-600" />
                    <p className="text-xs capitalize text-gray-500">{item}</p>
                    <p className="mt-1 text-xl font-bold">
                      {statsLoading
                        ? "..."
                        : stats?.ordersByStatus?.[item] || 0}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Orders */}
          <section
            id="orders-section"
            className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h3 className="text-lg font-bold">{pageTitle}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Manage customer jobs and production progress.
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search order, customer, product..."
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            {/* Status filters */}
            <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-5 py-4 sm:px-6">
              {STATUS_OPTIONS.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setStatus(item);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${
                    status === item
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Order list */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Order</th>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center">
                        <RefreshCw
                          size={24}
                          className="mx-auto animate-spin text-orange-500"
                        />
                        <p className="mt-3 text-sm text-gray-500">
                          Loading orders...
                        </p>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center">
                        <ClipboardList
                          size={32}
                          className="mx-auto text-gray-300"
                        />
                        <p className="mt-3 font-semibold text-gray-600">
                          No orders found
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Try changing your search or filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const nextStatuses = NEXT_STATUSES[order.status] || [];

                      const nextStatus = nextStatuses.find(
                        (item) => item !== "cancelled",
                      );

                      const blockedProduction =
                        order.status === "proof" &&
                        (!order.currentProof || !order.proofApproved);

                      return (
                        <tr
                          key={order._id}
                          className="transition hover:bg-gray-50/80"
                        >
                          <td className="px-6 py-5">
                            <p className="font-bold text-gray-900">
                              {order.orderNumber}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-400">
                              ID: {order._id?.slice(-8)}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm font-semibold">
                              {order.customer?.name || "Unknown customer"}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {order.customer?.email || "—"}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm font-medium">
                              {order.product?.name || "Unknown product"}
                            </p>
                            <p className="mt-1 text-xs capitalize text-gray-400">
                              {order.product?.division || "Print product"}
                            </p>
                          </td>

                          <td className="px-6 py-5 text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </td>

                          <td className="px-6 py-5 text-sm font-bold">
                            {formatCurrency(order.pricing?.total)}
                          </td>

                          <td className="px-6 py-5">
                            <div className="space-y-2">
                              <StatusBadge status={order.status} />
                              <p className="text-[10px] capitalize text-gray-400">
                                Payment: {order.paymentStatus || "pending"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              {/* View order details */}
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.href = `/admin/orders/${order._id}`;
                                }}
                                className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                              >
                                View job
                              </button>

                              {/* Update production status */}
                              {nextStatus ? (
                                <button
                                  onClick={() => changeStatus(order)}
                                  disabled={
                                    updatingOrder === order._id ||
                                    blockedProduction
                                  }
                                  title={
                                    blockedProduction
                                      ? "Customer approval required"
                                      : `Move to ${nextStatus}`
                                  }
                                  className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold capitalize text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {updatingOrder === order._id
                                    ? "Updating..."
                                    : `Move to ${nextStatus}`}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No action
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <p className="text-xs text-gray-500">
                Showing {orders.length} of {pagination.totalOrders} orders
              </p>

              <div className="flex items-center gap-3">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="text-xs font-semibold">
                  Page {pagination.currentPage || page} of{" "}
                  {Math.max(1, pagination.totalPages || 1)}
                </span>

                <button
                  disabled={page >= (pagination.totalPages || 1) || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <footer className="flex flex-col justify-between gap-2 pb-4 text-xs text-gray-400 sm:flex-row">
            <p>Digital Heroes Production Console</p>
            <p>Built for a better print workflow.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
