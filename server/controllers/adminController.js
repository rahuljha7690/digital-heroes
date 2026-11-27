
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Proof from '../models/Proof.js';
import Product from '../models/Product.js';

// Admin dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalCustomers,
      totalProducts,
      revenueResult,
      statusBreakdown,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({
        status: { $nin: ['completed', 'cancelled'] },
      }),
      Order.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.total' },
          },
        },
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const ordersByStatus = {};

    statusBreakdown.forEach((item) => {
      ordersByStatus[item._id] = item.count;
    });

    return res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalCustomers,
        totalProducts,
        totalRevenue: revenueResult[0]?.total || 0,
        ordersByStatus,
      },
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load dashboard statistics.',
    });
  }
};

// Get all orders with search, filters and pagination
export const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      from,
      to,
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

    const filter = {};

    if (status && status !== 'all') {
      const validStatuses = [
        'quote',
        'order',
        'artwork',
        'proof',
        'production',
        'completed',
        'cancelled',
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order status filter.',
        });
      }

      filter.status = status;
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        const fromDate = new Date(from);

        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date.',
          });
        }

        filter.createdAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date.',
          });
        }

        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );

      const [customers, products] = await Promise.all([
        User.find({
          role: 'customer',
          $or: [
            { name: searchRegex },
            { email: searchRegex },
          ],
        }).select('_id'),

        Product.find({
          name: searchRegex,
        }).select('_id'),
      ]);

      filter.$or = [
        { orderNumber: searchRegex },
        { customer: { $in: customers.map((user) => user._id) } },
        { product: { $in: products.map((product) => product._id) } },
      ];
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('product', 'name slug division image')
        .populate('design', 'name previewUrl')
        .populate('currentProof', 'version status previewUrl')
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      orders,
      pagination: {
        totalOrders,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalOrders / pageSize),
        pageSize,
      },
    });
  } catch (error) {
    console.error('Admin get orders error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch orders.',
    });
  }
};

// Update order production status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    const allowedStatuses = [
      'order',
      'artwork',
      'proof',
      'production',
      'completed',
      'cancelled',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target order status.',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const transitions = {
      quote: ['order', 'cancelled'],
      order: ['artwork', 'cancelled'],
      artwork: ['proof', 'cancelled'],
      proof: ['production', 'cancelled'],
      production: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (order.status === status) {
      return res.status(400).json({
        success: false,
        message: 'Order is already in this status.',
      });
    }

    if (!transitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order from ${order.status} to ${status}.`,
      });
    }

    // A customer must approve the current proof before production.
    if (status === 'production') {
      if (!order.currentProof || !order.proofApproved) {
        return res.status(400).json({
          success: false,
          message: 'Customer approval is required before production.',
        });
      }
    }

    if (status === 'proof' && !order.currentProof) {
      return res.status(400).json({
        success: false,
        message: 'Create a proof before moving the order to proof stage.',
      });
    }

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('product', 'name slug division')
      .populate('currentProof', 'version status');

    return res.json({
      success: true,
      message: `Order moved to ${status} successfully.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Admin update order status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update order status.',
    });
  }
};


// Get a single order with complete production details
export const getAdminOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    const order = await Order.findById(orderId)
      .populate('customer', 'name email phone')
      .populate('product', 'name slug division image')
      .populate('design', 'name previewUrl canvasData')
      .populate('currentProof')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Admin order details error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load order details.',
    });
  }
};

// Get all proof revisions for an order (admin only)
export const getAdminOrderProofs = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    const orderExists = await Order.exists({ _id: orderId });

    if (!orderExists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const proofs = await Proof.find({ order: orderId })
      .populate('reviewedBy', 'name email')
      .sort({ version: -1 })
      .lean();

    return res.json({
      success: true,
      proofs,
    });
  } catch (error) {
    console.error('Admin proof history error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load proof history.',
    });
  }
};

