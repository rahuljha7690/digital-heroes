import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileImage, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function MyDesigns() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDesigns = async () => {
    try {
      const { data } = await api.get('/designs');
      setDesigns(data.designs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your designs.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDesigns(); }, []);

  const removeDesign = async (id) => {
    if (!window.confirm('Delete this draft design? This cannot be undone.')) return;
    try {
      await api.delete(`/designs/${id}`);
      setDesigns((current) => current.filter((design) => design._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete this design.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Your workspace</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-4xl font-black text-gray-950">My designs</h1><p className="mt-2 text-gray-500">Pick up where you left off.</p></div>
          <Link to="/products/labels-stickers" className="rounded-lg bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800">Create a design</Link>
        </div>
        {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="py-20 text-center text-gray-500">Loading your designs...</p> : designs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
            <FileImage className="mx-auto text-gray-400" size={36} /><h2 className="mt-4 text-xl font-bold">No saved designs yet</h2><p className="mt-2 text-sm text-gray-500">Your saved artwork will appear here.</p>
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((design) => (
              <article key={design._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="aspect-[3/2] bg-gray-100">
                  {design.previewUrl ? <img src={design.previewUrl} alt={`${design.name} preview`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-gray-400"><FileImage size={42} /></div>}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-gray-900">{design.name}</h2><p className="mt-1 text-xs capitalize text-gray-500">{design.product?.name || 'Product'} · {design.status}</p></div><button onClick={() => removeDesign(design._id)} title="Delete draft" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></div>
                  <p className="mt-3 text-xs text-gray-400">Updated {new Date(design.updatedAt).toLocaleDateString()}</p>
                  <Link to={`/designer/${design.product?.slug}/${design._id}`} className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-800 hover:border-orange-500 hover:text-orange-600">{design.status === 'approved' ? 'Open (approved, locked)' : 'Continue editing'} <ArrowUpRight size={17} /></Link>
                  <Link to={`/product/${design.product?.slug}?design=${design._id}`} className="mt-2 flex items-center justify-center rounded-lg bg-gray-950 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800">Order with this design</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
