// models/emailSubscriberModel.js
import mongoose from "mongoose";

/**
 * Validates subscriber email addresses.
 */
function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    String(email || "").trim().toLowerCase()
  );
}

/**
 * Email subscriber schema
 * Stores newsletter, checkout, campaign, manual, and imported subscribers.
 */
const emailSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
      validate: {
        validator: isValidEmail,
        message: "A valid email is required",
      },
    },

    name: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    source: {
      type: String,
      enum: ["newsletter", "checkout", "manual", "campaign", "import"],
      default: "newsletter",
    },

    status: {
      type: String,
      enum: ["active", "unsubscribed", "bounced", "blocked"],
      default: "active",
    },

    tags: {
      type: [String],
      default: [],
    },

    subscribedAt: {
      type: Date,
      default: Date.now,
    },

    unsubscribedAt: {
      type: Date,
      default: null,
    },

    lastEmailSentAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Normalizes email, tags, and unsubscribe timestamps before saving.
 */
emailSubscriberSchema.pre("validate", function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }

  if (Array.isArray(this.tags)) {
    this.tags = [
      ...new Set(
        this.tags
          .map((tag) => String(tag || "").trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
  }

  if (this.status === "unsubscribed" && !this.unsubscribedAt) {
    this.unsubscribedAt = new Date();
  }

  if (this.status === "active") {
    this.unsubscribedAt = null;
  }

  next();
});

/**
 * Indexes for subscriber lookup, filtering, and admin management.
 */
emailSubscriberSchema.index({ status: 1 });
emailSubscriberSchema.index({ source: 1 });
emailSubscriberSchema.index({ createdBy: 1, createdAt: -1 });

const EmailSubscriber =
  mongoose.models.EmailSubscriber ||
  mongoose.model("EmailSubscriber", emailSubscriberSchema);

export default EmailSubscriber;