// middleware/blockedIpMiddleware.js
import BlockedIp from "../models/BlockedIpModel.js";

function normalizeIp(ip = "") {
  return String(ip)
    .trim()
    .replace(/^::ffff:/, "")
    .replace(/^::1$/, "127.0.0.1");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return normalizeIp(String(forwarded).split(",")[0]);
  }

  return normalizeIp(
    req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "",
  );
}

function shouldSkipBlockedIpCheck(req) {
  const path = req.originalUrl || req.url || "";

  return (
    path === "/" ||
    path === "/health" ||
    path.startsWith("/uploads") ||
    path.startsWith("/api/v1/subscriptions/webhook") ||
    path.startsWith("/api/v1/enrollments/webhook/stripe")
  );
}

export async function blockBlockedIps(req, res, next) {
  try {
    if (shouldSkipBlockedIpCheck(req)) return next();

    const ip = getClientIp(req);
    if (!ip) return next();

    const blocked = await BlockedIp.findOne({
      ip,
      isActive: true,
    }).lean();

    if (blocked) {
      return res.status(403).json({
        success: false,
        message: "Access blocked.",
      });
    }

    return next();
  } catch (error) {
    console.error("blockBlockedIps error:", error);
    return next();
  }
}
