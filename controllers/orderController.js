import Order from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";
import { stripe } from "../config/stripe.js";
import { getIO } from "../config/socket.js";
import { sendMail } from "../utils/mailer.js";

/* =========================================================
   HELPERS
========================================================= */
const ORDER_LOCKED_STATUSES = ["cancelled", "refunded"];

function formatMoney(amount = 0, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
    }).format(Number(amount || 0));
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
}

function getOrderCustomerEmail(order) {
  return (order?.shippingAddress?.email || order?.user?.email || "")
    .toString()
    .trim()
    .toLowerCase();
}

function getOrderCustomerName(order) {
  return (order?.shippingAddress?.fullName || order?.user?.name || "Customer")
    .toString()
    .trim();
}

function buildOrderItemsHtml(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  if (!items.length) {
    return "<li>Your order items will appear in your account dashboard.</li>";
  }

  return items
    .map((item) => {
      const title = String(item?.title || "Product");
      const qty = Number(item?.quantity || 1);
      const unitPrice = Number(item?.unitPrice || 0);
      const currency = item?.currency || order?.currency || "USD";

      return `<li><strong>${title}</strong> — Qty: ${qty} — ${formatMoney(
        unitPrice,
        currency,
      )} each</li>`;
    })
    .join("");
}

async function sendOrderConfirmationEmail(order) {
  const to = getOrderCustomerEmail(order);
  if (!to) return false;

  const customerName = getOrderCustomerName(order);
  const orderId = order?._id ? String(order._id) : "your order";
  const total = formatMoney(order?.total || 0, order?.currency || "USD");
  const itemsHtml = buildOrderItemsHtml(order);

  await sendMail({
    to,
    subject: `KnockoutCodes Order Confirmed — #${orderId.slice(-8)}`,
    text: `Hi ${customerName},

Your order has been confirmed and payment was received successfully.

Order ID: ${orderId}
Total: ${total}

We’ll send you another update as soon as your order ships.

— KnockoutCodes`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
        <h2>Order Confirmed</h2>
        <p>Hi ${customerName},</p>
        <p>Your KnockoutCodes order has been confirmed and payment was received successfully.</p>

        <p><strong>Order ID:</strong> ${orderId}<br />
        <strong>Total:</strong> ${total}</p>

        <h3>Order Summary</h3>
        <ul>${itemsHtml}</ul>

        <p>We’ll send you another update as soon as your order ships.</p>
        <p>— KnockoutCodes</p>
      </div>
    `,
  });

  return true;
}

async function sendOrderTrackingEmail(order) {
  const to = getOrderCustomerEmail(order);
  if (!to) return false;

  const customerName = getOrderCustomerName(order);
  const orderId = order?._id ? String(order._id) : "your order";
  const carrier = String(
    order?.shipping?.carrier || "shipping carrier",
  ).toUpperCase();
  const trackingNumber = String(order?.shipping?.trackingNumber || "").trim();
  const trackingUrl = String(order?.shipping?.trackingUrl || "").trim();

  if (!trackingNumber) return false;

  await sendMail({
    to,
    subject: `Your KnockoutCodes Order Has Shipped — #${orderId.slice(-8)}`,
    text: `Hi ${customerName},

Your order has shipped.

Order ID: ${orderId}
Carrier: ${carrier}
Tracking Number: ${trackingNumber}
${trackingUrl ? `Track here: ${trackingUrl}` : ""}

— KnockoutCodes`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
        <h2>Your Order Has Shipped</h2>
        <p>Hi ${customerName},</p>
        <p>Your KnockoutCodes order is on the way.</p>

        <p><strong>Order ID:</strong> ${orderId}<br />
        <strong>Carrier:</strong> ${carrier}<br />
        <strong>Tracking Number:</strong> ${trackingNumber}</p>

        ${
          trackingUrl
            ? `<p><a href="${trackingUrl}" target="_blank" rel="noopener noreferrer">Track your shipment</a></p>`
            : ""
        }

        <p>— KnockoutCodes</p>
      </div>
    `,
  });

  return true;
}

async function sendOrderFulfilledEmail(order) {
  const to = getOrderCustomerEmail(order);
  if (!to) return false;

  const customerName = getOrderCustomerName(order);
  const orderId = order?._id ? String(order._id) : "your order";

  await sendMail({
    to,
    subject: `Your KnockoutCodes Order Is Fulfilled — #${orderId.slice(-8)}`,
    text: `Hi ${customerName},

Your order has been fulfilled by KnockoutCodes.

Order ID: ${orderId}

If tracking has been added, you can check your account for shipment details.

— KnockoutCodes`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
        <h2>Order Fulfilled</h2>
        <p>Hi ${customerName},</p>
        <p>Your KnockoutCodes order has been fulfilled.</p>

        <p><strong>Order ID:</strong> ${orderId}</p>

        <p>If tracking has been added, you can check your account for shipment details.</p>
        <p>— KnockoutCodes</p>
      </div>
    `,
  });

  return true;
}

function isLockedOrder(order) {
  return ORDER_LOCKED_STATUSES.includes(
    String(order?.status || "").toLowerCase(),
  );
}

function sendLockedOrder(res) {
  return res.status(409).json({
    success: false,
    message:
      "This order is locked because it is already cancelled or refunded.",
  });
}

function sanitizeOrderForUser(order) {
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
}

function emitOrderRealtime(order, action = "updated") {
  try {
    const io = getIO?.();

    if (!io || !order) return;

    const safeOrder = order.toObject ? order.toObject() : order;
    const userId = safeOrder.user?._id || safeOrder.user;

    io.emit("admin:order-updated", {
      action,
      order: safeOrder,
    });

    if (userId) {
      io.to(`user:${String(userId)}`).emit("user:order-updated", {
        action,
        order: sanitizeOrderForUser(safeOrder),
      });
    }
  } catch {
    // Ignore order realtime emit failure.
  }
}

/* =========================================================
   CREATE PENDING ORDER
========================================================= */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item.",
      });
    }

    const safeItems = items
      .map((item) => ({
        productType: item.productType,
        product: item.product,
        productModel: item.productModel,
        title: String(item.title || "").trim(),
        quantity: Math.max(1, Number(item.quantity || 1)),
        unitPrice: Math.max(0, Number(item.unitPrice || 0)),
        currency: String(item.currency || "USD").toUpperCase(),
      }))
      .filter(
        (item) =>
          item.productType &&
          item.product &&
          item.productModel &&
          item.title &&
          Number.isFinite(item.quantity) &&
          Number.isFinite(item.unitPrice),
      );

    if (!safeItems.length) {
      return res.status(400).json({
        success: false,
        message: "No valid order items provided.",
      });
    }

    const subtotal = safeItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const discount = Math.max(0, Number(req.body?.discount || 0));

    const order = await Order.create({
      user: userId,
      items: safeItems,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      currency: safeItems[0]?.currency || "USD",
      couponCode: String(req.body?.couponCode || "")
        .trim()
        .toUpperCase(),

      paymentStatus: "pending",
      paymentMethod: "stripe",
      transactionId: "",
      stripeSessionId: undefined,
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
      message: "Pending order created successfully.",
      data: sanitizeOrderForUser(order),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to create order.",
    });
  }
};

/* =========================================================
   ADMIN: GET ALL ORDERS
========================================================= */
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

    if (userId) query.user = userId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { couponCode: { $regex: search, $options: "i" } },
        { stripeSessionId: { $regex: search, $options: "i" } },
      ];
    }

    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (numericPage - 1) * numericLimit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully.",
      data: orders,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.max(1, Math.ceil(total / numericLimit)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};

/* =========================================================
   USER: GET MY ORDERS
========================================================= */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { page = 1, limit = 10, status, paymentStatus } = req.query;

    const query = { user: userId };

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Math.min(50, Number(limit) || 10));
    const skip = (numericPage - 1) * numericLimit;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "My orders fetched successfully.",
      data: orders.map(sanitizeOrderForUser),
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.max(1, Math.ceil(total / numericLimit)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch my orders.",
    });
  }
};

/* =========================================================
   USER/ADMIN: GET SINGLE ORDER
========================================================= */
export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const isAdmin = req.user?.role === "admin";
    const ownsOrder =
      order.user &&
      String(order.user._id || order.user) === String(req.user?._id);

    if (!isAdmin && !ownsOrder) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully.",
      data: isAdmin ? order : sanitizeOrderForUser(order),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order.",
    });
  }
};

/* =========================================================
   ADMIN: UPDATE ORDER SAFELY
========================================================= */
export const updateOrder = async (req, res) => {
  try {
    const existing = await Order.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (isLockedOrder(existing)) {
      return sendLockedOrder(res);
    }

    const allowedStatuses = [
      "new",
      "processing",
      "fulfilled",
      "shipped",
      "delivered",
      "completed",
      "cancelled",
      "refunded",
      "on_hold",
    ];

    const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];

    const status = req.body?.status;
    const paymentStatus = req.body?.paymentStatus;
    const note = req.body?.note;
    const isSeenByAdmin = req.body?.isSeenByAdmin;

    if (status !== undefined) {
      const nextStatus = String(status).toLowerCase();

      if (!allowedStatuses.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status.",
        });
      }

      existing.status = nextStatus;
    }

    if (paymentStatus !== undefined) {
      const nextPaymentStatus = String(paymentStatus).toLowerCase();

      if (!allowedPaymentStatuses.includes(nextPaymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      if (existing.paymentStatus !== "paid" && nextPaymentStatus === "paid") {
        return res.status(403).json({
          success: false,
          message:
            "Payment cannot be manually marked as paid. Stripe confirmation must verify payment.",
        });
      }

      existing.paymentStatus = nextPaymentStatus;
    }

    if (note !== undefined) {
      existing.note = String(note || "")
        .trim()
        .slice(0, 500);
    }

    if (isSeenByAdmin !== undefined) {
      existing.isSeenByAdmin = Boolean(isSeenByAdmin);
    }

    const order = await existing.save();
    await order.populate("user", "name email");
    emitOrderRealtime(order, "updated");

    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: order,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update order.",
    });
  }
};

/* =========================================================
   ADMIN: MARK SEEN
========================================================= */
export const markOrderAsSeen = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { isSeenByAdmin: true } },
      { new: true, runValidators: true },
    ).populate("user", "name email");
    emitOrderRealtime(order, "seen");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as seen.",
      data: order,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to mark order as seen.",
    });
  }
};

/* =========================================================
   ADMIN: FULFILL ORDER
========================================================= */
export const fulfillOrder = async (req, res) => {
  try {
    const existing = await Order.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (isLockedOrder(existing)) {
      return sendLockedOrder(res);
    }

    if (existing.paymentStatus !== "paid") {
      return res.status(409).json({
        success: false,
        message: "Only paid orders can be fulfilled.",
      });
    }

    existing.status = "fulfilled";
    existing.isSeenByAdmin = true;
    existing.note =
      req.body?.note || existing.note || "Order fulfilled by admin.";

    const order = await existing.save();
    await order.populate("user", "name email");

    try {
      await sendOrderFulfilledEmail(order);
    } catch {
      // Email failure should not block order fulfillment.
    }

    emitOrderRealtime(order, "fulfilled");

    return res.status(200).json({
      success: true,
      message: "Order fulfilled successfully.",
      data: order,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fulfill order.",
    });
  }
};

/* =========================================================
   ADMIN: CANCEL ORDER
========================================================= */
export const cancelOrder = async (req, res) => {
  try {
    const existing = await Order.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (isLockedOrder(existing)) {
      return sendLockedOrder(res);
    }

    if (existing.status === "fulfilled" || existing.status === "shipped") {
      return res.status(409).json({
        success: false,
        message:
          "This order is already fulfilled or shipped. Refund it instead of cancelling it.",
      });
    }

    existing.status = "cancelled";
    existing.isSeenByAdmin = true;
    existing.note =
      req.body?.note || existing.note || "Order cancelled by admin.";

    const order = await existing.save();
    await order.populate("user", "name email");
    emitOrderRealtime(order, "cancelled");

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: order,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
    });
  }
};

/* =========================================================
   ADMIN: REFUND ORDER STATUS
========================================================= */
export const refundOrder = async (req, res) => {
  try {
    const existing = await Order.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (String(existing.paymentStatus).toLowerCase() !== "paid") {
      return res.status(409).json({
        success: false,
        message: "Only paid orders can be marked as refunded.",
      });
    }

    if (String(existing.status).toLowerCase() === "refunded") {
      return res.status(409).json({
        success: false,
        message: "This order is already refunded.",
      });
    }

    existing.status = "refunded";
    existing.paymentStatus = "refunded";
    existing.isSeenByAdmin = true;
    existing.note =
      req.body?.note || existing.note || "Order marked as refunded by admin.";

    const order = await existing.save();
    await order.populate("user", "name email");
    emitOrderRealtime(order, "refunded");

    return res.status(200).json({
      success: true,
      message: "Order marked as refunded.",
      data: order,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to refund order.",
    });
  }
};

/* =========================================================
   ADMIN: TRACKING UPDATE
========================================================= */
export const updateOrderTracking = async (req, res) => {
  try {
    const allowedCarriers = ["", "usps", "ups", "fedex", "dhl", "other"];

    const carrier = String(req.body?.carrier || "")
      .toLowerCase()
      .trim();
    const trackingNumber = String(req.body?.trackingNumber || "").trim();
    const trackingUrl = String(req.body?.trackingUrl || "").trim();

    if (!allowedCarriers.includes(carrier)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping carrier.",
      });
    }

    const existing = await Order.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (isLockedOrder(existing)) {
      return sendLockedOrder(res);
    }

    if (existing.paymentStatus !== "paid") {
      return res.status(409).json({
        success: false,
        message: "Tracking can only be added to paid orders.",
      });
    }

    existing.shipping = {
      ...(existing.shipping?.toObject?.() || existing.shipping || {}),
      required: true,
      carrier,
      trackingNumber,
      trackingUrl,
      shippedAt: trackingNumber
        ? existing.shipping?.shippedAt || new Date()
        : existing.shipping?.shippedAt || null,
      deliveredAt: existing.shipping?.deliveredAt || null,
    };

    if (trackingNumber) {
      existing.status = "shipped";
    }

    existing.isSeenByAdmin = true;

    const order = await existing.save();
    await order.populate("user", "name email");

    if (trackingNumber) {
      try {
        await sendOrderTrackingEmail(order);
      } catch {
        // Email failure should not block tracking updates.
      }
    }

    emitOrderRealtime(order, "tracking-updated");

    return res.status(200).json({
      success: true,
      message: "Tracking updated successfully.",
      data: order,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update tracking.",
    });
  }
};

/* =========================================================
   ADMIN: DELETE ORDER
========================================================= */
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    emitOrderRealtime(order, "deleted");

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete order.",
    });
  }
};

/* =========================================================
   STRIPE PRODUCT ORDER CONFIRMATION
========================================================= */
export const confirmProductOrder = async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
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

    const metaUserId =
      session?.metadata?.userId || session?.client_reference_id;

    if (String(metaUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "This checkout session does not belong to this user.",
      });
    }

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
      isDeleted: { $ne: true },
      isActive: true,
    });

    const orderItems = [];
    let subtotal = 0;
    const currency = String(session.currency || "usd").toUpperCase();

    for (const cartItem of parsedItems) {
      const product = products.find(
        (p) => String(p._id) === String(cartItem.productId),
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

    const customerDetails = session.customer_details || {};
    const address = customerDetails.address || {};
    const transactionId = String(session.payment_intent || session.id);

    const existingPaidOrder = await Order.findOne({
      user: userId,
      stripeSessionId: session.id,
      paymentStatus: "paid",
    });

    if (existingPaidOrder) {
      return res.status(200).json({
        success: true,
        paid: true,
        orderReady: true,
        order: sanitizeOrderForUser(existingPaidOrder),
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
      },
    );

    try {
      await order.populate("user", "name email");
      await sendOrderConfirmationEmail(order);
    } catch {
      // Email failure should never block paid order confirmation.
    }

    return res.status(200).json({
      success: true,
      paid: true,
      orderReady: true,
      order: sanitizeOrderForUser(order),
    });
  } catch (error) {
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
