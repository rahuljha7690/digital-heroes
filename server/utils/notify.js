import Order from '../models/Order.js';
import { sendMail } from './mailer.js';

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

const EVENTS = {
  order_placed: (o) => ({
    subject: `Order ${o.orderNumber} received`,
    text: `Hi ${o.customer.name},\n\nThanks for your order ${o.orderNumber}. Our team will prepare your artwork proof shortly.\n\nTrack it here: ${clientUrl()}/my-orders`,
  }),
  payment_received: (o) => ({
    subject: `Payment received for ${o.orderNumber}`,
    text: `Hi ${o.customer.name},\n\nWe have received your payment for order ${o.orderNumber}. You can download your receipt from your dashboard: ${clientUrl()}/dashboard`,
  }),
  proof_ready: (o, extra) => ({
    subject: `Proof v${extra.version} is ready to review (${o.orderNumber})`,
    text: `Hi ${o.customer.name},\n\nProof v${extra.version} for order ${o.orderNumber} is ready.\nReview and approve it (or request changes): ${clientUrl()}/orders/${o._id}/proof`,
  }),
  order_status: (o, extra) => ({
    subject: `Order ${o.orderNumber} is now ${extra.status}`,
    text: `Hi ${o.customer.name},\n\nYour order ${o.orderNumber} has moved to "${extra.status}".\n\nTrack it here: ${clientUrl()}/my-orders`,
  }),
};

/** Fire-and-forget customer email. Safe to call without await. */
export const notifyCustomer = async (orderId, event, extra = {}) => {
  try {
    const order = await Order.findById(orderId).populate('customer', 'name email');
    if (!order?.customer?.email || !EVENTS[event]) return;
    const { subject, text } = EVENTS[event](order, extra);
    await sendMail({ to: order.customer.email, subject, text });
  } catch (error) {
    console.error('Notify error:', error.message);
  }
};

/** Tell the production team a customer reviewed a proof. */
export const notifyAdmins = async (order, proof, action, comment = '') => {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const verdict = action === 'approve' ? 'APPROVED' : 'requested changes on';
  await sendMail({
    to,
    subject: `Customer ${verdict} proof v${proof.version} (${order.orderNumber})`,
    text: `Order ${order.orderNumber}: proof v${proof.version} was ${verdict}.\n${comment ? `Comment: ${comment}\n` : ''}\n${clientUrl()}/admin/orders/${order._id}`,
  });
};