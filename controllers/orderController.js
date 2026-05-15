// controllers/orderController.js
import Order from "../models/OrderModel.js";
import { stripe } from "../config/stripe.js";
import Product from "../models/ProductModel.js";

const sanitizeOrderForUser = (order) => {
  if (!order) return null;

  const o = order.toObject ? order.toObject() : order;

  return {
    _id: o._id,
    user: o.user,
    items: o.items,
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    currency: o.currency,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    transactionId: o.transactionId,
    stripeSessionId: o.stripeSessionId,
    couponCode: o.couponCode,
    status: o.status,
    shippingAddress: o.shippingAddress,
    shipping: o.shipping,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private (user)
// @desc    Create a new order
// @route   POST /api/orders
// @access  Private (user)
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      subtotal,
      discount = 0,
      total,
      currency = "USD",
      couponCode = "",
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item.",
      });
    }

    if (subtotal === undefined || subtotal === null || Number(subtotal) < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid subtotal is required.",
      });
    }

    if (total === undefined || total === null || Number(total) < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid total is required.",
      });
    }

    const order = await Order.create({
      user: userId,
      items,
      subtotal: Number(subtotal),
      discount: Number(discount || 0),
      total: Number(total),
      currency: String(currency || "USD").toUpperCase(),
      couponCode,

      // ✅ Safe defaults only
      paymentStatus: "pending",
      paymentMethod: "stripe",
      transactionId: "",
      stripeSessionId: "",
      status: "new",
      note: "",
      isSeenByAdmin: false,

      shipping: {
        required: true,
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
        shippedAt: null,
        deliveredAt: null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: sanitizeOrderForUser(order),
    });
  } catch (error) {
    console.error("Error creating order:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order.",
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
      data: orders.map(sanitizeOrderForUser),
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
      data: req.user.role === "admin" ? order : sanitizeOrderForUser(order),
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
// @desc    Update order (admin only)
// @route   PUT /api/orders/:id
// @access  Private/Admin
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;

   const allowedFields = [
  "status",
  "paymentStatus",
  "note",
  "isSeenByAdmin",
  "shipping",
];

    const updateData = {};

    // ✅ Only allow approved fields
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // ✅ Prevent dangerous empty updates
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("user", "name email");

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

export const updateOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedCarriers = ["", "usps", "ups", "fedex", "dhl", "other"];

    const carrier = String(req.body?.carrier || "").toLowerCase().trim();
    const trackingNumber = String(req.body?.trackingNumber || "").trim();
    const trackingUrl = String(req.body?.trackingUrl || "").trim();

    if (!allowedCarriers.includes(carrier)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping carrier.",
      });
    }

    const updateData = {
      "shipping.carrier": carrier,
      "shipping.trackingNumber": trackingNumber,
      "shipping.trackingUrl": trackingUrl,
      "shipping.required": true,
      isSeenByAdmin: true,
    };

    if (trackingNumber) {
      updateData.status = "shipped";
      updateData["shipping.shippedAt"] = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tracking updated successfully.",
      data: order,
    });
  } catch (error) {
    console.error("updateOrderTracking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update tracking.",
    });
  }
};

// @desc    Mark order as seen by admin
// @route   PATCH /api/orders/:id/seen
// @access  Private/Admin
export const markOrderAsSeen = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { isSeenByAdmin: true } },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as seen.",
      data: order,
    });
  } catch (error) {
    console.error("markOrderAsSeen error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark order as seen.",
    });
  }
};

// @desc    Fulfill order
// @route   PATCH /api/orders/:id/fulfill
// @access  Private/Admin
export const fulfillOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "fulfilled",
          isSeenByAdmin: true,
          note: req.body?.note || "Order fulfilled by admin.",
        },
      },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fulfilled successfully.",
      data: order,
    });
  } catch (error) {
    console.error("fulfillOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fulfill order.",
    });
  }
};

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private/Admin
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "cancelled",
          isSeenByAdmin: true,
          note: req.body?.note || "Order cancelled by admin.",
        },
      },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: order,
    });
  } catch (error) {
    console.error("cancelOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
    });
  }
};

// @desc    Mark order as refunded
// @route   PATCH /api/orders/:id/refund
// @access  Private/Admin
export const refundOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "refunded",
          paymentStatus: "refunded",
          isSeenByAdmin: true,
          note: req.body?.note || "Order marked as refunded by admin.",
        },
      },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as refunded.",
      data: order,
    });
  } catch (error) {
    console.error("refundOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refund order.",
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

export const confirmProductOrder = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const userId = req.user?._id || req.user?.id;
    const sessionId = String(req.query.session_id || "").trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "session_id is required.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const customerDetails = session.customer_details || {};
    const address = customerDetails.address || {};

    const isPaid =
      session?.status === "complete" && session?.payment_status === "paid";

    if (!isPaid) {
      return res.status(200).json({
        success: false,
        paid: false,
        orderReady: false,
        message: "Payment is not fully confirmed yet.",
      });
    }

    const metaUserId = session?.metadata?.userId || session?.client_reference_id;

    if (String(metaUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "This checkout session does not belong to this user.",
      });
    }

    const transactionId = String(session.payment_intent || session.id);

    let order = await Order.findOne({
  user: userId,
  stripeSessionId: session.id,
  paymentStatus: "paid",
}).lean();

    if (order) {
      return res.status(200).json({
        success: true,
        paid: true,
        orderReady: true,
        order,
      });
    }

    // ✅ FALLBACK: create order if webhook has not created it yet
    let parsedItems = [];

    try {
      parsedItems = JSON.parse(session.metadata?.items || "[]");
    } catch {
      parsedItems = [];
    }

    if (!Array.isArray(parsedItems) || !parsedItems.length) {
      return res.status(200).json({
        success: false,
        paid: true,
        orderReady: false,
        message: "Payment confirmed, but product metadata is missing.",
      });
    }

    const productIds = parsedItems
      .map((item) => item.productId)
      .filter(Boolean);

    const products = await Product.find({
      _id: { $in: productIds },
      isDeleted: false,
      isActive: true,
    });

    const orderItems = [];
    let subtotal = 0;
    const currency = String(session.currency || "usd").toUpperCase();

    for (const cartItem of parsedItems) {
      const product = products.find(
        (p) => String(p._id) === String(cartItem.productId)
      );

      if (!product) continue;

      const qty = Math.max(1, parseInt(cartItem.qty || 1, 10));
      const unitPrice = Number(product.price || 0);

      orderItems.push({
        productType: "product",
        product: product._id,
        productModel: "Product",
        title: product.title,
        quantity: qty,
        unitPrice,
        currency,
      });

      subtotal += unitPrice * qty;
    }

    if (!orderItems.length) {
      return res.status(200).json({
        success: false,
        paid: true,
        orderReady: false,
        message: "Payment confirmed, but no valid products were found.",
      });
    }

   order = await Order.findOneAndUpdate(
  { stripeSessionId: session.id },
  {
    $setOnInsert: {
      user: userId,
      stripeSessionId: session.id,
      items: orderItems,
      subtotal,
      discount: 0,
      total: subtotal,
      currency,
      paymentStatus: "paid",
      paymentMethod: "stripe",
      transactionId,
      couponCode: "",
      note: "Created by confirm fallback after Stripe payment.",
      status: "processing",
      isSeenByAdmin: false,

      shippingAddress: {
  fullName: customerDetails.name || "",
  email: customerDetails.email || "",
  phone: customerDetails.phone || "",
  line1: address.line1 || "",
  line2: address.line2 || "",
  city: address.city || "",
  state: address.state || "",
  postalCode: address.postal_code || "",
  country: address.country || "",
},

shipping: {
  required: true,
  carrier: "",
  trackingNumber: "",
  trackingUrl: "",
  shippedAt: null,
  deliveredAt: null,
},
    },
  },
  {
    upsert: true,
    new: true,
    runValidators: true,
  }
).lean();

    return res.status(200).json({
      success: true,
      paid: true,
      orderReady: true,
      order: sanitizeOrderForUser(order),
    });
  } catch (error) {
    console.error("confirmProductOrder error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Could not confirm product order.",
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
  confirmProductOrder,
  markOrderAsSeen,
  fulfillOrder,
  cancelOrder,
  refundOrder,
  updateOrderTracking,
};

