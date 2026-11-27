import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Publicly served (design assets, generated proof previews)
export const UPLOAD_ROOT = path.resolve(__dirname, '../uploads');
// Never served statically: customer-supplied PDF/SVG/AI files, admin-only download
export const ARTWORK_DIR = path.resolve(__dirname, '../private/artwork');