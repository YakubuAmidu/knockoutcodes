// models/SecurityEventModel.js
import mongoose from "mongoose";

const SECURITY_EVENT_TYPES = [
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

  "BOT_DETECTED",
  "RATE_LIMITED",
  "CSRF_FAILED",
  "XSS_ATTEMPT",
  "SQLI_ATTEMPT",
  "NOSQLI_ATTEMPT",
  "PATH_TRAVERSAL_ATTEMPT",
  "ADMIN_ACCESS_DENIED",
  "BLOCKED_IP_HIT",
  "PASSWORD_RESET_ABUSE",
  "SCAM_PATTERN",
  "CHECKOUT_ABUSE",
  "SUSPICIOUS_REQUEST",
];

const securityEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
      maxlength: 160,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: SECURITY_EVENT_TYPES,
      index: true,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    category: {
      type: String,
      enum: ["auth", "bot", "abuse", "attack", "admin", "payment", "system"],
      default: "system",
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },

    ip: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
      index: true,
    },

    userAgent: {
      type: String,
      trim: true,
      default: "",
      maxlength: 600,
    },

    method: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 12,
      default: "",
    },

    path: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    fingerprint: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true,
      default: "",
    },

    count: {
      type: Number,
      default: 1,
      min: 1,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    reviewStatus: {
      type: String,
      enum: ["unreviewed", "reviewed", "suspicious", "resolved", "ignored"],
      default: "unreviewed",
      index: true,
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    actionTaken: {
      type: String,
      enum: ["none", "user_deactivated", "ip_blocked", "ip_unblocked"],
      default: "none",
      index: true,
    },
  },
  { timestamps: true },
);

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ lastSeenAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
securityEventSchema.index({ category: 1, createdAt: -1 });
securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ email: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ reviewStatus: 1, createdAt: -1 });
securityEventSchema.index({ fingerprint: 1, createdAt: -1 });

const SecurityEvent =
  mongoose.models.SecurityEvent ||
  mongoose.model("SecurityEvent", securityEventSchema);

export default SecurityEvent;
export { SECURITY_EVENT_TYPES };
