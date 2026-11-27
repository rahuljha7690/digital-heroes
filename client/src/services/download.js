import api from './api';

// Authenticated file download (PDF invoices, print files, CSV exports...).
// A plain <a href> cannot send the JWT, so we fetch a blob and save it.
export async function downloadFile(url, fallbackName = 'download', config = {}) {
  const response = await api.request({ url, method: config.method || 'get', data: config.data, responseType: 'blob', headers: config.headers });
  const disposition = response.headers['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

// When responseType is "blob", API errors arrive as a Blob. Turn it back into a message.
export async function blobErrorMessage(error, fallback) {
  const blob = error.response?.data;
  if (blob instanceof Blob) {
    try {
      return JSON.parse(await blob.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return error.response?.data?.message || fallback;
}