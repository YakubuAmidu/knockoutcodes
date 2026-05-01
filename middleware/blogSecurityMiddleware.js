// middleware/blogSecurityMiddleware.js
import mongoose from "mongoose";

const stripDangerous = (v) => {
  if (typeof v !== "string") return v;
  return v.trim().replace(/\0/g, "");
};

const stripMongoOperators = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripMongoOperators);

  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    // block mongo operator injection and dot-path injection
    if (k.startsWith("$") || k.includes(".")) continue;
    clean[k] = stripMongoOperators(v);
  }
  return clean;
};

export const validateBlogBody = (req, res, next) => {
    const b = stripMongoOperators(req.body || {});

  // sanitize strings
  if (typeof b.title === "string") b.title = stripDangerous(b.title);
  if (typeof b.slug === "string") b.slug = stripDangerous(b.slug);
  if (typeof b.excerpt === "string") b.excerpt = stripDangerous(b.excerpt);
  if (typeof b.content === "string") b.content = stripDangerous(b.content);
  if (typeof b.coverImage === "string") b.coverImage = stripDangerous(b.coverImage);
  if (typeof b.category === "string") b.category = stripDangerous(b.category);

  // normalize tags
  if (Array.isArray(b.tags)) {
    b.tags = b.tags
      .map((t) => (typeof t === "string" ? stripDangerous(t) : ""))
      .filter(Boolean)
      .slice(0, 20);
  }

  req.body = b;

  // required check for create (only if POST)
  if (req.method === "POST") {
    if (!b.title || !b.content) {
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required" });
    }

    if (String(b.content).length < 50) {
      return res.status(400).json({
        success: false,
        message: "Content should be at least 50 characters",
      });
    }
  }

  next();
};

// Only allow specific fields to be updated (stops malicious updates)
export const pickAllowedBlogUpdateFields = (req, res, next) => {
  const allowed = new Set([
    "title",
    "slug",
    "excerpt",
    "content",
    "coverImage",
    "category",
    "tags",
    "isPublished",
    "featured",
  ]);

  const incoming = req.body || {};
  const cleaned = {};

  for (const key of Object.keys(incoming)) {
    if (allowed.has(key)) cleaned[key] = incoming[key];
  }

  req.body = cleaned;
  next();
};

// ✅ Validate routes using :id (ObjectId only)
export const validateBlogIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid blog id" });
  }
  next();
};

// ✅ Validate routes using :idOrSlug (ObjectId OR slug string)
export const validateIdOrSlugParam = (req, res, next) => {
  const { idOrSlug } = req.params;

  if (!idOrSlug) {
    return res
      .status(400)
      .json({ success: false, message: "Missing blog id or slug" });
  }

  // Allow ObjectId
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) return next();

  // Allow slug-like string (basic)
  if (typeof idOrSlug === "string" && idOrSlug.trim().length >= 2) return next();

  return res
    .status(400)
    .json({ success: false, message: "Invalid blog id or slug" });
};

