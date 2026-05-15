// models/OrderModel.js
import mongoose from "mongoose";

/**
 * Order Item Schema
 * -----------------
 * Stores each purchased item inside an order.
 */
const orderItemSchema = new mongoose.Schema(
  {
    // Type of item purchased
    productType: {
      type: String,
      enum: ["course", "subscription", "booking", "ebook", "product", "other"],
      required: [true, "Product type is required"],
    },

    // MongoDB document connected to this item
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Product reference is required"],
      refPath: "items.productModel",
    },

    // Model name used by refPath
    productModel: {
      type: String,
      required: [true, "Product model name is required"],
      enum: [
        "Course",
        "UserSubscription",
        "Subscription",
        "Booking",
        "Ebook",
        "Product",
        "Other",
      ],
    },

    // Item title at the time of purchase
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
      maxlength: [180, "Item title cannot exceed 180 characters"],
    },

    // Quantity purchased
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },

    // Price per item
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },

    // Currency used for this item
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },
  },
  { _id: false }
);

/**
 * Order Model
 * -----------
 * Stores completed and pending orders for courses,
 * subscriptions, products, ebooks, bookings, and other purchases.
 */
const orderSchema = new mongoose.Schema(
  {
    // User who owns the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },

    // Purchased items
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },

    // Total before discount
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },

    // Discount applied
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    // Final total after discount
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },

    // Order currency
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },

    // Payment status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // Payment provider/method
    paymentMethod: {
      type: String,
      enum: ["card", "stripe", "paypal", "cashapp", "other"],
      default: "stripe",
      index: true,
    },

    // Stripe payment/session/subscription reference
    transactionId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    stripeSessionId: {
  type: String,
  trim: true,
  unique: true,
  sparse: true,
  default: undefined,
},

    // Optional coupon code
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: [80, "Coupon code cannot exceed 80 characters"],
    },

    // Optional order note
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Note cannot exceed 500 characters"],
    },

    // Admin/order lifecycle status
    // Admin/order lifecycle status
status: {
  type: String,
  enum: [
    "new",
    "processing",
    "fulfilled",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "refunded",
    "on_hold",
  ],
  default: "new",
  index: true,
},

    // Admin inbox/read tracking
    isSeenByAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },

    shippingAddress: {
  fullName: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  line1: { type: String, trim: true, default: "" },
  line2: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  postalCode: { type: String, trim: true, default: "" },
  country: { type: String, trim: true, uppercase: true, default: "" },
},

shipping: {
  required: { type: Boolean, default: false },
  carrier: {
    type: String,
    enum: ["", "usps", "ups", "fedex", "dhl", "other"],
    default: "",
  },
  trackingNumber: { type: String, trim: true, default: "" },
  trackingUrl: { type: String, trim: true, default: "" },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
},
  },
  {
    timestamps: true,
  }
);

/**
 * Normalize order totals before saving.
 */
orderSchema.pre("validate", function (next) {
  if (this.discount > this.subtotal) {
    this.discount = this.subtotal;
  }

  this.total = Math.max(0, this.subtotal - this.discount);

  if (this.currency) {
    this.currency = String(this.currency).trim().toUpperCase();
  }

  next();
});

/**
 * Query performance indexes.
 */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, paymentStatus: 1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isSeenByAdmin: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;