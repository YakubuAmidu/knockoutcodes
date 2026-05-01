import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["knockoutcodes", "stylesavant", "thecodingblueprint"],
      default: "knockoutcodes",
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, trim: true, lowercase: true, index: true },

    shortDescription: { type: String, trim: true, maxlength: 220 },
    description: { type: String, trim: true, maxlength: 4000 },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 12,
        message: "Images cannot exceed 12 items.",
      },
    },

    category: { type: String, trim: true, index: true },
    tags: { type: [String], default: [] },

    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },

    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, index: true },

    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Simple slug maker (no extra libraries)
function toSlug(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

productSchema.pre("save", function (next) {
  if (!this.slug && this.title) this.slug = toSlug(this.title);
  next();
});

productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const t = update.title || update?.$set?.title;
  if (t) {
    const nextSlug = toSlug(t);
    if (update.$set) update.$set.slug = nextSlug;
    else update.slug = nextSlug;
  }
  next();
});

productSchema.index({ title: "text", description: "text", category: "text", tags: "text" });

const Product = mongoose.model("Product", productSchema);
export default Product;
