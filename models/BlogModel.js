import mongoose from "mongoose";

const makeSlug = (title = "") =>
  String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const estimateReadTime = (content = "") => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const cleanTags = (tags = []) => {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    ),
  ];
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
      sparse: true,
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
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    featured: {
      type: Boolean,
      default: false,
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

    unlikes: {
      type: Number,
      min: 0,
      default: 0,
    },

    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    unlikedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
  },
  { timestamps: true }
);

/* No duplicate indexes */
blogSchema.index({ isPublished: 1, publishedAt: -1 });
blogSchema.index({ category: 1, isPublished: 1 });
blogSchema.index({ featured: 1, isPublished: 1 });
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ tags: 1 });

blogSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = makeSlug(this.title);
  }

  if (this.slug) {
    this.slug = makeSlug(this.slug);
  }

  if (this.content) {
    this.readTime = estimateReadTime(this.content);
  }

  this.tags = cleanTags(this.tags);

  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (!this.isPublished) {
    this.publishedAt = null;
  }

  next();
});

blogSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || {};

  const finalSet = update.$set ? $set : update;

  if (finalSet.title && !finalSet.slug) {
    finalSet.slug = makeSlug(finalSet.title);
  }

  if (finalSet.slug) {
    finalSet.slug = makeSlug(finalSet.slug);
  }

  if (finalSet.content) {
    finalSet.readTime = estimateReadTime(finalSet.content);
  }

  if (finalSet.tags) {
    finalSet.tags = cleanTags(finalSet.tags);
  }

  if (finalSet.isPublished === true && !finalSet.publishedAt) {
    finalSet.publishedAt = new Date();
  }

  if (finalSet.isPublished === false) {
    finalSet.publishedAt = null;
  }

  if (update.$set) {
    update.$set = finalSet;
    this.setUpdate(update);
  } else {
    this.setUpdate(finalSet);
  }

  next();
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

export default Blog;