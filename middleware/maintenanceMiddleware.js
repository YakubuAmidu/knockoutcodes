import SystemSetting from "../models/SystemSettingModel.js";

const PUBLIC_BYPASS_PATHS = [
  "/api/v1/system/status",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/logout",
  "/api/v1/auth/me",
  "/api/v1/auth/csrf",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-email",
  "/api/v1/stripe/webhook",
  "/api/v1/webhooks/stripe",
  "/api/v1/health",
];

const isBypassPath = (path = "") =>
  PUBLIC_BYPASS_PATHS.some((allowedPath) => path.startsWith(allowedPath));

const isAdminUser = (req) =>
  req.user && ["admin", "superadmin"].includes(String(req.user.role));

let cachedSettings = null;
let cachedAt = 0;

const CACHE_MS = 5000;

async function getSettings() {
  const now = Date.now();

  if (cachedSettings && now - cachedAt < CACHE_MS) {
    return cachedSettings;
  }

  let settings = await SystemSetting.findOne().lean();

  if (!settings) {
    settings = await SystemSetting.create({});
    settings = settings.toObject();
  }

  cachedSettings = settings;
  cachedAt = now;

  return settings;
}

export const clearMaintenanceCache = () => {
  cachedSettings = null;
  cachedAt = 0;
};

export const maintenanceMiddleware = async (req, res, next) => {
  try {
    if (req.method === "OPTIONS") return next();

    const path = req.originalUrl || req.url || "";

    if (isBypassPath(path)) return next();

    const settings = await getSettings();

    if (!settings?.maintenanceMode) return next();

    const allowAdminAccess = settings.allowAdminAccess !== false;

    if (allowAdminAccess && isAdminUser(req)) {
      return next();
    }

    return res.status(503).json({
      success: false,
      maintenanceMode: true,
      message: "The platform is currently under maintenance.",
      data: {
        maintenanceMode: true,
        maintenanceTitle:
          settings.maintenanceTitle || "KnockoutCodes is upgrading",
        maintenanceMessage:
          settings.maintenanceMessage ||
          "We are improving the training room. Please check back shortly.",
        allowAdminAccess,
        updatedAt: settings.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("maintenanceMiddleware error:", error);
    return next();
  }
};
