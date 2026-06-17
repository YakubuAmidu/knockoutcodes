import mongoose from "mongoose";

const MEMBERSHIP_LEVELS = ["beginner", "intermediate", "advance", "complete"];

function sanitizeText(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function generateSlug(input = "") {
  return sanitizeText(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLevel(value = "") {
  const clean = sanitizeText(value).toLowerCase();

  if (clean === "advanced") return "advance";
  if (clean.includes("beginner")) return "beginner";
  if (clean.includes("intermediate")) return "intermediate";
  if (clean.includes("advance") || clean.includes("advanced")) return "advance";
  if (clean.includes("complete") || clean.includes("elite")) return "complete";

  return clean;
}

async function createUniqueSlug(doc, baseValue) {
  const base =
    generateSlug(baseValue) || generateSlug(doc.membershipId) || "membership";

  let slug = base;
  let count = 0;

  while (
    await mongoose.models.Membership.exists({
      slug,
      _id: { $ne: doc._id },
    })
  ) {
    count += 1;
    slug = `${base}-${count}`;
  }

  return slug;
}

const membershipSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      required: [true, "Membership id is required"],
      unique: true,
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
      set: normalizeLevel,
    },

    accessLevel: {
      type: String,
      required: [true, "Access level is required"],
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
      set: normalizeLevel,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [180, "Title cannot exceed 180 characters"],
      set: sanitizeText,
    },

    instructor: {
      type: String,
      trim: true,
      maxlength: [120, "Instructor cannot exceed 120 characters"],
      default: "KnockoutCodes Academy",
      set: sanitizeText,
    },

    priceLabel: {
      type: String,
      required: [true, "Price label is required"],
      trim: true,
      maxlength: [60, "Price label cannot exceed 60 characters"],
      set: sanitizeText,
    },

    monthlyPriceLabel: {
      type: String,
      trim: true,
      maxlength: [60, "Monthly price label cannot exceed 60 characters"],
      default: "",
      set: sanitizeText,
    },

    yearlyPriceLabel: {
      type: String,
      trim: true,
      maxlength: [60, "Yearly price label cannot exceed 60 characters"],
      default: "",
      set: sanitizeText,
    },

    stripePriceId: {
      type: String,
      trim: true,
      maxlength: [160, "Stripe price ID cannot exceed 160 characters"],
      default: "",
      set: sanitizeText,
    },

    stripePriceIdMonthly: {
      type: String,
      trim: true,
      maxlength: [160, "Monthly Stripe price ID cannot exceed 160 characters"],
      default: "",
      set: sanitizeText,
    },

    stripePriceIdYearly: {
      type: String,
      trim: true,
      maxlength: [160, "Yearly Stripe price ID cannot exceed 160 characters"],
      default: "",
      set: sanitizeText,
    },

    rating: {
      type: Number,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
      default: 0,
    },

    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    enrolled: {
      type: Number,
      min: [0, "Enrolled count cannot be negative"],
      default: 0,
    },

    short: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      minlength: [10, "Short description must be at least 10 characters"],
      maxlength: [700, "Short description cannot exceed 700 characters"],
      set: sanitizeText,
    },

    meta: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 12;
        },
        message: "Meta cannot exceed 12 items",
      },
    },

    glyph: {
      type: String,
      trim: true,
      maxlength: [8, "Glyph cannot exceed 8 characters"],
      default: "KC",
      set: sanitizeText,
    },

    badgeLeft: {
      type: String,
      trim: true,
      maxlength: [40, "Left badge cannot exceed 40 characters"],
      default: "KnockoutCodes",
      set: sanitizeText,
    },

    badgeRight: {
      type: String,
      trim: true,
      maxlength: [40, "Right badge cannot exceed 40 characters"],
      default: "Membership",
      set: sanitizeText,
    },

    highlight: {
      type: Boolean,
      default: false,
      index: true,
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
    },

    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: [-9999, "Sort order is too low"],
      max: [9999, "Sort order is too high"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

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
      .map((item) => sanitizeText(item))
      .filter(Boolean)
      .slice(0, 12);
  }

  this.rating = Math.max(0, Math.min(5, Number(this.rating || 0)));
  this.enrolled = Math.max(0, Math.floor(Number(this.enrolled || 0)));

  next();
});

membershipSchema.pre("save", async function (next) {
  try {
    if (
      this.isModified("membershipId") ||
      this.isModified("title") ||
      !this.slug
    ) {
      this.slug = await createUniqueSlug(this, this.membershipId || this.title);
    }

    next();
  } catch (error) {
    next(error);
  }
});

membershipSchema.pre("findOneAndUpdate", async function (next) {
  try {
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

    if (!$set.monthlyPriceLabel && $set.priceLabel) {
      $set.monthlyPriceLabel = $set.priceLabel;
    }

    if (!$set.stripePriceId && $set.stripePriceIdMonthly) {
      $set.stripePriceId = $set.stripePriceIdMonthly;
    }

    if (Array.isArray($set.meta)) {
      $set.meta = $set.meta
        .map((item) => sanitizeText(item))
        .filter(Boolean)
        .slice(0, 12);
    }

    if ($set.rating !== undefined) {
      $set.rating = Math.max(0, Math.min(5, Number($set.rating || 0)));
    }

    if ($set.enrolled !== undefined) {
      $set.enrolled = Math.max(0, Math.floor(Number($set.enrolled || 0)));
    }

    if ($set.membershipId || $set.title) {
      const existing = await this.model
        .findOne(this.getQuery())
        .select("_id membershipId title");

      if (existing) {
        const baseValue =
          $set.membershipId ||
          existing.membershipId ||
          $set.title ||
          existing.title;
        $set.slug = await createUniqueSlug(existing, baseValue);
      }
    }

    if (update.$set) {
      update.$set = $set;
      this.setUpdate(update);
    } else {
      this.setUpdate($set);
    }

    next();
  } catch (error) {
    next(error);
  }
});

membershipSchema.index({ membershipId: 1, isPublished: 1 });
membershipSchema.index({ accessLevel: 1, isPublished: 1 });
membershipSchema.index({ isFeatured: 1, sortOrder: 1 });
membershipSchema.index({ sortOrder: 1, createdAt: -1 });

const Membership =
  mongoose.models.Membership || mongoose.model("Membership", membershipSchema);

export { MEMBERSHIP_LEVELS, normalizeLevel };
export default Membership;
