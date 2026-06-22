import mongoose from "mongoose";

const MEMBERSHIP_LEVELS = [
  "foundations",
  "development",
  "performance",
  "elite-fight-camp",
];

const BILLING_PERIODS = ["monthly", "yearly"];

const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
];

function normalizeLevel(value) {
  const clean = String(value || "")
    .trim()
    .toLowerCase();

  if (!clean) return "";

  if (clean === "beginner" || clean.includes("foundation")) {
    return "foundations";
  }

  if (clean === "intermediate" || clean.includes("development")) {
    return "development";
  }

  if (
    clean === "advance" ||
    clean === "advanced" ||
    clean.includes("performance")
  ) {
    return "performance";
  }

  if (
    clean === "complete" ||
    clean.includes("elite") ||
    clean.includes("fight-camp") ||
    clean.includes("fight camp")
  ) {
    return "elite-fight-camp";
  }

  return clean;
}

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: [true, "Membership is required"],
    },

    membershipId: {
      type: String,
      required: [true, "Membership level is required"],
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
    },

    accessLevel: {
      type: String,
      required: [true, "Access level is required"],
      trim: true,
      lowercase: true,
      enum: MEMBERSHIP_LEVELS,
    },

    billingPeriod: {
      type: String,
      trim: true,
      lowercase: true,
      enum: BILLING_PERIODS,
      default: "monthly",
    },

    status: {
      type: String,
      trim: true,
      lowercase: true,
      enum: SUBSCRIPTION_STATUSES,
      default: "incomplete",
    },

    stripeCustomerId: {
      type: String,
      trim: true,
      default: "",
    },

    stripeSubscriptionId: {
      type: String,
      trim: true,
      default: "",
    },

    stripePriceId: {
      type: String,
      trim: true,
      default: "",
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSubscriptionSchema.pre("validate", function (next) {
  this.membershipId = normalizeLevel(this.membershipId);
  this.accessLevel = normalizeLevel(this.accessLevel);

  if (!this.accessLevel && this.membershipId) {
    this.accessLevel = this.membershipId;
  }

  next();
});

userSubscriptionSchema.methods.isActive = function () {
  if (!["active", "trialing"].includes(this.status)) return false;

  if (
    this.currentPeriodEnd &&
    new Date(this.currentPeriodEnd).getTime() < Date.now()
  ) {
    return false;
  }

  return true;
};

userSubscriptionSchema.index({ membership: 1 });
userSubscriptionSchema.index({ membershipId: 1 });
userSubscriptionSchema.index({ accessLevel: 1 });
userSubscriptionSchema.index({ billingPeriod: 1 });
userSubscriptionSchema.index({ status: 1 });
userSubscriptionSchema.index({ currentPeriodEnd: 1 });
userSubscriptionSchema.index({ stripeCustomerId: 1 });

userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ user: 1, accessLevel: 1 });

userSubscriptionSchema.index(
  { stripeSubscriptionId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      stripeSubscriptionId: { $type: "string", $ne: "" },
    },
  },
);

const UserSubscription =
  mongoose.models.UserSubscription ||
  mongoose.model("UserSubscription", userSubscriptionSchema);

export default UserSubscription;
