import bcrypt from 'bcryptjs';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import User from '../models/User.js';

const summariseCanvas = (canvasData) => {
  const objects = canvasData?.objects || [];
  const count = (...types) => objects.filter((o) => types.includes(String(o.type).toLowerCase())).length;
  return { objects: objects.length, text: count('itext', 'text', 'textbox'), images: count('image'), shapes: count('rect', 'circle') };
};

// GET /api/customer/dashboard
export const getDashboard = async (req, res) => {
  try {
    const customerId = req.user._id;
    const [orders, designs] = await Promise.all([
      Order.find({ customer: customerId })
        .populate('product', 'name slug division image')
        .populate('design', 'name previewUrl status')
        .populate('currentProof', 'version status previewUrl')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Design.find({ customer: customerId }).populate('product', 'name slug division').sort({ updatedAt: -1 }).limit(100).lean(),
    ]);

    // Latest order configuration per design (so the dashboard can show "configuration of saved designs").
    const lastOrderByDesign = new Map();
    orders.forEach((o) => {
      const id = o.design?._id && String(o.design._id);
      if (id && !lastOrderByDesign.has(id)) lastOrderByDesign.set(id, o);
    });

    const savedDesigns = designs.map((d) => {
      const last = lastOrderByDesign.get(String(d._id));
      return {
        _id: d._id,
        name: d.name,
        status: d.status,
        previewUrl: d.previewUrl,
        product: d.product,
        updatedAt: d.updatedAt,
        canvas: summariseCanvas(d.canvasData),
        lastConfiguration: last ? { quantity: last.configuration?.quantity, options: last.configuration?.options, orderId: last._id } : null,
      };
    });

    const activeProofs = orders
      .filter((o) => o.currentProof && o.currentProof.status === 'pending')
      .map((o) => ({ orderId: o._id, orderNumber: o.orderNumber, product: o.product?.name, proof: o.currentProof }));

    return res.json({
      success: true,
      profile: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        isActive: req.user.isActive,
        memberSince: req.user.createdAt,
        profileComplete: Boolean(req.user.name && req.user.phone),
      },
      stats: {
        totalOrders: orders.length,
        inProgress: orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length,
        completed: orders.filter((o) => o.status === 'completed').length,
        awaitingPayment: orders.filter((o) => o.paymentStatus === 'pending' && o.status !== 'cancelled').length,
        savedDesigns: designs.length,
      },
      activeProofs,
      orders: orders.slice(0, 20),
      savedDesigns,
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load your dashboard.' });
  }
};

// PATCH /api/customer/profile  { name?, phone?, currentPassword?, newPassword? }
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (typeof name === 'string') {
      if (!name.trim()) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
      user.name = name.trim().slice(0, 100);
    }
    if (typeof phone === 'string') {
      if (phone.trim() && !/^[+\d][\d\s-]{6,18}$/.test(phone.trim())) {
        return res.status(400).json({ success: false, message: 'Enter a valid phone number.' });
      }
      user.phone = phone.trim();
    }
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      user.password = await bcrypt.hash(newPassword, 12);
    }
    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
};