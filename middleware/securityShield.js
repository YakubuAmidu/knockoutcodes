// middleware/securityShield.js

/**
 * Reusable security shield for common route protection.
 * Keep this file GENERIC.
 * Do not put business-specific validation here.
 */

const BAD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Get client IP safely.
 * Important when app is behind a proxy (Render, Railway, Nginx, etc).
 */
export function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
}

/**
 * Only allow specific HTTP methods on a route.
 * Helps avoid accidental exposure of methods.
 */
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

/**
 * Require JSON for unsafe methods only.
 * Safe methods like GET/HEAD/OPTIONS are skipped.
 */
export function requireJson(req, res, next) {
  const method = String(req.method || "GET").toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"];

  if (!unsafe.includes(method)) return next();

  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (!contentType.includes("application/json")) {
    return res.status(415).json({
      success: false,
      message: "Content-Type must be application/json.",
    });
  }

  next();
}

/**
 * Reject oversized payloads early.
 * Express body parser should still have its own limit too.
 */
export function maxBodySize(maxBytes = 50 * 1024) {
  return (req, res, next) => {
    const length = req.headers["content-length"];
    if (!length) return next();

    const size = Number(length);
    if (!Number.isFinite(size)) return next();

    if (size > maxBytes) {
      return res.status(413).json({
        success: false,
        message: `Payload too large. Max ${maxBytes} bytes.`,
      });
    }

    next();
  };
}

/**
 * Block obviously bad or malformed clients.
 * Keep this light to avoid false positives.
 */
export function headerSanity(req, res, next) {
  const userAgent = String(req.headers["user-agent"] || "").trim();

  if (!userAgent) {
    return res.status(403).json({
      success: false,
      message: "Blocked client.",
    });
  }

  if (req.headers["x-http-method-override"]) {
    return res.status(400).json({
      success: false,
      message: "Method override not allowed.",
    });
  }

  next();
}

/**
 * Light scanner / bot guard.
 * Do not use aggressive blocking here.
 * Keep it practical and safe.
 */
export function botGuard(req, res, next) {
  const ua = String(req.headers["user-agent"] || "").toLowerCase().trim();

  if (!ua || ua.length < 3) {
    return res.status(403).json({
      success: false,
      message: "Blocked client.",
    });
  }

  const blockedAgents = [
    "curl",
    "wget",
    "python-requests",
    "scrapy",
    "httpclient",
    "insomnia",
    "postmanruntime",
  ];

  if (blockedAgents.some((item) => ua.includes(item))) {
    return res.status(403).json({
      success: false,
      message: "Blocked client.",
    });
  }

  return next();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanObject(input) {
  if (!isPlainObject(input)) return input;

  const output = {};

  for (const [key, value] of Object.entries(input)) {
    // Block prototype pollution keys
    if (BAD_KEYS.has(key)) continue;

    // Block Mongo operators and dotted keys
    if (key.startsWith("$")) continue;
    if (key.includes(".")) continue;

    if (Array.isArray(value)) {
      output[key] = value.map((item) =>
        isPlainObject(item) ? cleanObject(item) : item
      );
      continue;
    }

    if (isPlainObject(value)) {
      output[key] = cleanObject(value);
      continue;
    }

    output[key] = value;
  }

  return output;
}

/**
 * Remove dangerous keys from req.body, req.query, req.params
 * to reduce NoSQL injection and prototype pollution risk.
 */
export function noSqlShield(req, _res, next) {
  if (isPlainObject(req.body)) req.body = cleanObject(req.body);
  if (isPlainObject(req.query)) req.query = cleanObject(req.query);
  if (isPlainObject(req.params)) req.params = cleanObject(req.params);

  next();
}

/**
 * Optional allowlist for query keys.
 * Good for public listing endpoints.
 */
export function allowQueryKeys(keys = []) {
  const allowed = new Set(keys);

  return (req, _res, next) => {
    const safeQuery = {};

    for (const [key, value] of Object.entries(req.query || {})) {
      if (allowed.has(key)) {
        safeQuery[key] = value;
      }
    }

    req.query = safeQuery;
    next();
  };
}

/**
 * Reusable shield factory.
 * This lets us build route-level protection in a clean way.
 */
export function createShield(options = {}) {
  const {
    methods,
    requireJsonContent = false,
    maxBytes = 50 * 1024,
    useBotGuard = true,
    useNoSqlShield = true,
  } = options;

  const chain = [];

  if (Array.isArray(methods) && methods.length > 0) {
    chain.push(allowMethods(methods));
  }

  chain.push(headerSanity);

  if (useBotGuard) {
    chain.push(botGuard);
  }

  if (requireJsonContent) {
    chain.push(requireJson);
  }

  chain.push(maxBodySize(maxBytes));

  if (useNoSqlShield) {
    chain.push(noSqlShield);
  }

  return chain;
}

/**
 * Common presets
 * These are safe defaults and easy to reuse.
 */
export const publicShield = createShield({
  methods: ["GET"],
  requireJsonContent: false,
  maxBytes: 60 * 1024,
  useBotGuard: true,
  useNoSqlShield: true,
});

export const writeShield = createShield({
  methods: ["POST", "PUT", "PATCH", "DELETE"],
  requireJsonContent: true,
  maxBytes: 40 * 1024,
  useBotGuard: true,
  useNoSqlShield: true,
});

export const authShield = createShield({
  methods: ["POST"],
  requireJsonContent: true,
  maxBytes: 20 * 1024,
  useBotGuard: true,
  useNoSqlShield: true,
});