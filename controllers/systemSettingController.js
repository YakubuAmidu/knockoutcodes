import SystemSettings from "../models/SystemSettingModel.js";

async function getOrCreateSettings() {
  let settings = await SystemSettings.findOne();

  if (!settings) {
    settings = await SystemSettings.create({});
  }

  return settings;
}

export const getSystemStatus = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      maintenanceMode: settings.maintenanceMode,
      maintenanceTitle: settings.maintenanceTitle,
      maintenanceMessage: settings.maintenanceMessage,
      allowAdminAccess: settings.allowAdminAccess,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error("getSystemStatus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load system status.",
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
    } = req.body;

    if (typeof maintenanceMode !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "maintenanceMode must be true or false.",
      });
    }

    const settings = await getOrCreateSettings();

    settings.maintenanceMode = maintenanceMode;

    if (typeof maintenanceTitle === "string") {
      settings.maintenanceTitle = maintenanceTitle.trim().slice(0, 120);
    }

    if (typeof maintenanceMessage === "string") {
      settings.maintenanceMessage = maintenanceMessage.trim().slice(0, 500);
    }

    if (typeof allowAdminAccess === "boolean") {
      settings.allowAdminAccess = allowAdminAccess;
    }

    settings.updatedBy = req.user?._id || null;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: maintenanceMode
        ? "Maintenance mode enabled."
        : "Maintenance mode disabled.",
      data: settings,
    });
  } catch (error) {
    console.error("updateMaintenanceMode error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update maintenance mode.",
    });
  }
};