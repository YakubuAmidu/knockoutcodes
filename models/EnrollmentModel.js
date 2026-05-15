// models/EnrollmentModel.js
import mongoose from "mongoose";

/**
 * Enrollment Model
 * ----------------
 * Stores course access for a user after a successful purchase
 * or after membership-based access is verified.
 */
const enrollmentSchema = new mongoose.Schema(
  {
    // User who owns this course enrollment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Enrollment must belong to a user"],
    },

    // Course connected to this enrollment
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Enrollment must belong to a course"],
    },

    // Stripe checkout session used for payment verification
    stripeSessionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },

    // Amount paid during checkout
    pricePaid: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Price paid cannot be negative"],
    },

    // Payment currency
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },

    // How the course access was granted
    paymentPlan: {
      type: String,
      enum: ["one-time", "monthly", "yearly", "lifetime"],
      default: "one-time",
      index: true,
    },

    // Payment verification status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
      index: true,
    },

    // Enrollment access status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    // Optional rating attached to the enrollment
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
      default: 5,
    },

    // Optional review/comment
    review: {
      type: String,
      trim: true,
      maxlength: [1000, "Review cannot be longer than 1000 characters"],
      default: "",
    },

    // Course progress percentage
    progressPercent: {
      type: Number,
      min: [0, "Progress cannot be negative"],
      max: [100, "Progress cannot exceed 100"],
      default: 0,
    },

    // Enrollment timeline
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
  }
);

/**
 * Prevent duplicate course enrollments for the same user.
 */
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

/**
 * Speed up dashboard and "My Courses" queries.
 */
enrollmentSchema.index({ user: 1, status: 1, createdAt: -1 });
enrollmentSchema.index({ course: 1, status: 1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Enrollment =
  mongoose.models.Enrollment ||
  mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;