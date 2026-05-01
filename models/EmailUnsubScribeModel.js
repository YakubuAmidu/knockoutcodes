// models/emailUnsubscribeModel.js
import mongoose from "mongoose";

const emailUnsubscribeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
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
  {
    timestamps: true,
  }
);

const EmailUnsubscribe = mongoose.model(
  "EmailUnsubscribe",
  emailUnsubscribeSchema
);

export default EmailUnsubscribe;