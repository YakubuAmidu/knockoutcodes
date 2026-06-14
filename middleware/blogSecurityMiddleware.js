import mongoose from "mongoose";

const ALLOWED_CATEGORIES = new Set([
  "boxing",
  "mindset",
  "conditioning",
  "nutrition",
  "lifestyle",
  "other",
]);

const stripDangerous = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/\0/g, "");
};

const stripMongoOperators = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripMongoOperators);

  const clean = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = stripMongoOperators(value);
  }

  return clean;
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return Boolean(value);
};

const isSafeSlug = (value = "") =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value).trim().toLowerCase());

export const validateBlogBody = (req, res, next) => {
  const body = stripMongoOperators(req.body || {});

  if (typeof body.title === "string") body.title = stripDangerous(body.title);
  if (typeof body.slug === "string") body.slug = stripDangerous(body.slug).toLowerCase();
  if (typeof body.excerpt === "string") body.excerpt = stripDangerous(body.excerpt);
  if (typeof body.content === "string") body.content = stripDangerous(body.content);
  if (typeof body.coverImage === "string") body.coverImage = stripDangerous(body.coverImage);
  if (typeof body.category === "string") body.category = stripDangerous(body.category).toLowerCase();

  if (typeof body.isPublished !== "undefined") {
    body.isPublished = normalizeBoolean(body.isPublished);
  }

  if (typeof body.featured !== "undefined") {
    body.featured = normalizeBoolean(body.featured);
  }

  if (Array.isArray(body.tags)) {
    body.tags = [
      ...new Set(
        body.tags
          .map((tag) => (typeof tag === "string" ? stripDangerous(tag).toLowerCase() : ""))
          .filter(Boolean)
          .slice(0, 12)
      ),
    ];
  }

  req.body = body;

  if (req.method === "POST") {
    if (!body.title || !body.content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }
  }

  if (typeof body.title === "string" && body.title.length > 150) {
    return res.status(400).json({
      success: false,
      message: "Title cannot exceed 150 characters.",
    });
  }

  if (typeof body.slug === "string" && body.slug && !isSafeSlug(body.slug)) {
    return res.status(400).json({
      success: false,
      message: "Slug can only contain lowercase letters, numbers, and hyphens.",
    });
  }

  if (typeof body.excerpt === "string" && body.excerpt.length > 300) {
    return res.status(400).json({
      success: false,
      message: "Excerpt cannot exceed 300 characters.",
    });
  }

  if (typeof body.content === "string" && body.content.length < 50) {
    return res.status(400).json({
      success: false,
      message: "Content should be at least 50 characters.",
    });
  }

  if (typeof body.category === "string" && !ALLOWED_CATEGORIES.has(body.category)) {
    return res.status(400).json({
      success: false,
      message: "Invalid blog category.",
    });
  }

  next();
};

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

export const validateBlogIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({
      success: false,
      message: "Invalid blog id.",
    });
  }

  next();
};

export const validateIdOrSlugParam = (req, res, next) => {
  const raw = req.params.idOrSlug;

  if (!raw) {
    return res.status(400).json({
      success: false,
      message: "Missing blog id or slug.",
    });
  }

  const idOrSlug = String(raw).trim().toLowerCase();

  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    req.params.idOrSlug = idOrSlug;
    return next();
  }

  if (isSafeSlug(idOrSlug) && idOrSlug.length >= 2 && idOrSlug.length <= 180) {
    req.params.idOrSlug = idOrSlug;
    return next();
  }

  return res.status(400).json({
    success: false,
    message: "Invalid blog id or slug.",
  });
};