// models/Subscription.js
import mongoose from "mongoose";

/* =========================
   Subscription Schema

   Note:
   This model is for older/general Plan subscriptions.
   Your membership system uses UserSubscriptionModel.js.
========================= */
const subscriptionSchema = new mongoose.Schema(
  {
    // User who owns this subscription
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Plan connected to this subscription
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    // Stripe customer ID
    stripeCustomerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Stripe subscription ID
    stripeSubscriptionId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    // Stripe subscription status
    status: {
      type: String,
      enum: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
      ],
      default: "active",
      index: true,
    },

    // Stripe billing period dates
    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

/* =========================
   Indexes
========================= */
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ plan: 1, status: 1 });

/* =========================
   Model Export
========================= */
const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;