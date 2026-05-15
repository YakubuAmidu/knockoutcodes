// models/NewsletterModel.js
import mongoose from "mongoose";

/**
 * Newsletter Model
 * ----------------
 * Stores newsletter subscribers, source tracking,
 * topics/interests, and active subscription status.
 */
const newsletterSchema = new mongoose.Schema(
  {
    // Optional subscriber name
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    // Subscriber email address
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      maxlength: [160, "Email cannot exceed 160 characters"],
      validate: {
        validator(value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Please provide a valid email address.",
      },
    },

    // Optional content topic or interest
    topic: {
      type: String,
      trim: true,
      default: "",
      maxlength: [60, "Topic cannot exceed 60 characters"],
    },

    // Where the signup came from
    source: {
      type: String,
      trim: true,
      default: "footer",
      maxlength: [40, "Source cannot exceed 40 characters"],
      index: true,
    },

    // Internal admin notes
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },

    // Soft subscription status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Speed up newsletter management queries.
 */
newsletterSchema.index({ isActive: 1, createdAt: -1 });
newsletterSchema.index({ source: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Newsletter =
  mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;