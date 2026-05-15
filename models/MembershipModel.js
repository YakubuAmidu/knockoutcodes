// models/MembershipModel.js
import mongoose from "mongoose";

const MEMBERSHIP_LEVELS = ["beginner", "intermediate", "advance", "complete"];

/**
 * Creates a clean URL-safe slug.
 */
function generateSlug(input = "") {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes membership levels.
 */
function normalizeLevel(value = "") {
  const clean = String(value).trim().toLowerCase();

  if (clean === "advanced") return "advance";
  if (clean.includes("beginner")) return "beginner";
  if (clean.includes("intermediate")) return "intermediate";
  if (clean.includes("advance") || clean.includes("advanced")) return "advance";
  if (clean.includes("complete") || clean.includes("elite")) return "complete";

  return clean;
}

/**
 * Membership Model
 * ----------------
 * Stores public membership plans and Stripe recurring price IDs.
 * These plans control which course level a user can unlock.
 */
const membershipSchema = new mongoose.Schema(
  {
    // System-safe ID used for access checks
    membershipId: {
      type: String,
      required: [true, "Membership id is required"],
      unique: true,
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
    },

    // Course access level this membership unlocks
    accessLevel: {
      type: String,
      required: [true, "Access level is required"],
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
    },

    // Public title shown on membership cards
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [180, "Title cannot exceed 180 characters"],
    },

    // Instructor/academy name
    instructor: {
      type: String,
      trim: true,
      maxlength: [120, "Instructor cannot exceed 120 characters"],
      default: "KnockoutCodes Academy",
    },

    // Default display price
    priceLabel: {
      type: String,
      required: [true, "Price label is required"],
      trim: true,
      maxlength: [60, "Price label cannot exceed 60 characters"],
    },

    // Monthly display price
    monthlyPriceLabel: {
      type: String,
      trim: true,
      maxlength: [60, "Monthly price label cannot exceed 60 characters"],
      default: "",
    },

    // Yearly display price
    yearlyPriceLabel: {
      type: String,
      trim: true,
      maxlength: [60, "Yearly price label cannot exceed 60 characters"],
      default: "",
    },

    // Default Stripe price ID, usually monthly
    stripePriceId: {
      type: String,
      trim: true,
      maxlength: [120, "Stripe price ID cannot exceed 120 characters"],
      default: "",
    },

    // Stripe recurring monthly price ID
    stripePriceIdMonthly: {
      type: String,
      trim: true,
      maxlength: [120, "Monthly Stripe price ID cannot exceed 120 characters"],
      default: "",
    },

    // Stripe recurring yearly price ID
    stripePriceIdYearly: {
      type: String,
      trim: true,
      maxlength: [120, "Yearly Stripe price ID cannot exceed 120 characters"],
      default: "",
    },

    // Public trust rating shown on card
    rating: {
      type: Number,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
      default: 0,
    },

    // Public enrolled/student count
    enrolled: {
      type: Number,
      min: [0, "Enrolled count cannot be negative"],
      default: 0,
    },

    // Short marketing description
    short: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      minlength: [10, "Short description must be at least 10 characters"],
      maxlength: [700, "Short description cannot exceed 700 characters"],
    },

    // Card bullet points
    meta: {
      type: [String],
      default: [],
    },

    // Small card symbol
    glyph: {
      type: String,
      trim: true,
      maxlength: [8, "Glyph cannot exceed 8 characters"],
      default: "KC",
    },

    // Left card badge
    badgeLeft: {
      type: String,
      trim: true,
      maxlength: [40, "Left badge cannot exceed 40 characters"],
      default: "KnockoutCodes",
    },

    // Right card badge
    badgeRight: {
      type: String,
      trim: true,
      maxlength: [40, "Right badge cannot exceed 40 characters"],
      default: "Membership",
    },

    // Marks featured/highlighted plan
    highlight: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Public URL slug
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    // Controls public visibility
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Controls featured sorting/placement
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Manual sort order
    sortOrder: {
      type: Number,
      default: 0,
    },

    // Admin who created the plan
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Normalize fields before validation.
 */
membershipSchema.pre("validate", function (next) {
  if (this.membershipId) {
    this.membershipId = normalizeLevel(this.membershipId);
  }

  if (this.accessLevel) {
    this.accessLevel = normalizeLevel(this.accessLevel);
  }

  if (!this.accessLevel && this.membershipId) {
    this.accessLevel = this.membershipId;
  }

  if (!this.monthlyPriceLabel && this.priceLabel) {
    this.monthlyPriceLabel = this.priceLabel;
  }

  if (!this.stripePriceId && this.stripePriceIdMonthly) {
    this.stripePriceId = this.stripePriceIdMonthly;
  }

  if (Array.isArray(this.meta)) {
    this.meta = this.meta
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  next();
});

/**
 * Generate unique slug before saving.
 */
membershipSchema.pre("save", async function (next) {
  if (this.isModified("membershipId") || this.isModified("title") || !this.slug) {
    const base = generateSlug(this.membershipId || this.title);

    let slug = base;
    let count = 0;

    while (
      await mongoose.models.Membership.exists({
        slug,
        _id: { $ne: this._id },
      })
    ) {
      count += 1;
      slug = `${base}-${count}`;
    }

    this.slug = slug;
  }

  next();
});

/**
 * Normalize safe update fields and regenerate slug when needed.
 */
membershipSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  delete $set.createdBy;

  if ($set.membershipId) {
    $set.membershipId = normalizeLevel($set.membershipId);
  }

  if ($set.accessLevel) {
    $set.accessLevel = normalizeLevel($set.accessLevel);
  }

  if (!$set.accessLevel && $set.membershipId) {
    $set.accessLevel = $set.membershipId;
  }

  if (!$set.stripePriceId && $set.stripePriceIdMonthly) {
    $set.stripePriceId = $set.stripePriceIdMonthly;
  }

  if ($set.membershipId || $set.title) {
    $set.slug = generateSlug($set.membershipId || $set.title);
  }

  if (Array.isArray($set.meta)) {
    $set.meta = $set.meta
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (update.$set) {
    update.$set = $set;
  } else {
    this.setUpdate($set);
  }

  next();
});

/**
 * Query performance indexes.
 */
membershipSchema.index({ membershipId: 1, isPublished: 1 });
membershipSchema.index({ accessLevel: 1, isPublished: 1 });
membershipSchema.index({ isFeatured: 1, sortOrder: 1 });
membershipSchema.index({ sortOrder: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Membership =
  mongoose.models.Membership || mongoose.model("Membership", membershipSchema);

export default Membership;