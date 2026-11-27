import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LoaderCircle, Search } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { search, role, page } });
      setUsers(data.users);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const toggle = async (u) => {
    if (!window.confirm(`${u.isActive ? 'Deactivate' : 'Activate'} ${u.email}?`)) return;
    try {
      await api.patch(`/admin/users/${u._id}/status`, { isActive: !u.isActive });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update user.');
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600"><ArrowLeft size={17} /> Back to dashboard</Link>
        <h1 className="text-3xl font-black text-gray-950">User management</h1>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm" />
          </div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 text-sm">
            <option value="">All roles</option><option value="customer">Customers</option><option value="admin">Admins</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          {loading ? <div className="flex justify-center p-12"><LoaderCircle className="animate-spin text-orange-600" /></div> : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="p-4">User</th><th>Role</th><th>Orders</th><th>Paid spend</th><th>Joined</th><th className="pr-4 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="p-4"><p className="font-bold">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                    <td className="capitalize">{u.role}</td><td>{u.orders}</td><td>{money(u.spent)}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="pr-4 text-right">
                      <button disabled={u._id === me?.id} onClick={() => toggle(u)} className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-40 ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.isActive ? 'Active' : 'Inactive'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 disabled:opacity-40">Previous</button>
          <span className="text-gray-500">Page {pagination.currentPage} of {Math.max(1, pagination.totalPages)}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </main>
  );
}