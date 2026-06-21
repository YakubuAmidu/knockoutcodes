// middleware/suspiciousRequestMiddleware.js

import { logSecurityEvent } from "../utils/securityLogger.js";

const BLOCKED_USER_AGENTS = [
  "sqlmap",
  "nikto",
  "acunetix",
  "nessus",
  "masscan",
  "nmap",
];

const SUSPICIOUS_PATH_PATTERNS = [
  ".env",
  "wp-admin",
  "wp-login",
  "phpmyadmin",
  ".git",
  "config.php",
  "shell",
  "adminer",
];

function shouldSkipSuspiciousRequestCheck(req) {
  const path = String(req.originalUrl || req.url || "").toLowerCase();

  return (
    path === "/" ||
    path === "/health" ||
    path.startsWith("/uploads") ||
    path.startsWith("/api/v1/auth/csrf") ||
    path.startsWith("/api/v1/system/status") ||
    path.startsWith("/api/v1/checkout") ||
    path.startsWith("/api/v1/subscriptions/webhook") ||
    path.startsWith("/api/v1/enrollments/webhook/stripe")
  );
}

export async function suspiciousRequestMiddleware(req, res, next) {
  try {
    if (shouldSkipSuspiciousRequestCheck(req)) {
      return next();
    }

    const userAgent = String(req.headers["user-agent"] || "").toLowerCase();
    const path = String(req.originalUrl || "").toLowerCase();
    const method = String(req.method || "").toUpperCase();

    const blockedAgent = BLOCKED_USER_AGENTS.some((agent) =>
      userAgent.includes(agent),
    );

    const suspiciousPath = SUSPICIOUS_PATH_PATTERNS.some((pattern) =>
      path.includes(pattern),
    );

    if (blockedAgent || suspiciousPath) {
      await logSecurityEvent(req, {
        type: "SUSPICIOUS_REQUEST_BLOCKED",
        meta: {
          reason: blockedAgent ? "BLOCKED_USER_AGENT" : "SUSPICIOUS_PATH",
          path,
          method,
          userAgent,
        },
      });

      return res.status(403).json({
        success: false,
        message: "Blocked client.",
      });
    }

    return next();
  } catch {
    return next();
  }
}
