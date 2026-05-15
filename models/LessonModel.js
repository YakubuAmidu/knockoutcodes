// models/LessonModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Lesson Resource Schema
 * ----------------------
 * Stores optional downloadable links, PDFs, references,
 * or supporting material attached to a lesson.
 */
const resourceSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [120, "Resource label cannot be longer than 120 characters"],
      default: "",
    },

    url: {
      type: String,
      trim: true,
      maxlength: [500, "Resource URL cannot be longer than 500 characters"],
      default: "",
    },
  },
  { _id: false }
);

/**
 * Lesson Model
 * ------------
 * Stores course lessons, lesson order, preview status,
 * video URL, resources, and publishing status.
 */
const lessonSchema = new Schema(
  {
    // Course this lesson belongs to
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required for a lesson"],
    },

    // Lesson title shown to users
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
      minlength: [3, "Lesson title must be at least 3 characters"],
      maxlength: [160, "Lesson title must be at most 160 characters"],
    },

    // URL-safe lesson slug
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Lesson summary or description
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Lesson description cannot exceed 2000 characters"],
      default: "",
    },

    // Video link or secure video source
    videoUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Video URL cannot be longer than 500 characters"],
      default: "",
    },

    // Estimated lesson length
    durationInMinutes: {
      type: Number,
      min: [0, "Duration cannot be negative"],
      default: 0,
    },

    // Lesson position inside the course
    order: {
      type: Number,
      min: [0, "Order cannot be negative"],
      default: 0,
      index: true,
    },

    // Allows visitors to preview selected lessons
    isPreview: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Controls public visibility
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Optional supporting materials
    resources: {
      type: [resourceSchema],
      default: [],
    },

    // Admin who created the lesson
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Creates a clean URL-safe slug from a title.
 */
function generateSlug(title = "") {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate or update slug before saving.
 */
lessonSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = generateSlug(this.title);
  }

  next();
});

/**
 * Generate or update slug when title changes through findOneAndUpdate.
 */
lessonSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const title = update.title || update?.$set?.title;

  if (title) {
    const nextSlug = generateSlug(title);

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
 * Efficient course lesson sorting and filtering.
 */
lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ course: 1, isPublished: 1, order: 1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Lesson =
  mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);

export default Lesson;