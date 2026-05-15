// models/emailUnsubscribeModel.js
import mongoose from "mongoose";

/**
 * Validates unsubscribe email addresses.
 */
function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    String(email || "").trim().toLowerCase()
  );
}

/**
 * Email unsubscribe schema
 * Stores emails that should no longer receive marketing campaigns.
 */
const emailUnsubscribeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: isValidEmail,
        message: "A valid email is required",
      },
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [300, "Reason cannot exceed 300 characters"],
      default: "",
    },

    source: {
      type: String,
      trim: true,
      maxlength: [80, "Source cannot exceed 80 characters"],
      default: "campaign",
    },

    unsubscribedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/**
 * Normalizes unsubscribe data before saving.
 */
emailUnsubscribeSchema.pre("validate", function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }

  if (!this.unsubscribedAt) {
    this.unsubscribedAt = new Date();
  }

  next();
});

/**
 * Indexes for unsubscribe lookup and admin filtering.
 */
emailUnsubscribeSchema.index({ source: 1, createdAt: -1 });
emailUnsubscribeSchema.index({ unsubscribedAt: -1 });

const EmailUnsubscribe =
  mongoose.models.EmailUnsubscribe ||
  mongoose.model("EmailUnsubscribe", emailUnsubscribeSchema);

export default EmailUnsubscribe;