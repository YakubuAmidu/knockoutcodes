import mongoose from "mongoose";

const REVIEW_TYPES = ["course", "product", "membership"];

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },

    reviewType: {
      type: String,
      enum: REVIEW_TYPES,
      required: [true, "Review type is required"],
      trim: true,
      lowercase: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      default: null,
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },

    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Review title cannot exceed 80 characters"],
      set: normalizeText,
    },

    comment: {
      type: String,
      trim: true,
      required: [true, "Review comment is required"],
      minlength: [10, "Review comment must be at least 10 characters"],
      maxlength: [1000, "Review comment cannot exceed 1000 characters"],
      set: normalizeText,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.pre("validate", function (next) {
  const hasCourse = Boolean(this.course);
  const hasProduct = Boolean(this.product);
  const hasMembership = Boolean(this.membership);

  const targetCount = [hasCourse, hasProduct, hasMembership].filter(Boolean).length;

  if (targetCount !== 1) {
    return next(
      new Error("Review must belong to exactly one course, product, or membership.")
    );
  }

  if (this.reviewType === "course" && !hasCourse) {
    return next(new Error("Course review must include a course."));
  }

  if (this.reviewType === "product" && !hasProduct) {
    return next(new Error("Product review must include a product."));
  }

  if (this.reviewType === "membership" && !hasMembership) {
    return next(new Error("Membership review must include a membership."));
  }

  if (this.reviewType === "course" && (hasProduct || hasMembership)) {
    return next(new Error("Course review cannot include product or membership."));
  }

  if (this.reviewType === "product" && (hasCourse || hasMembership)) {
    return next(new Error("Product review cannot include course or membership."));
  }

  if (this.reviewType === "membership" && (hasCourse || hasProduct)) {
    return next(new Error("Membership review cannot include course or product."));
  }

  return next();
});

/**
 * Indexes
 * Do not add `index: true` above for these same fields.
 * This avoids duplicate index warnings in Mongoose.
 */
reviewSchema.index({ reviewType: 1 });
reviewSchema.index({ course: 1 });
reviewSchema.index({ product: 1 });
reviewSchema.index({ membership: 1 });
reviewSchema.index({ isApproved: 1 });

reviewSchema.index(
  { user: 1, reviewType: 1, course: 1 },
  {
    unique: true,
    partialFilterExpression: {
      reviewType: "course",
      course: { $type: "objectId" },
    },
  }
);

reviewSchema.index(
  { user: 1, reviewType: 1, product: 1 },
  {
    unique: true,
    partialFilterExpression: {
      reviewType: "product",
      product: { $type: "objectId" },
    },
  }
);

reviewSchema.index(
  { user: 1, reviewType: 1, membership: 1 },
  {
    unique: true,
    partialFilterExpression: {
      reviewType: "membership",
      membership: { $type: "objectId" },
    },
  }
);

reviewSchema.index({ course: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ membership: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ reviewType: 1, isApproved: 1, createdAt: -1 });

const Review =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;