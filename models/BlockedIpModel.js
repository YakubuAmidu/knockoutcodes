// models/BlockedIpModel.js
import mongoose from "mongoose";

const blockedIpSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "Blocked by admin security review.",
    },

    sourceEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecurityEvent",
      default: null,
    },

    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    unblockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    unblockedAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

blockedIpSchema.index({ ip: 1, isActive: 1 });

const BlockedIp =
  mongoose.models.BlockedIp || mongoose.model("BlockedIp", blockedIpSchema);

export default BlockedIp;
