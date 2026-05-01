// models/UserSubscriptionModel.js
import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
    },

    membershipId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "incomplete", "unpaid"],
      default: "incomplete",
      index: true,
    },

    stripeCustomerId: { type: String, trim: true, default: "" },
    stripeSubscriptionId: { type: String, trim: true, default: "", index: true },
    stripePriceId: { type: String, trim: true, default: "" },

    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },

    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("UserSubscription", userSubscriptionSchema);

