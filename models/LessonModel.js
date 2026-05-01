// model/lessonModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const resourceSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [120, "Resource label cannot be longer than 120 characters"],
    },
    url: {
      type: String,
      trim: true,
      maxlength: [500, "Resource URL cannot be longer than 500 characters"],
    },
  },
  { _id: false }
);

const lessonSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required for a lesson"],
    },

    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
      minlength: [3, "Lesson title must be at least 3 characters"],
      maxlength: [160, "Lesson title must be at most 160 characters"],
    },

    slug: {
      type: String,
      trim: true,
      // no unique / no index – as requested
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Lesson description cannot exceed 2000 characters"],
    },

    videoUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Video URL cannot be longer than 500 characters"],
    },

    durationInMinutes: {
      type: Number,
      min: [0, "Duration cannot be negative"],
      default: 0,
    },

    order: {
      type: Number,
      min: [0, "Order cannot be negative"],
      default: 0, // you can use 0,1,2,... per course
    },

    isPreview: {
      type: Boolean,
      default: false,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    resources: [resourceSchema],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Index for efficient sorting/filtering by course + order.
 * (Not unique by default — just a performance + organization index.)
 */
lessonSchema.index({ course: 1, order: 1 }, { unique: false });

// Simple slug generator (same style as Course)
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Update slug on create/save
lessonSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = generateSlug(this.title);
  }
  next();
});

// Update slug on findOneAndUpdate when title changes
lessonSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update && update.title) {
    update.slug = generateSlug(update.title);
    this.setUpdate(update);
  }
  next();
});

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;

