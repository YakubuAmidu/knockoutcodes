// models/sessionModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const sessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Store only a hash, never a raw refresh token or raw session id
    sessionKeyHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 32,
      maxlength: 128,
      index: true,
    },

    // Device metadata
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

    // Security / audit metadata
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

    // Revocation
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

// Prevent duplicate active session key per user
sessionSchema.index({ user: 1, sessionKeyHash: 1 }, { unique: true });

// Fast device/session listing
sessionSchema.index({ user: 1, revokedAt: 1, lastActiveAt: -1 });

// Helpful filter for active sessions
sessionSchema.index({ user: 1, revokedAt: 1, createdAt: -1 });

const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);

export default Session;
