// controllers/systemSettingController.js

import mongoose from "mongoose";
import SystemSetting from "../models/systemSettingModel.js";
import { emitMaintenanceUpdate } from "../config/socket.js";

const DEFAULT_TITLE = "KnockoutCodes is upgrading";
const DEFAULT_MESSAGE =
  "We are improving the training room. Please check back shortly.";

function sanitizeText(value, max = 500) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function formatSetting(setting) {
  return {
    _id: setting?._id,
    maintenanceMode: Boolean(setting?.maintenanceMode),
    maintenanceTitle: setting?.maintenanceTitle || DEFAULT_TITLE,
    maintenanceMessage: setting?.maintenanceMessage || DEFAULT_MESSAGE,
    allowAdminAccess: setting?.allowAdminAccess !== false,
    updatedBy: setting?.updatedBy || null,
    createdAt: setting?.createdAt || null,
    updatedAt: setting?.updatedAt || null,
  };
}

async function getOrCreateSystemSetting() {
  let setting = await SystemSetting.findOne().sort({
    updatedAt: -1,
    createdAt: -1,
  });

  if (!setting) {
    setting = await SystemSetting.create({
      maintenanceMode: false,
      maintenanceTitle: DEFAULT_TITLE,
      maintenanceMessage: DEFAULT_MESSAGE,
      allowAdminAccess: true,
    });
  }

  return setting;
}

export const getSystemStatus = async (req, res) => {
  try {
    const setting = await getOrCreateSystemSetting();

    return res.status(200).json({
      success: true,
      data: formatSetting(setting),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load system status.",
    });
  }
};

export const getAdminSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: settings.length,
      data: settings.map(formatSetting),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load system settings.",
    });
  }
};

export const updateMaintenanceMode = async (req, res) => {
  try {
    const {
      maintenanceMode,
      maintenanceTitle,
      maintenanceMessage,
      allowAdminAccess,
    } = req.body || {};

    if (typeof maintenanceMode !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Maintenance mode must be true or false.",
      });
    }

    const setting = await getOrCreateSystemSetting();

    setting.maintenanceMode = maintenanceMode;
    setting.maintenanceTitle =
      sanitizeText(maintenanceTitle, 120) || DEFAULT_TITLE;
    setting.maintenanceMessage =
      sanitizeText(maintenanceMessage, 500) || DEFAULT_MESSAGE;
    setting.allowAdminAccess = allowAdminAccess !== false;

    setting.updatedBy =
      req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
        ? req.user._id
        : null;

    await setting.save();

    const payload = formatSetting(setting);
    emitMaintenanceUpdate(payload);

    return res.status(200).json({
      success: true,
      message: maintenanceMode
        ? "Maintenance mode has been enabled."
        : "Maintenance mode has been disabled.",
      data: payload,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update maintenance mode.",
    });
  }
};

export const deleteSystemSetting = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid system setting ID.",
      });
    }

    const settings = await SystemSetting.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .select("_id")
      .lean();

    if (settings.length <= 1) {
      return res.status(400).json({
        success: false,
        message:
          "The main system setting is protected. You can only delete duplicate old records.",
      });
    }

    const protectedId = String(settings[0]._id);

    if (String(id) === protectedId) {
      return res.status(400).json({
        success: false,
        message:
          "This is the active system setting. Delete only older duplicate records.",
      });
    }

    const deleted = await SystemSetting.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "System setting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Duplicate system setting deleted successfully.",
      deletedId: id,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete system setting.",
    });
  }
};