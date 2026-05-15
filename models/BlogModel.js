// models/blogModel.js
import mongoose from "mongoose";

/**
 * Creates a clean URL slug from a blog title.
 */
const makeSlug = (title = "") =>
  String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * Estimates read time using about 200 words per minute.
 */
const estimateReadTime = (content = "") => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

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
      trim: true,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
      default: "",
    },

    content: {
      type: String,
      required: [true, "Blog content is required"],
      minlength: [50, "Content should be at least 50 characters"],
    },

    coverImage: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: ["boxing", "mindset", "conditioning", "nutrition", "lifestyle", "other"],
      default: "boxing",
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    readTime: {
      type: Number,
      min: 1,
      default: 1,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    views: {
      type: Number,
      min: 0,
      default: 0,
    },

    likes: {
      type: Number,
      min: 0,
      default: 0,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * Auto-generate slug, read time, and publish date before creating a blog.
 */
blogSchema.pre("save", function (next) {
  if (!this.slug && this.title) this.slug = makeSlug(this.title);
  if (this.content) this.readTime = estimateReadTime(this.content);

  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (!this.isPublished) {
    this.publishedAt = null;
  }

  next();
});

/**
 * Keep slug/read time/publishedAt correct during admin updates.
 */
blogSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  if ($set.title && !$set.slug) $set.slug = makeSlug($set.title);
  if ($set.content) $set.readTime = estimateReadTime($set.content);

  if ($set.isPublished === true && !$set.publishedAt) {
    $set.publishedAt = new Date();
  }

  if ($set.isPublished === false) {
    $set.publishedAt = null;
  }

  if (update.$set) update.$set = $set;
  else this.setUpdate($set);

  next();
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

export default Blog;