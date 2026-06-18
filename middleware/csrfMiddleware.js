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

  const openCsrfPaths = new Set(["/api/v1/auth/csrf", "/auth/csrf"]);

  if (openCsrfPaths.has(req.path) || openCsrfPaths.has(req.originalUrl)) {
    return next();
  }

  const publicAuthPaths = new Set([
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
  ]);

  const authHeader = String(req.headers.authorization || "");

  if (authHeader.startsWith("Bearer ")) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken =
    req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];

  if (!headerToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token missing. Refresh and try again.",
    });
  }

  // Public auth routes must have a CSRF header, but do not require the cookie.
  // This prevents incognito / third-party-cookie blocking from breaking login.
  if (publicAuthPaths.has(req.path) || publicAuthPaths.has(req.originalUrl)) {
    if (String(headerToken).length < 32) {
      return res.status(403).json({
        success: false,
        message: "CSRF token invalid. Refresh and try again.",
      });
    }

    return next();
  }

  // Protected unsafe routes still require double-submit cookie validation.
  if (!cookieToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF cookie missing. Refresh and try again.",
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
