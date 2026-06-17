// models/EnrollmentModel.js
import mongoose from "mongoose";

/**
 * Enrollment Model
 * ----------------
 * Stores course access after:
 * 1. Single course purchase
 * 2. Free course access
 * 3. Admin manual enrollment
 *
 * IMPORTANT:
 * Membership subscriptions should NOT create permanent enrollments.
 * Membership access is checked from UserSubscription.
 */
const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Enrollment must belong to a user"],
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Enrollment must belong to a course"],
      index: true,
    },

    stripeSessionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },

    stripePaymentIntentId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    stripeCustomerId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    pricePaid: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Price paid cannot be negative"],
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },

    paymentPlan: {
      type: String,
      enum: ["one-time", "monthly", "yearly", "lifetime", "free"],
      default: "one-time",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    accessType: {
      type: String,
      enum: ["single-course", "free", "admin"],
      default: "single-course",
      index: true,
    },

    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
      default: null,
    },

    review: {
      type: String,
      trim: true,
      maxlength: [1000, "Review cannot be longer than 1000 characters"],
      default: "",
    },

    progressPercent: {
      type: Number,
      min: [0, "Progress cannot be negative"],
      max: [100, "Progress cannot exceed 100"],
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/* ======================================================
   CLEANUP
====================================================== */

enrollmentSchema.pre("validate", function (next) {
  if (this.currency) {
    this.currency = String(this.currency).trim().toUpperCase();
  }

  if (this.progressPercent >= 100 && this.status !== "completed") {
    this.status = "completed";
    this.completedAt = this.completedAt || new Date();
  }

  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  if (this.expiresAt && new Date(this.expiresAt).getTime() < Date.now()) {
    this.status = "expired";
  }

  next();
});

/* ======================================================
   INDEXES
====================================================== */

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

enrollmentSchema.index({ user: 1, status: 1, createdAt: -1 });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ user: 1, paymentStatus: 1, status: 1 });
enrollmentSchema.index({ course: 1, paymentStatus: 1, status: 1 });

const Enrollment =
  mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
