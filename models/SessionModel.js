// models/sessionModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================
   Session Schema
========================= */
const sessionSchema = new Schema(
  {
    // User who owns this session
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Store only a hash, never raw refresh tokens or raw session IDs
    sessionKeyHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 32,
      maxlength: 128,
      index: true,
    },

    // Device information
    deviceName: {
      type: String,
      trim: true,
      default: "Device",
      maxlength: 120,
    },

    browser: {
      type: String,
      trim: true,
      default: "Unknown",
      maxlength: 80,
    },

    os: {
      type: String,
      trim: true,
      default: "Unknown",
      maxlength: 80,
    },

    userAgent: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    // Security/audit information
    ip: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },

    approxLocation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
    },

    isTrusted: {
      type: Boolean,
      default: false,
    },

    // Activity tracking
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Session revocation
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    revokedReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/* =========================
   Indexes
========================= */
sessionSchema.index({ user: 1, sessionKeyHash: 1 }, { unique: true });
sessionSchema.index({ user: 1, revokedAt: 1, lastActiveAt: -1 });
sessionSchema.index({ user: 1, revokedAt: 1, createdAt: -1 });

/* =========================
   Model Export
========================= */
const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);

export default Session;