// models/ProductModel.js
import mongoose from "mongoose";

/**
 * Creates a clean URL-safe slug.
 */
function toSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Product Model
 * -------------
 * Stores physical/digital products for KnockoutCodes,
 * StyleSavant, and TheCodingBlueprint.
 */
const productSchema = new mongoose.Schema(
  {
    // Brand that owns the product
    brand: {
      type: String,
      required: [true, "Product brand is required"],
      trim: true,
      lowercase: true,
      enum: ["knockoutcodes", "stylesavant", "thecodingblueprint"],
      default: "knockoutcodes",
    },

    // Product title
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxlength: [120, "Product title cannot exceed 120 characters"],
    },

    // URL-safe product slug
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    // Short card description
    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [220, "Short description cannot exceed 220 characters"],
    },

    // Full product description
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [4000, "Description cannot exceed 4000 characters"],
    },

    // Current selling price
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"],
    },

    // Optional crossed-out price
    compareAtPrice: {
      type: Number,
      min: [0, "Compare-at price cannot be negative"],
      default: 0,
    },

    // Product images
    images: {
      type: [String],
      default: [],
      validate: {
        validator(images) {
          return Array.isArray(images) && images.length <= 12;
        },
        message: "Images cannot exceed 12 items.",
      },
    },

    // Product category
    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    // Search/filter tags
    tags: {
      type: [String],
      default: [],
    },

    // Available sizes
    sizes: {
      type: [String],
      default: [],
    },

    // Available colors
    colors: {
      type: [String],
      default: [],
    },

    // Inventory count
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },

    // Optional SKU
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
      default: undefined,
    },

    // Soft-delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Public visibility
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Featured product flag
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Normalize arrays and slug before validation.
 */
productSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = toSlug(this.title);
  }

  if (Array.isArray(this.tags)) {
    this.tags = this.tags
      .map((tag) => String(tag || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 30);
  }

  if (Array.isArray(this.sizes)) {
    this.sizes = this.sizes
      .map((size) => String(size || "").trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  if (Array.isArray(this.colors)) {
    this.colors = this.colors
      .map((color) => String(color || "").trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  if (Array.isArray(this.images)) {
    this.images = this.images
      .map((image) => String(image || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  next();
});

/**
 * Update slug when title changes through findOneAndUpdate.
 */
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const title = update.title || update?.$set?.title;

  if (title) {
    const nextSlug = toSlug(title);

    if (update.$set) {
      update.$set.slug = nextSlug;
    } else {
      update.slug = nextSlug;
    }

    this.setUpdate(update);
  }

  next();
});

/**
 * Query performance and search indexes.
 */
productSchema.index({
  title: "text",
  description: "text",
  category: "text",
  tags: "text",
});

productSchema.index({ brand: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;