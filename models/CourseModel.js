// models/CourseModel.js
import mongoose from "mongoose";

/**
 * Course schema
 * Stores course content, access level, pricing, Stripe price ID,
 * publishing state, ratings, and membership requirements.
 */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [120, "Title must be at most 120 characters"],
    },

    slug: {
      type: String,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
    },

    category: {
      type: String,
      enum: [
        "Boxing Fundamentals",
        "Conditioning",
        "Footwork",
        "Defense",
        "Power Punching",
        "Strategy & Ring IQ",
        "Other",
      ],
      default: "Boxing Fundamentals",
    },

    focusArea: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advance", "complete", "all-levels"],
      default: "beginner",
    },

    requiredMembershipLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advance", "complete", "none"],
      default: "beginner",
    },

    allowSinglePurchase: {
      type: Boolean,
      default: true,
      index: true,
    },

    stripePriceId: {
      type: String,
      trim: true,
      default: "",
    },

    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },

    promoVideo: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Price cannot be negative"],
    },

    salePrice: {
      type: Number,
      min: [0, "Sale price cannot be negative"],
      default: null,
      validate: {
        validator(value) {
          if (value == null) return true;
          return value <= this.price;
        },
        message: "Sale price cannot be greater than regular price",
      },
    },

    isFree: {
      type: Boolean,
      default: false,
      index: true,
    },

    durationInMinutes: {
      type: Number,
      min: [0, "Duration cannot be negative"],
      default: 0,
    },

    totalLessons: {
      type: Number,
      min: [0, "Total lessons cannot be negative"],
      default: 0,
    },

    language: {
      type: String,
      trim: true,
      default: "English",
    },

    equipmentNeeded: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    whatYouWillLearn: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    ratingAverage: {
      type: Number,
      min: [0, "Rating must be above or equal to 0"],
      max: [5, "Rating must be below or equal to 5"],
      default: 0,
    },

    ratingCount: {
      type: Number,
      min: [0, "Rating count cannot be negative"],
      default: 0,
    },

    studentsCount: {
      type: Number,
      min: [0, "Students count cannot be negative"],
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * Creates a URL-safe slug from the course title.
 */
function generateSlug(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Cleans string arrays so empty values are not stored.
 */
function cleanStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

/**
 * Normalizes course access values before validation.
 */
function normalizeCourseAccess(doc) {
  if (doc.level === "advanced") {
    doc.level = "advance";
  }

  if (doc.requiredMembershipLevel === "advanced") {
    doc.requiredMembershipLevel = "advance";
  }

  if (!doc.requiredMembershipLevel || doc.requiredMembershipLevel === "none") {
    if (doc.level && doc.level !== "all-levels") {
      doc.requiredMembershipLevel = doc.level;
    }
  }

  if (doc.isFree) {
    doc.allowSinglePurchase = false;
    doc.requiredMembershipLevel = "none";
  }

  doc.equipmentNeeded = cleanStringArray(doc.equipmentNeeded);
  doc.requirements = cleanStringArray(doc.requirements);
  doc.whatYouWillLearn = cleanStringArray(doc.whatYouWillLearn);

  doc.tags = cleanStringArray(doc.tags).map((tag) => tag.toLowerCase());
}

/**
 * Runs before creating or saving a course.
 */
courseSchema.pre("validate", function (next) {
  normalizeCourseAccess(this);
  next();
});

/**
 * Generates or updates the slug before saving.
 */
courseSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = generateSlug(this.title);
  }

  next();
});

/**
 * Normalizes updates when admin edits a course.
 */
courseSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  if ($set.level === "advanced") {
    $set.level = "advance";
  }

  if ($set.requiredMembershipLevel === "advanced") {
    $set.requiredMembershipLevel = "advance";
  }

  if ($set.title) {
    $set.slug = generateSlug($set.title);
  }

  if (Array.isArray($set.equipmentNeeded)) {
    $set.equipmentNeeded = cleanStringArray($set.equipmentNeeded);
  }

  if (Array.isArray($set.requirements)) {
    $set.requirements = cleanStringArray($set.requirements);
  }

  if (Array.isArray($set.whatYouWillLearn)) {
    $set.whatYouWillLearn = cleanStringArray($set.whatYouWillLearn);
  }

  if (Array.isArray($set.tags)) {
    $set.tags = cleanStringArray($set.tags).map((tag) => tag.toLowerCase());
  }

  if ($set.isFree) {
    $set.allowSinglePurchase = false;
    $set.requiredMembershipLevel = "none";
  }

  if (update.$set) {
    update.$set = $set;
  } else {
    this.setUpdate($set);
  }

  next();
});

/**
 * Indexes for public course discovery, membership access, and admin filtering.
 */
courseSchema.index({ level: 1, isPublished: 1 });
courseSchema.index({ requiredMembershipLevel: 1, isPublished: 1 });
courseSchema.index({ category: 1, isPublished: 1 });
courseSchema.index({ isFeatured: 1, isPublished: 1 });
courseSchema.index({ createdAt: -1 });

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;