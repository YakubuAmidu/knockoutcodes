// middleware/newsletterMiddleware.js

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function cleanString(value, maxLength = 200) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, maxLength);
}

function blockUnsafeBodyKeys(obj) {
  if (!obj || typeof obj !== "object") return false;

  for (const key of Object.keys(obj)) {
    if (
      key.startsWith("$") ||
      key.includes(".") ||
      key.includes("__proto__") ||
      key.includes("constructor") ||
      key.includes("prototype")
    ) {
      return true;
    }

    const value = obj[key];

    if (value && typeof value === "object") {
      if (blockUnsafeBodyKeys(value)) {
        return true;
      }
    }
  }

  return false;
}

function validateAllowedFields(req, res, allowedKeys) {
  const incomingKeys = Object.keys(req.body || {});

  const extraKeys = incomingKeys.filter(
    (key) => !allowedKeys.includes(key)
  );

  if (extraKeys.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Unexpected fields provided.",
    });
  }

  if (incomingKeys.length > allowedKeys.length) {
    return res.status(400).json({
      success: false,
      message: "Too many fields submitted.",
    });
  }

  return null;
}

function validateEmail(email) {
  return EMAIL_REGEX.test(String(email || "").trim());
}

/* =========================================
   PUBLIC NEWSLETTER BODY GUARD
========================================= */
export function newsletterBodyGuard(req, res, next) {
  try {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
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
      "company",
      "website",
    ];

    const fieldError = validateAllowedFields(
      req,
      res,
      allowedKeys
    );

    if (fieldError) return fieldError;

    req.body.name = cleanString(req.body.name, 80);

    req.body.email = cleanString(
      req.body.email,
      160
    ).toLowerCase();

    req.body.topic = cleanString(
      req.body.topic,
      80
    );

    req.body.source =
      cleanString(req.body.source, 60) || "footer";

    if (
      typeof req.body.company === "string"
    ) {
      req.body.company = cleanString(
        req.body.company,
        120
      );
    }

    if (
      typeof req.body.website === "string"
    ) {
      req.body.website = cleanString(
        req.body.website,
        200
      );
    }

    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!validateEmail(req.body.email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    return next();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to validate request body.",
    });
  }
}

/* =========================================
   ADMIN NEWSLETTER BODY GUARD
========================================= */
export function newsletterAdminBodyGuard(
  req,
  res,
  next
) {
  try {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
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
    ];

    const fieldError = validateAllowedFields(
      req,
      res,
      allowedKeys
    );

    if (fieldError) return fieldError;

    if (req.body.name !== undefined) {
      req.body.name = cleanString(
        req.body.name,
        80
      );
    }

    if (req.body.email !== undefined) {
      req.body.email = cleanString(
        req.body.email,
        160
      ).toLowerCase();

      if (
        req.body.email &&
        !validateEmail(req.body.email)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid email address.",
        });
      }
    }

    if (req.body.topic !== undefined) {
      req.body.topic = cleanString(
        req.body.topic,
        80
      );
    }

    if (req.body.source !== undefined) {
      req.body.source =
        cleanString(req.body.source, 60) ||
        "admin";
    }

    if (req.body.notes !== undefined) {
      req.body.notes = cleanString(
        req.body.notes,
        1000
      );
    }

    if (
      req.body.isActive !== undefined &&
      typeof req.body.isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be a boolean.",
      });
    }

    return next();
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to validate admin request body.",
    });
  }
}

/* =========================================
   ADMIN QUERY GUARD
========================================= */
export function newsletterQueryGuard(
  req,
  res,
  next
) {
  try {
    const q =
      typeof req.query.q === "string"
        ? cleanString(req.query.q, 100)
        : "";

    const status =
      typeof req.query.status === "string"
        ? cleanString(req.query.status, 20)
        : "";

    const allowedStatuses = [
      "active",
      "inactive",
      "all",
      "",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid newsletter status filter.",
      });
    }

    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 20;

    page = Math.max(page, 1);
    limit = Math.min(Math.max(limit, 1), 100);

    req.query.q = q;
    req.query.status = status;
    req.query.page = page;
    req.query.limit = limit;

    return next();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to validate query.",
    });
  }
}