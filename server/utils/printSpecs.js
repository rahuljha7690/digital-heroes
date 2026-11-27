// Print-production specs per division.
// The designer canvas is 700x500 px with a 600x400 px printable area (3:2).
// Each division maps that printable area to a physical size, bleed and resolution.
export const PRINT_AREA = { left: 50, top: 50, width: 600, height: 400 };

const SPECS = {
  'labels-stickers': { widthMm: 90, heightMm: 60, bleedMm: 3, dpi: 300 },
  'race-event-numbers': { widthMm: 150, heightMm: 100, bleedMm: 3, dpi: 300 },
  'mtb-boards': { widthMm: 240, heightMm: 160, bleedMm: 5, dpi: 200 },
  stamps: { widthMm: 60, heightMm: 40, bleedMm: 1, dpi: 600 },
  trophies: { widthMm: 90, heightMm: 60, bleedMm: 2, dpi: 300 },
  'laser-cut-work': { widthMm: 150, heightMm: 100, bleedMm: 0, dpi: 300 },
};

const FALLBACK = { widthMm: 90, heightMm: 60, bleedMm: 3, dpi: 300 };

export const getPrintSpec = (division) => ({ ...(SPECS[division] || FALLBACK) });

export const toPascal = (value = '') =>
  String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

const yyyymmdd = (date) => new Date(date).toISOString().slice(0, 10).replaceAll('-', '');

// Naming convention from the PRD: OrderID_ProductType_Date_Output
export const printFileName = (order, division, ext, suffix = 'Output') =>
  `${order.orderNumber}_${toPascal(division)}_${yyyymmdd(order.createdAt)}_${suffix}.${ext}`;