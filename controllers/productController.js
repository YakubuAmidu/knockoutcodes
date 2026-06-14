import Product from "../models/ProductModel.js";

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ALLOWED_SORTS = new Set([
  "-createdAt",
  "createdAt",
  "price",
  "-price",
  "title",
  "-title",
  "-ratingAverage",
  "ratingAverage",
]);

const clampInt = (val, min, max, fallback) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const pick = (obj, keys) => {
  const out = {};
  keys.forEach((key) => {
    if (obj?.[key] !== undefined) out[key] = obj[key];
  });
  return out;
};

const cleanString = (value) => String(value || "").trim();

const normalizeArray = (value, max = 30, lowercase = false) => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => {
          const text = cleanString(item);
          return lowercase ? text.toLowerCase() : text;
        })
        .filter(Boolean)
    ),
  ].slice(0, max);
};

const sendDuplicateError = (res, error) => {
  if (error?.code !== 11000) return false;

  const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";

  res.status(409).json({
    success: false,
    message: `A product with this ${field} already exists.`,
    field,
  });

  return true;
};

function normalizeProductPayload(body = {}) {
  const allowed = pick(body, [
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

  if (allowed.title !== undefined) allowed.title = cleanString(allowed.title);
  if (allowed.brand !== undefined) allowed.brand = cleanString(allowed.brand).toLowerCase();
  if (allowed.shortDescription !== undefined) allowed.shortDescription = cleanString(allowed.shortDescription);
  if (allowed.description !== undefined) allowed.description = cleanString(allowed.description);
  if (allowed.category !== undefined) allowed.category = cleanString(allowed.category);

  if (allowed.sku !== undefined) {
    const sku = cleanString(allowed.sku).toUpperCase();
    allowed.sku = sku || undefined;
  }

  if (allowed.price !== undefined) {
    const price = Number(allowed.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Price must be a valid number >= 0." };
    }
    allowed.price = price;
  }

  if (allowed.compareAtPrice !== undefined) {
    const compareAtPrice = Number(allowed.compareAtPrice);
    if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
      return { error: "Compare-at price must be a valid number >= 0." };
    }
    allowed.compareAtPrice = compareAtPrice;
  }

  if (allowed.stock !== undefined) {
    const stock = Number(allowed.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      return { error: "Stock must be a valid number >= 0." };
    }
    allowed.stock = Math.floor(stock);
  }

  if (allowed.images !== undefined) {
    allowed.images = normalizeArray(allowed.images, 12, false);
  }

  if (allowed.tags !== undefined) {
    allowed.tags = normalizeArray(allowed.tags, 30, true);
  }

  if (allowed.sizes !== undefined) {
    allowed.sizes = normalizeArray(allowed.sizes, 30, false);
  }

  if (allowed.colors !== undefined) {
    allowed.colors = normalizeArray(allowed.colors, 30, false);
  }

  if (allowed.isActive !== undefined) {
    allowed.isActive = Boolean(allowed.isActive);
  }

  if (allowed.isFeatured !== undefined) {
    allowed.isFeatured = Boolean(allowed.isFeatured);
  }

  return { data: allowed };
}

// POST /api/v1/products
export const createProduct = asyncHandler(async (req, res) => {
  const { data, error } = normalizeProductPayload(req.body || {});

  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  if (!data.title || data.title.length < 2) {
    return res.status(400).json({
      success: false,
      message: "Title is required and must be at least 2 characters.",
    });
  }

  if (data.price === undefined) {
    return res.status(400).json({
      success: false,
      message: "Product price is required.",
    });
  }

  try {
    const product = await Product.create({
      brand: data.brand || "knockoutcodes",
      shortDescription: "",
      description: "",
      images: [],
      category: "",
      tags: [],
      sizes: [],
      colors: [],
      stock: 0,
      isActive: true,
      isFeatured: false,
      ...data,
    });

    return res.status(201).json({
      success: true,
      message: "Product created.",
      product,
    });
  } catch (err) {
    if (sendDuplicateError(res, err)) return;
    throw err;
  }
});

// GET /api/v1/products
export const getProducts = asyncHandler(async (req, res) => {
  const {
    brand,
    search,
    category,
    minPrice,
    maxPrice,
    sort = "-createdAt",
    featured,
  } = req.query;

  const page = clampInt(req.query.page, 1, 9999, 1);
  const limit = clampInt(req.query.limit, 1, 50, 8);
  const skip = (page - 1) * limit;

  const safeSort = ALLOWED_SORTS.has(String(sort)) ? String(sort) : "-createdAt";

  const filter = {
    isDeleted: { $ne: true },
    isActive: true,
  };

  if (brand) {
    filter.brand = cleanString(brand).toLowerCase();
  }

  if (category) {
    filter.category = cleanString(category);
  }

  if (featured === "true") {
    filter.isFeatured = true;
  }

  const min = minPrice !== undefined ? Number(minPrice) : null;
  const max = maxPrice !== undefined ? Number(maxPrice) : null;

  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.price = {};
    if (Number.isFinite(min) && min >= 0) filter.price.$gte = min;
    if (Number.isFinite(max) && max >= 0) filter.price.$lte = max;
  }

  if (search && cleanString(search)) {
    filter.$text = { $search: cleanString(search).slice(0, 120) };
  }

  const query = Product.find(filter)
    .sort(safeSort)
    .skip(skip)
    .limit(limit)
    .lean();

  const [products, total] = await Promise.all([
    query,
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.status(200).json({
    success: true,
    products,
    total,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  });
});

// GET /api/v1/products/:idOrSlug
export const getProduct = asyncHandler(async (req, res) => {
  const raw = cleanString(req.params.idOrSlug || req.params.id);

  if (!raw) {
    return res.status(400).json({
      success: false,
      message: "Product identifier is required.",
    });
  }

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(raw);

  const product = await Product.findOne({
    ...(isObjectId ? { _id: raw } : { slug: raw.toLowerCase() }),
    isDeleted: { $ne: true },
    isActive: true,
  }).lean();

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

// PUT /api/v1/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const { data, error } = normalizeProductPayload(req.body || {});

  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  if (data.title !== undefined && data.title.length < 2) {
    return res.status(400).json({
      success: false,
      message: "Title must be at least 2 characters.",
    });
  }

  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: { $ne: true },
      },
      { $set: data },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated.",
      product,
    });
  } catch (err) {
    if (sendDuplicateError(res, err)) return;
    throw err;
  }
});

// DELETE /api/v1/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isDeleted: true,
        isActive: false,
      },
    },
    { new: true }
  ).lean();

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Product deleted.",
    product,
  });
});