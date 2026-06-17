// models/LessonModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const URL_REGEX =
  /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i;

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
      validate: {
        validator(value) {
          if (!value) return true;
          return URL_REGEX.test(value);
        },
        message: "Resource URL must be a valid URL.",
      },
    },
  },
  { _id: false },
);

const lessonSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required for a lesson"],
      index: true,
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
      lowercase: true,
      default: "",
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Lesson description cannot exceed 2000 characters"],
      default: "",
    },

    videoUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Video URL cannot be longer than 500 characters"],
      default: "",
      validate: {
        validator(value) {
          if (!value) return true;
          return URL_REGEX.test(value);
        },
        message: "Video URL must be a valid URL.",
      },
    },

    durationInMinutes: {
      type: Number,
      min: [0, "Duration cannot be negative"],
      max: [1000, "Duration cannot exceed 1000 minutes"],
      default: 0,
    },

    order: {
      type: Number,
      min: [0, "Order cannot be negative"],
      max: [10000, "Order cannot exceed 10000"],
      default: 0,
      index: true,
    },

    isPreview: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    resources: {
      type: [resourceSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 20;
        },
        message: "A lesson cannot have more than 20 resources.",
      },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

function generateSlug(title = "") {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function cleanResources(resources = []) {
  if (!Array.isArray(resources)) return [];

  return resources
    .map((resource) => ({
      label: String(resource?.label || "").trim(),
      url: String(resource?.url || "").trim(),
    }))
    .filter((resource) => resource.label || resource.url)
    .slice(0, 20);
}

lessonSchema.pre("validate", function (next) {
  this.title = String(this.title || "").trim();
  this.description = String(this.description || "").trim();
  this.videoUrl = String(this.videoUrl || "").trim();

  this.durationInMinutes = cleanNumber(this.durationInMinutes, 0);
  this.order = cleanNumber(this.order, 0);

  this.resources = cleanResources(this.resources);

  if (this.isModified("title") || !this.slug) {
    this.slug = generateSlug(this.title);
  }

  next();
});

lessonSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || {};

  const nextUpdate = {
    ...update,
    $set: {
      ...$set,
    },
  };

  if ("title" in nextUpdate) {
    nextUpdate.$set.title = String(nextUpdate.title || "").trim();
    delete nextUpdate.title;
  }

  if ("description" in nextUpdate) {
    nextUpdate.$set.description = String(nextUpdate.description || "").trim();
    delete nextUpdate.description;
  }

  if ("videoUrl" in nextUpdate) {
    nextUpdate.$set.videoUrl = String(nextUpdate.videoUrl || "").trim();
    delete nextUpdate.videoUrl;
  }

  if ("durationInMinutes" in nextUpdate) {
    nextUpdate.$set.durationInMinutes = cleanNumber(
      nextUpdate.durationInMinutes,
      0,
    );
    delete nextUpdate.durationInMinutes;
  }

  if ("order" in nextUpdate) {
    nextUpdate.$set.order = cleanNumber(nextUpdate.order, 0);
    delete nextUpdate.order;
  }

  if ("resources" in nextUpdate) {
    nextUpdate.$set.resources = cleanResources(nextUpdate.resources);
    delete nextUpdate.resources;
  }

  if ("title" in nextUpdate.$set) {
    nextUpdate.$set.slug = generateSlug(nextUpdate.$set.title);
  }

  if (Object.keys(nextUpdate.$set).length === 0) {
    delete nextUpdate.$set;
  }

  this.setUpdate(nextUpdate);
  next();
});

lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ course: 1, isPublished: 1, order: 1 });
lessonSchema.index({ course: 1, slug: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);

export default Lesson;
