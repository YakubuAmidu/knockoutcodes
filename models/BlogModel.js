// models/blogModel.js
import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    excerpt: {
      type: String,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
      minlength: [50, "Content should be at least 50 characters"],
    },
    coverImage: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "boxing",
      enum: ["boxing", "mindset", "conditioning", "nutrition", "lifestyle", "other"],
    },
    tags: [{ type: String, trim: true }],
    readTime: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
      index: true,
    },
  },
  { timestamps: true }
);

const makeSlug = (title = "") =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const estimateReadTime = (content = "") => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

blogSchema.pre("save", function (next) {
  if (!this.slug && this.title) this.slug = makeSlug(this.title);
  if (this.content) this.readTime = estimateReadTime(this.content);
  if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
  if (!this.isPublished) this.publishedAt = undefined;
  next();
});

blogSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  if ($set.title && !$set.slug) $set.slug = makeSlug($set.title);
  if ($set.content) $set.readTime = estimateReadTime($set.content);

  if ($set.isPublished === true) {
    if (!$set.publishedAt) $set.publishedAt = new Date();
  }

  if ($set.isPublished === false) {
    $set.publishedAt = undefined;
  }

  if (update.$set) update.$set = $set;
  else Object.assign(update, $set);

  this.setUpdate(update);
  next();
});

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
