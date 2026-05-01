// middleware/noSqlShield.js

/**
 * Recursively remove dangerous keys that MongoDB uses for operators:
 * - "$" operator keys (e.g. $gt, $ne, $where)
 * - dot-path keys (e.g. "user.role") that can bypass object structure
 * - prototype pollution keys (__proto__, constructor, prototype)
 *
 * Works on: req.body, req.query, req.params
 */

const BAD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function cleanObject(obj) {
  if (!isPlainObject(obj)) return obj;

  const out = {};

  for (const [key, value] of Object.entries(obj)) {
    // 1) Block prototype pollution keys
    if (BAD_KEYS.has(key)) continue;

    // 2) Block Mongo operators + dot notation
    if (key.startsWith("$")) continue;
    if (key.includes(".")) continue;

    // 3) Recurse into nested objects / arrays
    if (Array.isArray(value)) {
      out[key] = value.map((v) => (isPlainObject(v) ? cleanObject(v) : v));
      continue;
    }

    if (isPlainObject(value)) {
      out[key] = cleanObject(value);
      continue;
    }

    out[key] = value;
  }

  return out;
}

/**
 * Sanitizes req.body, req.query, req.params safely.
 * You can apply this globally or per-router.
 */
export function noSqlShield(req, _res, next) {
  if (req.body && isPlainObject(req.body)) req.body = cleanObject(req.body);
  if (req.query && isPlainObject(req.query)) req.query = cleanObject(req.query);
  if (req.params && isPlainObject(req.params)) req.params = cleanObject(req.params);

  next();
}

/**
 * For products: lock down what query keys are allowed publicly.
 * Anything else gets removed (not rejected) to avoid breaking harmless clients.
 */
export function allowOnlyProductQueryKeys(req, _res, next) {
  const allowed = new Set([
    "brand",
    "search",
    "category",
    "minPrice",
    "maxPrice",
    "sort",
    "page",
    "limit",
    "active",
  ]);

  const q = req.query || {};
  const nextQuery = {};

  for (const [k, v] of Object.entries(q)) {
    if (allowed.has(k)) nextQuery[k] = v;
  }

  req.query = nextQuery;
  next();
}
