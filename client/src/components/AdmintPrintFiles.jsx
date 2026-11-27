import { useCallback, useEffect, useState } from 'react';
import { Download, FileArchive, Lock, LockOpen, Upload } from 'lucide-react';
import api from '../services/api';
import { downloadFile, blobErrorMessage } from '../services/download';

// Production files panel for the admin order page.
export default function AdminPrintFiles({ orderId, onMessage, onError }) {
  const [info, setInfo] = useState(null);
  const [csv, setCsv] = useState(null);
  const [fit, setFit] = useState({ minFontSize: 10, maxFontSize: '', minCharSpacing: -60 });
  const [includePng, setIncludePng] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/orders/${orderId}/print-files`);
      setInfo(data);
    } catch (err) {
      onError?.(err.response?.data?.message || 'Unable to load print files.');
    }
  }, [orderId, onError]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      onError?.(await blobErrorMessage(err, 'File generation failed.'));
    } finally {
      setBusy('');
    }
  };

  const download = (format) =>
    run(format, () => downloadFile(`/admin/orders/${orderId}/print-files/download?format=${format}`, info.fileNames[format]));

  const merge = () =>
    run('merge', async () => {
      const form = new FormData();
      form.append('file', csv);
      form.append('minFontSize', fit.minFontSize);
      form.append('minCharSpacing', fit.minCharSpacing);
      if (fit.maxFontSize) form.append('maxFontSize', fit.maxFontSize);
      form.append('includePng', String(includePng));
      await downloadFile(`/admin/orders/${orderId}/csv-merge`, 'csv-merge.zip', {
        method: 'post', data: form, headers: { 'Content-Type': 'multipart/form-data' },
      });
      onMessage?.('CSV merge complete. Check merge-report.csv inside the ZIP for any fit warnings.');
    });

  if (!info) return null;
  const btn = 'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40';
  const locked = !info.unlocked;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-3 ${locked ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
            {locked ? <Lock size={21} /> : <LockOpen size={21} />}
          </div>
          <div>
            <h2 className="text-lg font-bold">Production files</h2>
            <p className="mt-1 text-xs text-gray-500">
              {locked ? info.reason : `Unlocked · ${info.spec.widthMm}×${info.spec.heightMm} mm + ${info.spec.bleedMm} mm bleed · ${info.spec.dpi} dpi`}
            </p>
          </div>
        </div>
      </div>

      {info.hasDesign ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={locked || busy} onClick={() => download('pdf')} className={`${btn} bg-gray-900 text-white`}><Download size={16} /> {busy === 'pdf' ? 'Rendering...' : 'Print-ready PDF'}</button>
          <button disabled={locked || busy} onClick={() => download('png')} className={`${btn} border border-gray-200`}><Download size={16} /> {busy === 'png' ? 'Rendering...' : 'High-res PNG'}</button>
          <button disabled={locked || busy} onClick={() => download('zip')} className={`${btn} border border-gray-200`}><FileArchive size={16} /> {busy === 'zip' ? 'Packing...' : 'Order ZIP'}</button>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No in-browser design on this order. Use the customer-uploaded artwork below.</p>
      )}

      {info.supportsCsvMerge && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4">
          <h3 className="font-bold">CSV variable-data merge</h3>
          <p className="mt-1 text-xs text-gray-500">One artwork PDF per row. The design uses {'{{column}}'} placeholders; column names are matched case-insensitively.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">Min font size (pt)<input type="number" min="4" value={fit.minFontSize} onChange={(e) => setFit({ ...fit, minFontSize: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-semibold">Max font size (pt)<input type="number" min="4" value={fit.maxFontSize} onChange={(e) => setFit({ ...fit, maxFontSize: e.target.value })} placeholder="as designed" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-semibold">Min tracking (1/1000 em)<input type="number" max="0" value={fit.minCharSpacing} onChange={(e) => setFit({ ...fit, minCharSpacing: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input type="file" accept=".csv" onChange={(e) => setCsv(e.target.files?.[0] || null)} className="text-sm" />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={includePng} onChange={(e) => setIncludePng(e.target.checked)} /> Also include PNGs</label>
            <button disabled={locked || !csv || busy} onClick={merge} className={`${btn} bg-orange-600 text-white`}><Upload size={16} /> {busy === 'merge' ? 'Merging...' : 'Generate merged ZIP'}</button>
          </div>
        </div>
      )}

      {info.uploadedArtwork.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold">Customer-uploaded artwork</h3>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {info.uploadedArtwork.map((file) => (
              <li key={file.storedName} className="flex items-center justify-between py-2">
                <span>{file.originalName} <span className="text-xs text-gray-400">({Math.round(file.size / 1024)} KB)</span></span>
                <button onClick={() => run(file.storedName, () => downloadFile(`/admin/orders/${orderId}/artwork/${file.storedName}`, file.originalName))} className="text-xs font-bold text-orange-600">Download</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}