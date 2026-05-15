// models/BlockedIpModel.js
import mongoose from "mongoose";

/**
 * Stores manually or automatically blocked IP addresses.
 * Used by security middleware to prevent known abusive IPs from accessing the API.
 */
const blockedIpSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
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

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

const BlockedIp =
  mongoose.models.BlockedIp || mongoose.model("BlockedIp", blockedIpSchema);

export default BlockedIp;