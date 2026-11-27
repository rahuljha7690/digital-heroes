import Stripe from 'stripe';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { notifyCustomer } from '../utils/notify.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';
const mockAllowed = () =>
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENTS === 'true';

// Idempotent: only the first call flips pending -> paid and sends the email.
const markPaid = async (orderId, reference) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: 'paid' } },
    { $set: { paymentStatus: 'paid', paymentReference: reference } },
    { new: true }
  );
  if (order) notifyCustomer(order._id, 'payment_received');
  return order;
};

const findOwnOrder = async (req) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) return null;
  return Order.findOne({ _id: req.params.orderId, customer: req.user._id }).populate('product', 'name');
};

// POST /api/payments/orders/:orderId/checkout
export const createCheckout = async (req, res) => {
  try {
    const order = await findOwnOrder(req);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentStatus === 'paid') return res.status(409).json({ success: false, message: 'Order is already paid.' });
    if (order.status === 'cancelled') return res.status(400).json({ success: false, message: 'Order is cancelled.' });

    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: req.user.email,
        client_reference_id: String(order._id),
        metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: String(order.pricing.currency || 'INR').toLowerCase(),
              unit_amount: Math.round(order.pricing.total * 100), // server-calculated total only
              product_data: {
                name: `${order.product?.name || 'Print order'} × ${order.configuration?.quantity}`,
                description: `Order ${order.orderNumber} (incl. tax)`,
              },
            },
          },
        ],
        success_url: `${clientUrl()}/my-orders?paid=${order._id}`,
        cancel_url: `${clientUrl()}/my-orders?cancelled=${order._id}`,
      });
      order.paymentReference = session.id;
      await order.save();
      return res.json({ success: true, url: session.url });
    }

    if (!mockAllowed()) {
      return res.status(503).json({ success: false, message: 'Payments are not configured.' });
    }
    await markPaid(order._id, `MOCK-${Date.now()}`);
    return res.json({ success: true, mock: true, url: `${clientUrl()}/my-orders?paid=${order._id}` });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ success: false, message: 'Unable to start checkout.' });
  }
};

// POST /api/payments/orders/:orderId/confirm  (called when Stripe redirects back; webhook is the backup)
export const confirmPayment = async (req, res) => {
  try {
    const order = await findOwnOrder(req);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentStatus !== 'paid' && stripe && order.paymentReference?.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(order.paymentReference);
      if (session.payment_status === 'paid') await markPaid(order._id, session.id);
    }
    const fresh = await Order.findById(order._id).select('paymentStatus');
    return res.json({ success: true, paymentStatus: fresh.paymentStatus });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return res.status(500).json({ success: false, message: 'Unable to confirm payment.' });
  }
};

// POST /api/payments/webhook  (raw body; mounted before express.json)
export const stripeWebhook = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook signature error: ${error.message}`);
  }
  if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
    const session = event.data.object;
    await markPaid(session.metadata?.orderId, session.id);
  }
  return res.json({ received: true });
};