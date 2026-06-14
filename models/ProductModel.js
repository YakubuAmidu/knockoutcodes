// models/ProductModel.js
import mongoose from "mongoose";

function toSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const productSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: [true, "Product brand is required"],
      trim: true,
      lowercase: true,
      enum: ["knockoutcodes", "stylesavant", "thecodingblueprint"],
      default: "knockoutcodes",
      index: true,
    },

    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxlength: [120, "Product title cannot exceed 120 characters"],
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [220, "Short description cannot exceed 220 characters"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [4000, "Description cannot exceed 4000 characters"],
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"],
    },

    compareAtPrice: {
      type: Number,
      min: [0, "Compare-at price cannot be negative"],
      default: 0,
    },

    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

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

    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    sizes: {
      type: [String],
      default: [],
    },

    colors: {
      type: [String],
      default: [],
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },

    sku: {
      type: String,
      trim: true,
      default: undefined,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = toSlug(this.title);
  }

  if (this.slug) {
    this.slug = toSlug(this.slug);
  }

  if (this.sku) {
    this.sku = String(this.sku).trim().toUpperCase();
  } else {
    this.sku = undefined;
  }

  if (Array.isArray(this.tags)) {
    this.tags = [
      ...new Set(
        this.tags
          .map((tag) => String(tag || "").trim().toLowerCase())
          .filter(Boolean)
      ),
    ].slice(0, 30);
  }

  if (Array.isArray(this.sizes)) {
    this.sizes = [
      ...new Set(
        this.sizes
          .map((size) => String(size || "").trim())
          .filter(Boolean)
      ),
    ].slice(0, 30);
  }

  if (Array.isArray(this.colors)) {
    this.colors = [
      ...new Set(
        this.colors
          .map((color) => String(color || "").trim())
          .filter(Boolean)
      ),
    ].slice(0, 30);
  }

  if (Array.isArray(this.images)) {
    this.images = [
      ...new Set(
        this.images
          .map((image) => String(image || "").trim())
          .filter(Boolean)
      ),
    ].slice(0, 12);
  }

  next();
});

productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || update;

  if (set.title) {
    set.slug = toSlug(set.title);
  }

  if (set.slug) {
    set.slug = toSlug(set.slug);
  }

  if (set.sku) {
    set.sku = String(set.sku).trim().toUpperCase();
  }

  if (Array.isArray(set.tags)) {
    set.tags = [...new Set(set.tags.map((v) => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 30);
  }

  if (Array.isArray(set.sizes)) {
    set.sizes = [...new Set(set.sizes.map((v) => String(v).trim()).filter(Boolean))].slice(0, 30);
  }

  if (Array.isArray(set.colors)) {
    set.colors = [...new Set(set.colors.map((v) => String(v).trim()).filter(Boolean))].slice(0, 30);
  }

  if (Array.isArray(set.images)) {
    set.images = [...new Set(set.images.map((v) => String(v).trim()).filter(Boolean))].slice(0, 12);
  }

  if (update.$set) {
    update.$set = set;
  }

  this.setUpdate(update);
  next();
});

/* Avoid duplicate index warnings: indexes live here, not inside unique/index fields above */
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });

productSchema.index({
  title: "text",
  description: "text",
  category: "text",
  tags: "text",
});

productSchema.index({ brand: 1, isActive: 1, isDeleted: 1, createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1, isDeleted: 1, createdAt: -1 });
productSchema.index({ category: 1, isActive: 1, isDeleted: 1, createdAt: -1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;