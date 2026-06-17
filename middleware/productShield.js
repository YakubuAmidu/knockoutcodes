// middleware/productShield.js

import rateLimit from "express-rate-limit";
import { noSqlShield, allowOnlyProductQueryKeys } from "./noSqlShield.js";
import {
  publicRequestHardening,
  adminRequestHardening,
} from "./requestHardening.js";

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

export function allowMethods(methods = ["GET"]) {
  const allowed = methods.map((m) => String(m).toUpperCase());

  return (req, res, next) => {
    const method = String(req.method || "GET").toUpperCase();

    if (!allowed.includes(method)) {
      return res.status(405).json({
        success: false,
        message: "Method not allowed.",
      });
    }

    next();
  };
}

export function botGuard(req, res, next) {
  const ua = String(req.headers["user-agent"] || "").toLowerCase();

  if (!ua || ua.trim().length < 3) {
    return res.status(403).json({
      success: false,
      message: "Blocked client.",
    });
  }

  const badUAs = ["curl", "wget", "python-requests", "httpclient", "scrapy"];

  if (badUAs.some((bad) => ua.includes(bad))) {
    return res.status(403).json({
      success: false,
      message: "Blocked client.",
    });
  }

  next();
}

export const productsReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    return `${ip}::${ua}`;
  },
  message: {
    success: false,
    message: "Too many requests. Slow down and try again.",
  },
});

export const productsWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    return `${ip}::${ua}`;
  },
  message: {
    success: false,
    message: "Too many write attempts. Try again later.",
  },
});

export const productPublicShield = [
  allowMethods(["GET"]),
  ...publicRequestHardening,
  botGuard,
  noSqlShield,
  allowOnlyProductQueryKeys,
  productsReadLimiter,
];

export const productAdminWriteShield = [
  allowMethods(["POST", "PUT", "PATCH"]),
  ...adminRequestHardening,
  botGuard,
  noSqlShield,
  productsWriteLimiter,
];

export const productAdminDeleteShield = [
  allowMethods(["DELETE"]),
  botGuard,
  noSqlShield,
  productsWriteLimiter,
];
