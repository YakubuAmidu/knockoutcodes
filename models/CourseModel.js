// models/CourseModel.js
import mongoose from "mongoose";

/* ======================================================
   🥊 KNOCKOUTCODES COURSE MODEL
   Stores course content, pricing, access level, publishing,
   Stripe connection, ratings, and membership requirements.
====================================================== */

const COURSE_LEVELS = [
  "beginner",
  "intermediate",
  "advance",
  "complete",
  "all-levels",
];
const MEMBERSHIP_LEVELS = [
  "beginner",
  "intermediate",
  "advance",
  "complete",
  "none",
];

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
      sparse: true,
      trim: true,
      lowercase: true,
      index: true,
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
      enum: COURSE_LEVELS,
      default: "beginner",
      index: true,
    },

    requiredMembershipLevel: {
      type: String,
      enum: MEMBERSHIP_LEVELS,
      default: "beginner",
      index: true,
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
      default: 0,
    },

    salePrice: {
      type: Number,
      min: [0, "Sale price cannot be negative"],
      default: null,
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
      index: true,
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
  { timestamps: true },
);

/* ======================================================
   🧼 CLEAN HELPERS
====================================================== */

function generateSlug(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanStringArray(value) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeLevel(value) {
  const clean = String(value || "")
    .trim()
    .toLowerCase();

  if (clean === "advanced") return "advance";
  if (clean === "all") return "all-levels";

  return clean;
}

/* ======================================================
   🛡️ COURSE ACCESS NORMALIZATION
====================================================== */

function isValidUrl(value) {
  if (!value) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeCourseAccess(doc) {
  doc.level = normalizeLevel(doc.level) || "beginner";
  doc.requiredMembershipLevel =
    normalizeLevel(doc.requiredMembershipLevel) || "beginner";

  if (!isValidUrl(doc.thumbnail)) {
    doc.thumbnail = "";
  }

  if (!isValidUrl(doc.promoVideo)) {
    doc.promoVideo = "";
  }

  if (!COURSE_LEVELS.includes(doc.level)) {
    doc.level = "beginner";
  }

  if (!MEMBERSHIP_LEVELS.includes(doc.requiredMembershipLevel)) {
    doc.requiredMembershipLevel = "beginner";
  }

  if (!doc.requiredMembershipLevel || doc.requiredMembershipLevel === "none") {
    if (doc.level && doc.level !== "all-levels" && !doc.isFree) {
      doc.requiredMembershipLevel = doc.level;
    }
  }

  if (doc.isFree) {
    doc.price = 0;
    doc.salePrice = null;
    doc.allowSinglePurchase = false;
    doc.requiredMembershipLevel = "none";
    doc.stripePriceId = "";
  }

  doc.equipmentNeeded = cleanStringArray(doc.equipmentNeeded);
  doc.requirements = cleanStringArray(doc.requirements);
  doc.whatYouWillLearn = cleanStringArray(doc.whatYouWillLearn);
  doc.tags = cleanStringArray(doc.tags).map((tag) => tag.toLowerCase());
}

/* ======================================================
   ⚙️ MODEL MIDDLEWARE
====================================================== */

courseSchema.pre("validate", function (next) {
  normalizeCourseAccess(this);
  next();
});

courseSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = generateSlug(this.title);
  }

  next();
});

courseSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  if ($set.level) {
    $set.level = normalizeLevel($set.level);
  }

  if ($set.requiredMembershipLevel) {
    $set.requiredMembershipLevel = normalizeLevel($set.requiredMembershipLevel);
  }

  if ($set.title) {
    $set.slug = generateSlug($set.title);
  }

  if ($set.equipmentNeeded) {
    $set.equipmentNeeded = cleanStringArray($set.equipmentNeeded);
  }

  if ($set.requirements) {
    $set.requirements = cleanStringArray($set.requirements);
  }

  if ($set.whatYouWillLearn) {
    $set.whatYouWillLearn = cleanStringArray($set.whatYouWillLearn);
  }

  if ($set.tags) {
    $set.tags = cleanStringArray($set.tags).map((tag) => tag.toLowerCase());
  }

  const nextIsFree =
    $set.isFree !== undefined ? Boolean($set.isFree) : undefined;

  if (nextIsFree === true) {
    $set.price = 0;
    $set.salePrice = null;
    $set.allowSinglePurchase = false;
    $set.requiredMembershipLevel = "none";
    $set.stripePriceId = "";
  }

  if (update.$set) {
    update.$set = $set;
  } else {
    this.setUpdate($set);
  }

  next();
});

/* ======================================================
   🚀 INDEXES
====================================================== */

courseSchema.index({ title: "text", description: "text", tags: "text" });
courseSchema.index({ level: 1, isPublished: 1 });
courseSchema.index({ requiredMembershipLevel: 1, isPublished: 1 });
courseSchema.index({ category: 1, isPublished: 1 });
courseSchema.index({ isFeatured: 1, isPublished: 1 });
courseSchema.index({ isFree: 1, isPublished: 1 });
courseSchema.index({ createdAt: -1 });

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;
