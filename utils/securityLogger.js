// utils/securityLogger.js
import crypto from "crypto";
import SecurityEvent from "../models/SecurityEventModel.js";

const LOGGABLE_TYPES = new Set([
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "REFRESH_FAILED",
  "BOT_DETECTED",
  "RATE_LIMITED",
  "CSRF_FAILED",
  "XSS_ATTEMPT",
  "SQLI_ATTEMPT",
  "NOSQLI_ATTEMPT",
  "PATH_TRAVERSAL_ATTEMPT",
  "ADMIN_ACCESS_DENIED",
  "BLOCKED_IP_HIT",
  "PASSWORD_RESET_ABUSE",
  "SCAM_PATTERN",
  "CHECKOUT_ABUSE",
  "SUSPICIOUS_REQUEST",
]);

const SENSITIVE_KEYS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "csrf",
  "card",
  "cvv",
];

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();

  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
}

function cleanString(value, max = 300) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function sanitizeMeta(value = {}) {
  if (!value || typeof value !== "object") return {};

  const output = {};

  for (const [key, val] of Object.entries(value)) {
    const lowered = key.toLowerCase();

    if (SENSITIVE_KEYS.some((sensitive) => lowered.includes(sensitive))) {
      output[key] = "[REDACTED]";
      continue;
    }

    if (typeof val === "string") {
      output[key] = cleanString(val, 500);
    } else if (
      typeof val === "number" ||
      typeof val === "boolean" ||
      val === null
    ) {
      output[key] = val;
    } else {
      output[key] = "[OBJECT]";
    }
  }

  return output;
}

function inferSeverity(type) {
  if (
    [
      "XSS_ATTEMPT",
      "SQLI_ATTEMPT",
      "NOSQLI_ATTEMPT",
      "PATH_TRAVERSAL_ATTEMPT",
      "BLOCKED_IP_HIT",
    ].includes(type)
  ) {
    return "critical";
  }

  if (
    [
      "ACCOUNT_LOCKED",
      "CSRF_FAILED",
      "ADMIN_ACCESS_DENIED",
      "SCAM_PATTERN",
      "CHECKOUT_ABUSE",
    ].includes(type)
  ) {
    return "high";
  }

  if (["LOGIN_FAILED", "REFRESH_FAILED", "RATE_LIMITED"].includes(type)) {
    return "medium";
  }

  return "low";
}

function inferCategory(type) {
  if (
    [
      "LOGIN_FAILED",
      "ACCOUNT_LOCKED",
      "REFRESH_FAILED",
      "PASSWORD_RESET_ABUSE",
    ].includes(type)
  ) {
    return "auth";
  }

  if (["BOT_DETECTED", "RATE_LIMITED"].includes(type)) return "bot";

  if (
    [
      "XSS_ATTEMPT",
      "SQLI_ATTEMPT",
      "NOSQLI_ATTEMPT",
      "PATH_TRAVERSAL_ATTEMPT",
      "CSRF_FAILED",
      "BLOCKED_IP_HIT",
    ].includes(type)
  ) {
    return "attack";
  }

  if (["ADMIN_ACCESS_DENIED"].includes(type)) return "admin";
  if (["CHECKOUT_ABUSE"].includes(type)) return "payment";
  if (["SCAM_PATTERN", "SUSPICIOUS_REQUEST"].includes(type)) return "abuse";

  return "system";
}

function makeTitle(type) {
  return cleanString(String(type || "SUSPICIOUS_REQUEST").replaceAll("_", " "));
}

function makeFingerprint({ type, ip, email, method, path, userAgent }) {
  const ua = String(userAgent || "").slice(0, 120);

  return crypto
    .createHash("sha256")
    .update([type, ip, email, method, path, ua].join("|"))
    .digest("hex");
}

export async function logSecurityEvent(req, options = {}) {
  try {
    const type = cleanString(options.type, 80);

    if (!type) return null;

    const force = Boolean(options.force);

    if (!force && !LOGGABLE_TYPES.has(type)) {
      return null;
    }

    const ip = cleanString(options.ip || getIp(req), 80);
    const userAgent = cleanString(
      options.userAgent || req.headers["user-agent"] || "",
      600
    );

    const email = cleanString(options.email || req.user?.email || "", 160)
      .toLowerCase();

    const method = cleanString(req.method || "", 12).toUpperCase();
    const path = cleanString(req.originalUrl || req.path || "", 300);

    const severity = options.severity || inferSeverity(type);
    const category = options.category || inferCategory(type);

    const fingerprint = makeFingerprint({
      type,
      ip,
      email,
      method,
      path,
      userAgent,
    });

    const meta = sanitizeMeta({
      ...options.meta,
      whatTheyDid: options.whatTheyDid || makeTitle(type),
      route: path,
      method,
    });

    const event = await SecurityEvent.findOneAndUpdate(
      {
        fingerprint,
        reviewStatus: "unreviewed",
        createdAt: {
          $gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      },
      {
        $setOnInsert: {
          user: options.user || req.user?._id || null,
          email,
          type,
          severity,
          category,
          title: options.title || makeTitle(type),
          ip,
          userAgent,
          method,
          path,
          fingerprint,
          meta,
          reviewStatus: options.reviewStatus || "unreviewed",
          actionTaken: "none",
        },
        $inc: { count: 1 },
        $set: { lastSeenAt: new Date() },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return event;
  } catch {
    return null;
  }
}