import mongoose from "mongoose";

const REVENUE_SOURCES = [
  "order",
  "product",
  "course",
  "membership",
  "subscription",
  "ebook",
  "coaching",
  "manual",
  "other",
];

const REVENUE_STATUSES = [
  "paid",
  "pending",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
];

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const revenueSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    source: {
      type: String,
      enum: REVENUE_SOURCES,
      default: "order",
      lowercase: true,
      trim: true,
    },

    itemType: {
      type: String,
      enum: REVENUE_SOURCES,
      default: "other",
      lowercase: true,
      trim: true,
    },

    itemTitle: {
      type: String,
      trim: true,
      maxlength: [160, "Item title cannot exceed 160 characters"],
      default: "",
      set: normalizeText,
    },

    amount: {
      type: Number,
      required: [true, "Revenue amount is required"],
      min: [0, "Revenue amount cannot be negative"],
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 8,
    },

    status: {
      type: String,
      enum: REVENUE_STATUSES,
      default: "paid",
      lowercase: true,
      trim: true,
    },

    stripeSessionId: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    transactionId: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [1000, "Revenue note cannot exceed 1000 characters"],
      default: "",
      set: normalizeText,
    },

    isManual: {
      type: Boolean,
      default: false,
    },

    isTest: {
      type: Boolean,
      default: false,
    },

    isHiddenFromReports: {
      type: Boolean,
      default: false,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 * Do not add `index: true` above for these same fields.
 * This avoids duplicate index warnings in Mongoose.
 */
revenueSchema.index({ order: 1 });
revenueSchema.index({ user: 1, createdAt: -1 });
revenueSchema.index({ source: 1, status: 1, createdAt: -1 });
revenueSchema.index({ itemType: 1, status: 1, createdAt: -1 });
revenueSchema.index({ status: 1, isHiddenFromReports: 1, createdAt: -1 });
revenueSchema.index({ isManual: 1, isTest: 1, createdAt: -1 });

const Revenue =
  mongoose.models.Revenue || mongoose.model("Revenue", revenueSchema);

export default Revenue;