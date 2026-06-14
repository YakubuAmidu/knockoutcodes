// models/sessionModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const cleanString = (value, max = 120) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const sessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sessionKeyHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 32,
      maxlength: 128,
      select: false,
      index: true,
    },

    deviceName: {
      type: String,
      trim: true,
      default: "Device",
      maxlength: 120,
      set: (v) => cleanString(v, 120) || "Device",
    },

    browser: {
      type: String,
      trim: true,
      default: "Unknown",
      maxlength: 80,
      set: (v) => cleanString(v, 80) || "Unknown",
    },

    os: {
      type: String,
      trim: true,
      default: "Unknown",
      maxlength: 80,
      set: (v) => cleanString(v, 80) || "Unknown",
    },

    userAgent: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
      select: false,
      set: (v) => cleanString(v, 500),
    },

    ip: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
      set: (v) => cleanString(v, 80),
    },

    approxLocation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
      set: (v) => cleanString(v, 160),
    },

    isTrusted: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

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
      enum: [
        "",
        "user_revoked_device",
        "user_revoked_others",
        "admin_revoked_session",
        "token_rotated",
        "logout",
        "cleanup",
      ],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

sessionSchema.index({ user: 1, sessionKeyHash: 1 }, { unique: true });
sessionSchema.index({ user: 1, revokedAt: 1, lastActiveAt: -1 });
sessionSchema.index({ revokedAt: 1, lastActiveAt: -1 });
sessionSchema.index({ isTrusted: 1, revokedAt: 1 });

const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);

export default Session;