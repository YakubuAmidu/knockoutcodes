// models/OrderModel.js
import mongoose from "mongoose";

/* =========================================================
   ORDER ITEM SCHEMA
========================================================= */
const orderItemSchema = new mongoose.Schema(
  {
    productType: {
      type: String,
      enum: ["course", "subscription", "booking", "ebook", "product", "other"],
      required: [true, "Product type is required"],
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Product reference is required"],
      refPath: "items.productModel",
    },

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

    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
      maxlength: [180, "Item title cannot exceed 180 characters"],
    },

    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },

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

/* =========================================================
   SHIPPING ADDRESS SCHEMA
========================================================= */
const shippingAddressSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

/* =========================================================
   SHIPPING / TRACKING SCHEMA
========================================================= */
const shippingSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

/* =========================================================
   ORDER SCHEMA
========================================================= */
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },

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

    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["card", "stripe", "paypal", "cashapp", "other"],
      default: "stripe",
    },

    transactionId: {
      type: String,
      trim: true,
      default: "",
    },

    stripeSessionId: {
      type: String,
      trim: true,
      default: undefined,
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: [80, "Coupon code cannot exceed 80 characters"],
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Note cannot exceed 500 characters"],
    },

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
    },

    isSeenByAdmin: {
      type: Boolean,
      default: false,
    },

    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({}),
    },

    shipping: {
      type: shippingSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

/* =========================================================
   NORMALIZATION + TOTAL SAFETY
========================================================= */
orderSchema.pre("validate", function (next) {
  const subtotal = Number(this.subtotal || 0);
  const discount = Number(this.discount || 0);

  this.discount = Math.min(Math.max(discount, 0), subtotal);
  this.total = Math.max(0, subtotal - this.discount);

  if (this.currency) {
    this.currency = String(this.currency).trim().toUpperCase();
  }

  if (this.couponCode) {
    this.couponCode = String(this.couponCode).trim().toUpperCase();
  }

  next();
});

/* =========================================================
   INDEXES — ONLY DEFINE THEM HERE TO AVOID DUPLICATES
========================================================= */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, paymentStatus: 1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isSeenByAdmin: 1, createdAt: -1 });
orderSchema.index({ transactionId: 1 });

orderSchema.index(
  { stripeSessionId: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_stripe_session_id",
  }
);

/* =========================================================
   PREVENT MODEL OVERWRITE IN DEV/HOT RELOAD
========================================================= */
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;