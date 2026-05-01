// middleware/productWriteFirewall.js

const PRODUCT_ALLOWED_FIELDS = [
  "brand",
  "title",
  "shortDescription",
  "description",
  "price",
  "compareAtPrice",
  "images",
  "category",
  "tags",
  "sizes",
  "colors",
  "stock",
  "sku",
  "isActive",
  "isFeatured",
];

// ✅ Must match your Product schema enum
const PRODUCT_ALLOWED_BRANDS = ["knockoutcodes", "stylesavant", "thecodingblueprint"];

// Same rules for create and update, so it’s reusable and consistent.
function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj?.[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function toStr(v) {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

function trimClamp(str, max) {
  const s = toStr(str).trim();
  if (max && s.length > max) return s.slice(0, max);
  return s;
}

function toNumber(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

// ✅ Allows: https://..., http://..., /uploads/...
function isSafeImagePathOrUrl(s) {
  const v = trimClamp(s, 300);

  if (!v) return false;

  // allow server-hosted images
  if (v.startsWith("/uploads/")) return true;

  // allow absolute http(s) urls
  if (v.startsWith("https://") || v.startsWith("http://")) return true;

  return false;
}

function asArray(v, maxItems, itemValidator) {
  if (!Array.isArray(v)) return [];
  const cleaned = v
    .map((x) => trimClamp(x, 60))
    .filter(Boolean);

  const filtered = typeof itemValidator === "function"
    ? cleaned.filter(itemValidator)
    : cleaned;

  if (typeof maxItems === "number") return filtered.slice(0, maxItems);
  return filtered;
}

/**
 * Strict product body sanitizer:
 * - Drops unknown keys
 * - Enforces types and limits
 * - Prevents sneaky extra data from reaching controllers
 */
export function productWriteFirewall(req, res, next) {
  const raw = req.body || {};

  // 1) Allowlist ONLY
  const body = pick(raw, PRODUCT_ALLOWED_FIELDS);

  // 2) Normalize + clamp strings
  if (body.brand !== undefined) body.brand = trimClamp(body.brand, 30).toLowerCase();
  if (body.title !== undefined) body.title = trimClamp(body.title, 120);
  if (body.shortDescription !== undefined) body.shortDescription = trimClamp(body.shortDescription, 220);
  if (body.description !== undefined) body.description = trimClamp(body.description, 4000);
  if (body.category !== undefined) body.category = trimClamp(body.category, 80);
  if (body.sku !== undefined) body.sku = trimClamp(body.sku, 80);

  // ✅ 2.5) Brand enforcement (matches schema enum)
  if (body.brand !== undefined) {
    if (!PRODUCT_ALLOWED_BRANDS.includes(body.brand)) {
      return res.status(400).json({
        success: false,
        message: `Invalid brand. Allowed: ${PRODUCT_ALLOWED_BRANDS.join(", ")}.`,
      });
    }
  }

  // 3) Numbers
  if (body.price !== undefined) {
    const n = toNumber(body.price);
    if (n === null || n < 0) {
      return res.status(400).json({ success: false, message: "Invalid price." });
    }
    body.price = n;
  }

  if (body.compareAtPrice !== undefined) {
    const n = toNumber(body.compareAtPrice);
    if (n === null || n < 0) {
      return res.status(400).json({ success: false, message: "Invalid compareAtPrice." });
    }
    body.compareAtPrice = n;
  }

  // ✅ If both exist, compareAtPrice should not be below price
  if (body.price !== undefined && body.compareAtPrice !== undefined) {
    if (body.compareAtPrice < body.price) {
      return res.status(400).json({
        success: false,
        message: "compareAtPrice must be >= price.",
      });
    }
  }

  if (body.stock !== undefined) {
    const n = toNumber(body.stock);
    if (n === null || n < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock." });
    }
    body.stock = Math.floor(n);
  }

  // 4) Arrays (limit counts)
  // ✅ images: limit 12 AND validate each one is a safe url/path
  if (body.images !== undefined) {
    // allow longer length for images; use a separate mapping to 300 chars
    const rawImgs = Array.isArray(body.images) ? body.images : [];
    const cleanedImgs = rawImgs
      .map((x) => trimClamp(x, 300))
      .filter(Boolean)
      .filter(isSafeImagePathOrUrl)
      .slice(0, 12);

    body.images = cleanedImgs;
  }

  if (body.tags !== undefined) body.tags = asArray(body.tags, 40);
  if (body.sizes !== undefined) body.sizes = asArray(body.sizes, 25);
  if (body.colors !== undefined) body.colors = asArray(body.colors, 25);

  // 5) Booleans
  if (body.isActive !== undefined) {
    const b = toBool(body.isActive);
    if (b === null) {
      return res.status(400).json({ success: false, message: "Invalid isActive." });
    }
    body.isActive = b;
  }

  if (body.isFeatured !== undefined) {
    const b = toBool(body.isFeatured);
    if (b === null) {
      return res.status(400).json({ success: false, message: "Invalid isFeatured." });
    }
    body.isFeatured = b;
  }

  // ✅ FINAL: replace req.body with our safe version
  req.body = body;
  next();
}
