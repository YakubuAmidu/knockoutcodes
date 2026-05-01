// middleware/membershipShield.js

const DEFAULT_MAX_BODY_BYTES = 25 * 1024; // 25kb (memberships are small objects)
const WINDOW_MS = 60 * 1000; // 1 minute

// tiny in-memory limiter (safe starter)
// NOTE: in production with multiple servers, replace with Redis-based limiter later.
const hits = new Map();

function isJson(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  // allow charset variants
  return ct.includes("application/json");
}

function now() {
  return Date.now();
}

function cleanOldEntries() {
  const t = now();
  for (const [k, v] of hits.entries()) {
    if (t - v.start > WINDOW_MS * 2) hits.delete(k);
  }
}

function getClientIp(req) {
  // works behind proxies if you set app.set("trust proxy", 1)
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "unknown";
}

function hasSuspiciousKeys(obj) {
  if (!obj || typeof obj !== "object") return false;

  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    for (const key of Object.keys(cur)) {
      // block NoSQL injection operators
      if (key.startsWith("$") || key.includes(".")) return true;

      const val = cur[key];
      if (val && typeof val === "object") stack.push(val);
    }
  }
  return false;
}

// Only allow updating safe fields (prevents attackers from setting createdBy, etc.)
const ALLOWED_CREATE_FIELDS = new Set([
  "membershipId",
  "title",
  "instructor",
  "priceLabel",
  "rating",
  "enrolled",
  "stripePriceId",
  "short",
  "meta",
  "glyph",
  "badgeLeft",
  "badgeRight",
  "highlight",
  "isPublished",
  "isFeatured",
]);

const ALLOWED_UPDATE_FIELDS = new Set([
  ...ALLOWED_CREATE_FIELDS,
  // slug is computed in schema middleware; do NOT accept slug from client
  // createdBy should never be set by client
]);

function pickAllowed(body, allowedSet) {
  const out = {};
  for (const k of Object.keys(body || {})) {
    if (allowedSet.has(k)) out[k] = body[k];
  }
  return out;
}

export function membershipShield(options = {}) {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const maxWritesPerMinute = options.maxWritesPerMinute ?? 30; // per IP

  return function (req, res, next) {
    cleanOldEntries();

    // Only protect write routes heavily
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

    // 1) Basic bot filter (super safe starter)
    // (We don't block GET to avoid breaking SEO/crawlers)
    if (isWrite) {
      const ua = String(req.headers["user-agent"] || "").trim();
      if (!ua || ua.length < 8) {
        return res.status(403).json({
          success: false,
          message: "Request blocked",
        });
      }
    }

    // 2) Enforce JSON content-type on writes (prevents weird form payload attacks)
    if (isWrite) {
      if (!isJson(req)) {
        return res.status(415).json({
          success: false,
          message: "Content-Type must be application/json",
        });
      }
    }

    // 3) Limit body size (blocks spam payloads)
    // (Uses content-length header when present; your app should also use express.json({ limit }))
    if (isWrite) {
      const len = Number(req.headers["content-length"] || 0);
      if (len && len > maxBodyBytes) {
        return res.status(413).json({
          success: false,
          message: "Payload too large",
        });
      }
    }

    // 4) Simple per-IP rate limit for writes
    if (isWrite) {
      const ip = getClientIp(req);
      const key = `membership:${ip}`;

      const record = hits.get(key) || { start: now(), count: 0 };
      const elapsed = now() - record.start;

      if (elapsed > WINDOW_MS) {
        record.start = now();
        record.count = 0;
      }

      record.count += 1;
      hits.set(key, record);

      if (record.count > maxWritesPerMinute) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Try again shortly.",
        });
      }
    }

    // 5) Block NoSQL injection keys like $gt, $where, or dotted keys
    if (isWrite) {
      if (hasSuspiciousKeys(req.body)) {
        return res.status(400).json({
          success: false,
          message: "Invalid request payload",
        });
      }
    }

    // 6) Strip forbidden fields (prevents client from setting createdBy/slug, etc.)
    if (req.method === "POST") {
      req.body = pickAllowed(req.body, ALLOWED_CREATE_FIELDS);
    } else if (req.method === "PUT" || req.method === "PATCH") {
      req.body = pickAllowed(req.body, ALLOWED_UPDATE_FIELDS);
    }

    return next();
  };
}
