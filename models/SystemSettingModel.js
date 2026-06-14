// models/systemSettingModel.js

import mongoose from "mongoose";

const DEFAULT_MAINTENANCE_TITLE = "KnockoutCodes is upgrading";
const DEFAULT_MAINTENANCE_MESSAGE =
  "We are improving the training room. Please check back shortly.";

function sanitizeText(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

const systemSettingSchema = new mongoose.Schema(
  {
    maintenanceMode: {
      type: Boolean,
      default: false,
      index: true,
    },

    maintenanceTitle: {
      type: String,
      trim: true,
      default: DEFAULT_MAINTENANCE_TITLE,
      maxlength: [120, "Maintenance title cannot exceed 120 characters."],
      set: sanitizeText,
    },

    maintenanceMessage: {
      type: String,
      trim: true,
      default: DEFAULT_MAINTENANCE_MESSAGE,
      maxlength: [500, "Maintenance message cannot exceed 500 characters."],
      set: sanitizeText,
    },

    allowAdminAccess: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

systemSettingSchema.index({ updatedAt: -1 });

systemSettingSchema.pre("validate", function (next) {
  this.maintenanceTitle =
    sanitizeText(this.maintenanceTitle) || DEFAULT_MAINTENANCE_TITLE;

  this.maintenanceMessage =
    sanitizeText(this.maintenanceMessage) || DEFAULT_MAINTENANCE_MESSAGE;

  this.allowAdminAccess = this.allowAdminAccess !== false;

  next();
});

const SystemSetting =
  mongoose.models.SystemSetting ||
  mongoose.model("SystemSetting", systemSettingSchema);

export default SystemSetting;