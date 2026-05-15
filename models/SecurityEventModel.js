// models/SecurityEventModel.js
import mongoose from "mongoose";

/**
 * Security Event Model
 * --------------------
 * Stores important account/security actions such as login,
 * logout, failed login, account lock, password reset, and email verification.
 */
const securityEventSchema = new mongoose.Schema(
  {
    // User connected to the event, if known
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Email connected to the event
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
      maxlength: [160, "Email cannot exceed 160 characters"],
    },

    // Security event type
    type: {
      type: String,
      required: [true, "Security event type is required"],
      enum: [
        "REGISTER_SUCCESS",
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "ACCOUNT_LOCKED",
        "LOGOUT",
        "FORGOT_PASSWORD_REQUEST",
        "PASSWORD_RESET_SUCCESS",
        "EMAIL_VERIFIED",
        "EMAIL_VERIFICATION_RESENT",
        "REFRESH_SUCCESS",
        "REFRESH_FAILED",
      ],
    },

    // IP address captured from request
    ip: {
      type: String,
      trim: true,
      default: "",
      index: true,
      maxlength: [80, "IP cannot exceed 80 characters"],
    },

    // Browser/device user agent
    userAgent: {
      type: String,
      trim: true,
      default: "",
      maxlength: [600, "User agent cannot exceed 600 characters"],
    },

    // Extra structured event data
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Admin review status
    reviewStatus: {
      type: String,
      enum: ["unreviewed", "reviewed", "suspicious", "resolved", "ignored"],
      default: "unreviewed",
    },

    // Admin investigation notes
    adminNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin note cannot exceed 1000 characters"],
      default: "",
    },

    // Admin who reviewed the event
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // When the event was reviewed
    reviewedAt: {
      type: Date,
      default: null,
    },

    // Action taken after review
    actionTaken: {
      type: String,
      enum: ["none", "user_deactivated", "ip_blocked"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Query performance indexes.
 */
securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ email: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ reviewStatus: 1, createdAt: -1 });
securityEventSchema.index({ actionTaken: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const SecurityEvent =
  mongoose.models.SecurityEvent ||
  mongoose.model("SecurityEvent", securityEventSchema);

export default SecurityEvent;