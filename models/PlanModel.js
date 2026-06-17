// models/PlanModel.js
import mongoose from "mongoose";

/**
 * Creates a clean URL-safe slug.
 */
function toSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Plan Model
 * ----------
 * Stores general Stripe plans/prices.
 * Keep this separate from Membership plans unless you intentionally use it.
 */
const planSchema = new mongoose.Schema(
  {
    // Public plan name
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      unique: true,
      maxlength: [120, "Plan name cannot exceed 120 characters"],
    },

    // URL-safe plan slug
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    // Stripe recurring price ID
    stripePriceId: {
      type: String,
      required: [true, "Stripe price ID is required"],
      trim: true,
      maxlength: [120, "Stripe price ID cannot exceed 120 characters"],
    },

    // Display/reference price
    price: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Plan price cannot be negative"],
    },

    // Payment currency
    currency: {
      type: String,
      trim: true,
      lowercase: true,
      default: "usd",
      maxlength: 10,
    },

    // Public plan description
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // Controls whether plan can be purchased
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Generate slug before validation.
 */
planSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = toSlug(this.name);
  }

  if (this.currency) {
    this.currency = String(this.currency).trim().toLowerCase();
  }

  next();
});

/**
 * Update slug when name changes through findOneAndUpdate.
 */
planSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const name = update.name || update?.$set?.name;

  if (name) {
    const nextSlug = toSlug(name);

    if (update.$set) {
      update.$set.slug = nextSlug;
    } else {
      update.slug = nextSlug;
    }

    this.setUpdate(update);
  }

  next();
});

/**
 * Query performance indexes.
 */
planSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

export default Plan;
