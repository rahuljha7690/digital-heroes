import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On Render, set STORAGE_DIR to the persistent disk mount path (e.g. /var/data)
// so uploads, proofs and customer artwork survive restarts and redeploys.
// Locally it is unset and files stay inside the server folder.
const STORAGE_DIR = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : null;

// Publicly served (design assets, generated proof previews)
export const UPLOAD_ROOT = STORAGE_DIR ? path.join(STORAGE_DIR, 'uploads') : path.resolve(__dirname, '../uploads');
// Never served statically: customer-supplied PDF/SVG/AI files, admin-only download
export const ARTWORK_DIR = STORAGE_DIR ? path.join(STORAGE_DIR, 'private/artwork') : path.resolve(__dirname, '../private/artwork');