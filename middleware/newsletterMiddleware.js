// middleware/newsletterMiddleware.js

function cleanString(value, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function blockUnsafeBodyKeys(obj) {
  if (!obj || typeof obj !== "object") return false;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      return true;
    }

    const value = obj[key];
    if (value && typeof value === "object") {
      if (blockUnsafeBodyKeys(value)) return true;
    }
  }

  return false;
}

export function newsletterBodyGuard(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
    }

    if (blockUnsafeBodyKeys(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Unsafe input detected.",
      });
    }

    const allowedKeys = [
      "name",
      "email",
      "topic",
      "source",
      "notes",
      "isActive",
      "company", // honeypot
      "website", // honeypot
    ];

    const incomingKeys = Object.keys(req.body);
    const extraKeys = incomingKeys.filter((key) => !allowedKeys.includes(key));

    if (extraKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Unexpected fields provided.",
      });
    }

    if (incomingKeys.length > 8) {
      return res.status(400).json({
        success: false,
        message: "Too many fields submitted.",
      });
    }

    req.body.name = cleanString(req.body.name, 80);
    req.body.email = cleanString(req.body.email, 160).toLowerCase();
    req.body.topic = cleanString(req.body.topic, 60);
    req.body.source = cleanString(req.body.source, 40);
    req.body.notes = cleanString(req.body.notes, 1000);

    if (typeof req.body.company === "string") {
      req.body.company = cleanString(req.body.company, 120);
    }

    if (typeof req.body.website === "string") {
      req.body.website = cleanString(req.body.website, 200);
    }

    if (
      req.body.isActive !== undefined &&
      typeof req.body.isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
      });
    }

    return next();
  } catch{
    return res.status(500).json({
      success: false,
      message: "Failed to validate request body.",
    });
  }
}

export function newsletterQueryGuard(req, res, next) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search query is too long.",
      });
    }

    req.query.q = q;
    next();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to validate query.",
    });
  }
}