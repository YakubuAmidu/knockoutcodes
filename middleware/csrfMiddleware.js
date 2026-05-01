// middleware/csrfMiddleware.js
import crypto from "crypto";

function isProd() {
  // eslint-disable-next-line no-undef
  return process.env.NODE_ENV === "production";
}

function csrfCookieOptions() {
  // eslint-disable-next-line no-undef
  const sameSite = process.env.COOKIE_SAMESITE || (isProd() ? "none" : "lax");
  const secure =
    // eslint-disable-next-line no-undef
    String(process.env.COOKIE_SECURE || (isProd() ? "true" : "false")) ===
    "true";

  return {
    httpOnly: false, // client must read it to send header
    sameSite,
    secure,
    path: "/",
  };
}

export function issueCsrf(req, res) {
  const token = crypto.randomBytes(32).toString("hex");

  res.cookie("csrfToken", token, {
    ...csrfCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    csrfToken: token,
  });
}

export function requireCsrf(req, res, next) {
  const method = String(req.method || "GET").toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"];

  if (!unsafe.includes(method)) return next();

  // eslint-disable-next-line no-undef
  if (String(process.env.CSRF_ENABLED || "true") !== "true") return next();

  const csrfPaths = new Set([
    "/api/v1/auth/csrf",
  ]);

  if (csrfPaths.has(req.path) || csrfPaths.has(req.originalUrl)) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token missing. Refresh and try again.",
    });
  }

  if (String(cookieToken) !== String(headerToken)) {
    return res.status(403).json({
      success: false,
      message: "CSRF token invalid. Refresh and try again.",
    });
  }

  return next();
}

// Optional alias so older imports do not break
export const csrfRequired = requireCsrf;