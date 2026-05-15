// models/SystemSettings.js
import mongoose from "mongoose";

/* =========================
   System Settings Schema
========================= */
const systemSettingsSchema = new mongoose.Schema(
  {
    // Global maintenance mode toggle
    maintenanceMode: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Public maintenance title
    maintenanceTitle: {
      type: String,
      trim: true,
      default: "KnockoutCodes is upgrading",
      maxlength: 120,
    },

    // Public maintenance message
    maintenanceMessage: {
      type: String,
      trim: true,
      default:
        "We are improving the training room. Please check back shortly.",
      maxlength: 500,
    },

    // Allow admins to bypass maintenance mode
    allowAdminAccess: {
      type: Boolean,
      default: true,
    },

    // Admin who last updated settings
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   Model Export
========================= */
const SystemSettings =
  mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", systemSettingsSchema);

export default SystemSettings;