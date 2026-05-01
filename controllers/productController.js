import Product from "../models/ProductModel.js";

/** Small helper to avoid repeating try/catch everywhere */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const clampInt = (val, min, max, fallback) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

// POST /api/v1/products (admin)
export const createProduct = asyncHandler(async (req, res) => {
  const {
    brand = "knockoutcodes",
    title,
    shortDescription = "",
    description = "",
    price,
    compareAtPrice,
    images = [],
    category = "",
    tags = [],
    sizes = [],
    colors = [],
    stock = 0,
    sku = "",
    isActive = true,
    isFeatured = false,
  } = req.body || {};

  if (!title || String(title).trim().length < 2) {
    return res.status(400).json({ message: "Title is required (min 2 chars)." });
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ message: "Price must be a valid number >= 0." });
  }

  const product = await Product.create({
    brand,
    title: String(title).trim(),
    shortDescription,
    description,
    price: numericPrice,
    compareAtPrice: compareAtPrice !== undefined ? Number(compareAtPrice) : undefined,
    images: Array.isArray(images) ? images.filter(Boolean) : [],
    category,
    tags: Array.isArray(tags) ? tags : [],
    sizes: Array.isArray(sizes) ? sizes : [],
    colors: Array.isArray(colors) ? colors : [],
    stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
    sku,
    isActive: Boolean(isActive),
    isFeatured: Boolean(isFeatured),
  });

  res.status(201).json({ message: "Product created.", product });
});

// GET /api/v1/products/:id (public)
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  
  if (!product) return res.status(404).json({ message: "Product not found." });

  // ✅ Public should not see inactive item
  if (product.isActive === false) {
    return res.status(404).json({ message: "Product not found..." });
  };

  res.json({ product });
});

// GET /api/v1/products (public) ?brand&search&category&minPrice&maxPrice&sort&page&limit&active
export const getProducts = asyncHandler(async (req, res) => {
  const {
    brand,
    search,
    category,
    minPrice,
    maxPrice,
    sort = "-createdAt",
    active,
  } = req.query;

  const page = clampInt(req.query.page, 1, 9999, 1);
  const limit = clampInt(req.query.limit, 1, 50, 8);
  const skip = (page - 1) * limit;

  const filter = {};

  // Brand filter (ex: knockoutcodes)
  if (brand) filter.brand = String(brand).toLowerCase();

  // Active filter: if not provided, default true (public shop)
  if (active === "true") filter.isActive = true;
  else if (active === "false") filter.isActive = false;
  else filter.isActive = true;

  if (category) filter.category = String(category).trim();

  // Price range
  const min = minPrice !== undefined ? Number(minPrice) : null;
  const max = maxPrice !== undefined ? Number(maxPrice) : null;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.price = {};
    if (Number.isFinite(min)) filter.price.$gte = min;
    if (Number.isFinite(max)) filter.price.$lte = max;
  }

  // Search (text index)
  if (search && String(search).trim()) {
    filter.$text = { $search: String(search).trim() };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    products,
    total,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  });
});

// PUT /api/v1/products/:id (admin)
export const updateProduct = asyncHandler(async (req, res) => {
  const allowed = pick(req.body || {}, [
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
  ]);

  // Basic validation if price is included
  if (allowed.price !== undefined) {
    const p = Number(allowed.price);
    if (!Number.isFinite(p) || p < 0) {
      return res.status(400).json({ message: "Price must be a valid number >= 0." });
    }
    allowed.price = p;
  }

  if (allowed.stock !== undefined) {
    const s = Number(allowed.stock);
    if (!Number.isFinite(s) || s < 0) {
      return res.status(400).json({ message: "Stock must be a valid number >= 0." });
    }
    allowed.stock = s;
  }

  if (allowed.images !== undefined) {
    allowed.images = Array.isArray(allowed.images) ? allowed.images.filter(Boolean) : [];
  }
  if (allowed.tags !== undefined) allowed.tags = Array.isArray(allowed.tags) ? allowed.tags : [];
  if (allowed.sizes !== undefined) allowed.sizes = Array.isArray(allowed.sizes) ? allowed.sizes : [];
  if (allowed.colors !== undefined)
    allowed.colors = Array.isArray(allowed.colors) ? allowed.colors : [];

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: allowed },
    { new: true, runValidators: true }
  ).lean();

  if (!product) return res.status(404).json({ message: "Product not found." });

  res.json({ message: "Product updated.", product });
});

// DELETE /api/v1/products/:id (admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ message: "Product not found." });
  res.json({ message: "Product deleted." });
});
