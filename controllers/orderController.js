// controllers/orderController.js
import Order from "../models/OrderModel.js";

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private (user)
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      subtotal,
      discount,
      total,
      currency,
      paymentStatus,
      paymentMethod,
      transactionId,
      couponCode,
      note,
      status,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    if (!subtotal && subtotal !== 0) {
      return res.status(400).json({
        success: false,
        message: "Subtotal is required",
      });
    }

    const order = await Order.create({
      user: req.user ? req.user._id : null, // authRequired should set req.user
      items,
      subtotal,
      discount,
      total,
      currency,
      paymentStatus,
      paymentMethod,
      transactionId,
      couponCode,
      note,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// @desc    Get all orders (admin) with filters & pagination
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      userId,
      paymentStatus,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};

    if (userId) {
      query.user = userId;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // simple search in transactionId or couponCode
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { couponCode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// @desc    Get orders for the current logged-in user
// @route   GET /api/orders/my
// @access  Private (user)
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { page = 1, limit = 10, status, paymentStatus } = req.query;

    const query = { user: userId };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 10;
    const skip = (numericPage - 1) * numericLimit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "My orders fetched successfully",
      data: orders,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    console.error("Error fetching my orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch my orders",
      error: error.message,
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private (user can see own, admin can see all)
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // If not admin, ensure user owns the order
    if (
      !req.user ||
      (req.user.role !== "admin" &&
        order.user &&
        order.user._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// @desc    Update order (admin only, for status/payment updates)
// @route   PUT /api/orders/:id
// @access  Private/Admin
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = { ...req.body };

    const order = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
};

// @desc    Delete order (admin only)
// @route   DELETE /api/orders/:id
// @access  Private/Admin
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

export default {
  createOrder,
  getOrders,
  getMyOrders,
  getOrder,
  updateOrder,
  deleteOrder,
};

