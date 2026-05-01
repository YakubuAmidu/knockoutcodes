// models/enrollmentModel.js
import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    // Who owns this enrollment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which course they enrolled in
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    stripeSessionId: {
      type: String,
      trime: true,
      unique: true,
      sparse: true, 
    },

    // What they actually paid at checkout
    pricePaid: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "pricePaid cannot be negative"],
    },

    // Currency for the payment (for future Stripe integration)
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
    },

    // Payment plan: one-time, subscription, etc.
    paymentPlan: {
      type: String,
      enum: ["one-time", "monthly", "yearly", "lifetime"],
      default: "one-time",
    },

    // Payment status from your payment provider
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
    },

    // Enrollment lifecycle status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },

    // "5 star enrollment" rating (can later be used for reviews/analytics)
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
      default: 5,
    },

    // Optional short review/comment on the course
    review: {
      type: String,
      trim: true,
      maxlength: [1000, "Review cannot be longer than 1000 characters"],
    },

    // Progress tracking
    progressPercent: {
      type: Number,
      min: [0, "Progress cannot be negative"],
      max: [100, "Progress cannot exceed 100"],
      default: 0,
    },

    // Timeline fields
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    lastAccessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

enrollmentSchema.index({ user: 1, course: 1, }, { unique: true });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
