// utils/securityLogger.js
import SecurityEvent from "../models/SecurityEventModel.js";

export async function logSecurityEvent(req, options = {}) {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";

    const userAgent = req.headers["user-agent"] || "";

    await SecurityEvent.create({
      user: options.user || null,
      email: String(options.email || "").trim().toLowerCase(),
      type: options.type,
      ip,
      userAgent,
      meta: options.meta || {},
    });
  } catch {
    // Never break auth because logging failed.
  }
}