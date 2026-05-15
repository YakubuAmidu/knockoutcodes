// models/UserSubscriptionModel.js
import mongoose from "mongoose";

/* =========================
   Constants
========================= */
const MEMBERSHIP_LEVELS = ["beginner", "intermediate", "advance", "complete"];

const BILLING_PERIODS = ["monthly", "yearly"];

const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
];

function normalizeLevel(value) {
  const level = String(value || "").trim().toLowerCase();

  if (level === "advanced") return "advance";

  return level;
}

/* =========================
   User Subscription Schema
========================= */
const userSubscriptionSchema = new mongoose.Schema(
  {
    // Owner of the subscription
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Membership plan purchased
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
      index: true,
    },

    // Public membership key: beginner, intermediate, advance, complete
    membershipId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
      index: true,
    },

    // Access level used to unlock courses
    accessLevel: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
      default: "beginner",
      index: true,
    },

    // Stripe billing period
    billingPeriod: {
      type: String,
      enum: BILLING_PERIODS,
      default: "monthly",
      index: true,
    },

    // Current subscription status from Stripe
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "incomplete",
      index: true,
    },

    // Stripe customer ID
    stripeCustomerId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    // Stripe subscription ID
    stripeSubscriptionId: {
      type: String,
      trim: true,
      default: "",
    },

    // Stripe price ID used for the active billing plan
    stripePriceId: {
      type: String,
      trim: true,
      default: "",
    },

    // Stripe subscription period dates
    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
      index: true,
    },

    // True when user canceled but still has access until period end
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =========================
   Normalization
========================= */
userSubscriptionSchema.pre("validate", function normalizeSubscription(next) {
  if (this.membershipId) {
    this.membershipId = normalizeLevel(this.membershipId);
  }

  if (this.accessLevel) {
    this.accessLevel = normalizeLevel(this.accessLevel);
  }

  if (!this.accessLevel && this.membershipId) {
    this.accessLevel = this.membershipId;
  }

  next();
});

/* =========================
   Instance Methods
========================= */
userSubscriptionSchema.methods.isActive = function isActive() {
  const activeStatuses = ["active", "trialing"];

  if (!activeStatuses.includes(this.status)) return false;

  if (
    this.currentPeriodEnd &&
    new Date(this.currentPeriodEnd).getTime() < Date.now()
  ) {
    return false;
  }

  return true;
};

/* =========================
   Indexes
========================= */
userSubscriptionSchema.index({ user: 1 }, { unique: true });
userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ user: 1, accessLevel: 1 });
userSubscriptionSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });

/* =========================
   Model Export
========================= */
const UserSubscription =
  mongoose.models.UserSubscription ||
  mongoose.model("UserSubscription", userSubscriptionSchema);

export default UserSubscription;