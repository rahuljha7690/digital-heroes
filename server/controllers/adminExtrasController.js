import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/users?search=&role=&page=&limit=
export const listUsers = async (req, res) => {
  try {
    const { search = '', role, page = 1, limit = 15 } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 15));

    const filter = {};
    if (['customer', 'admin'].includes(role)) filter.role = role;
    if (search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
      User.countDocuments(filter),
    ]);

    // Order count + lifetime spend per listed customer
    const stats = await Order.aggregate([
      { $match: { customer: { $in: users.map((u) => u._id) } } },
      {
        $group: {
          _id: '$customer',
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$pricing.total', 0] } },
        },
      },
    ]);
    const byUser = new Map(stats.map((s) => [String(s._id), s]));

    return res.json({
      success: true,
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        orders: byUser.get(String(u._id))?.orders || 0,
        spent: byUser.get(String(u._id))?.spent || 0,
      })),
      pagination: { total, currentPage: pageNumber, totalPages: Math.ceil(total / pageSize), pageSize },
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load users.' });
  }
};

// PATCH /api/admin/users/:userId/status  { isActive }
export const setUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ success: false, message: 'isActive must be true or false.' });
    if (String(req.user._id) === userId) return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });

    const user = await User.findByIdAndUpdate(userId, { $set: { isActive: req.body.isActive } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, user });
  } catch (error) {
    console.error('Set user status error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update user.' });
  }
};

// GET /api/admin/reports  — totals, product-family throughput, monthly revenue
export const getReports = async (_req, res) => {
  try {
    const live = { status: { $ne: 'cancelled' } };
    const paidRevenue = { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$pricing.total', 0] } };

    const [totals, byDivision, byMonth] = await Promise.all([
      Order.aggregate([
        { $match: live },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: paidRevenue, billed: { $sum: '$pricing.total' } } },
      ]),
      Order.aggregate([
        { $match: live },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        {
          $group: {
            _id: '$p.division',
            orders: { $sum: 1 },
            units: { $sum: '$configuration.quantity' },
            revenue: paidRevenue,
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            inProduction: { $sum: { $cond: [{ $eq: ['$status', 'production'] }, 1, 0] } },
          },
        },
        { $sort: { orders: -1 } },
      ]),
      Order.aggregate([
        { $match: { ...live, createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 11, 1)) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, orders: { $sum: 1 }, revenue: paidRevenue } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      totals: totals[0] || { orders: 0, revenue: 0, billed: 0 },
      byDivision: byDivision.map(({ _id, ...rest }) => ({ division: _id, ...rest })),
      byMonth: byMonth.map(({ _id, ...rest }) => ({ month: _id, ...rest })),
    });
  } catch (error) {
    console.error('Reports error:', error);
    return res.status(500).json({ success: false, message: 'Unable to build reports.' });
  }
};

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const ddmmyyyy = (date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// GET /api/admin/export/xero?from=&to=&paidOnly=true  — Xero "sales invoice" CSV import shape
export const exportXero = async (req, res) => {
  try {
    const filter = { status: { $ne: 'cancelled' } };
    if (req.query.paidOnly === 'true') filter.paymentStatus = 'paid';
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }

    const orders = await Order.find(filter).populate('customer', 'name email').populate('product', 'name').sort({ createdAt: 1 }).lean();
    const header = ['*ContactName', 'EmailAddress', '*InvoiceNumber', 'Reference', '*InvoiceDate', '*DueDate', 'Description', '*Quantity', '*UnitAmount', 'Discount', '*AccountCode', '*TaxType', 'Currency'];
    const rows = orders.map((o) => {
      const p = o.pricing || {};
      return [
        o.customer?.name, o.customer?.email, `INV-${o.orderNumber}`, o.orderNumber,
        ddmmyyyy(o.createdAt), ddmmyyyy(new Date(new Date(o.createdAt).getTime() + 14 * 864e5)),
        o.product?.name, p.quantity, p.unitPrice, p.discountPercent || '', '200',
        p.taxRate > 0 ? 'Tax on Sales' : 'Tax Exempt', p.currency || 'INR',
      ].map(csvCell).join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="digital-heroes-xero-invoices.csv"');
    return res.send([header.join(','), ...rows].join('\n'));
  } catch (error) {
    console.error('Xero export error:', error);
    return res.status(500).json({ success: false, message: 'Unable to export invoices.' });
  }
};

// PATCH /api/admin/orders/:orderId/archive  { archived }
export const setArchived = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    const archived = req.body.archived !== false;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (archived && !['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Only completed or cancelled orders can be archived.' });
    }
    order.archived = archived;
    await order.save();
    return res.json({ success: true, message: archived ? 'Order archived.' : 'Order restored.', order });
  } catch (error) {
    console.error('Archive error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update archive state.' });
  }
};