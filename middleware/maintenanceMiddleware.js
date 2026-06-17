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

const CACHE_MS = 30000;
const DB_TIMEOUT_MS = 2500;

let cachedSettings = null;
let cachedAt = 0;

const isBypassPath = (path = "") => {
  const cleanPath = String(path).split("?")[0];
  return PUBLIC_BYPASS_PATHS.some((allowedPath) =>
    cleanPath.startsWith(allowedPath)
  );
};

const isAdminUser = (req) =>
  req.user && ["admin", "superadmin"].includes(String(req.user.role));

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Maintenance settings DB timeout")), ms)
    ),
  ]);
}

async function getSettings() {
  const now = Date.now();

  if (cachedSettings && now - cachedAt < CACHE_MS) {
    return cachedSettings;
  }

  const settings = await withTimeout(
    SystemSetting.findOne().lean(),
    DB_TIMEOUT_MS
  );

  cachedSettings =
    settings || {
      maintenanceMode: false,
      allowAdminAccess: true,
    };

  cachedAt = now;

  return cachedSettings;
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
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("maintenanceMiddleware error:", error.message);
    }

    return next();
  }
};