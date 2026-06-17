// models/emailSegmentModel.js
import mongoose from "mongoose";

const EMAIL_SEGMENT_TYPES = [
  "newsletter",
  "buyers",
  "coaching",
  "vip",
  "inactive",
  "manual",
];

const EMAIL_SEGMENT_STATUSES = ["active", "paused"];

const EMAIL_SEGMENT_RULE_SOURCES = [
  "all",
  "newsletter",
  "orders",
  "coaching",
  "manual",
];

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) =>
          String(tag || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean)
        .slice(0, 30),
    ),
  ];
}

const emailSegmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Segment name is required"],
      trim: true,
      minlength: [2, "Segment name must be at least 2 characters"],
      maxlength: [80, "Segment name cannot exceed 80 characters"],
      unique: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    type: {
      type: String,
      enum: EMAIL_SEGMENT_TYPES,
      default: "newsletter",
      index: true,
    },

    status: {
      type: String,
      enum: EMAIL_SEGMENT_STATUSES,
      default: "active",
      index: true,
    },

    rules: {
      source: {
        type: String,
        enum: EMAIL_SEGMENT_RULE_SOURCES,
        default: "all",
      },

      minOrders: {
        type: Number,
        min: 0,
        default: 0,
      },

      tags: {
        type: [String],
        default: [],
        set: normalizeTags,
      },
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

emailSegmentSchema.pre("validate", function (next) {
  if (this.name) this.name = String(this.name).trim();

  if (this.description) {
    this.description = String(this.description).trim();
  }

  if (this.rules?.tags) {
    this.rules.tags = normalizeTags(this.rules.tags);
  }

  next();
});

emailSegmentSchema.index({ type: 1, status: 1 });
emailSegmentSchema.index({ createdBy: 1, createdAt: -1 });
emailSegmentSchema.index({ name: "text", description: "text" });

const EmailSegment =
  mongoose.models.EmailSegment ||
  mongoose.model("EmailSegment", emailSegmentSchema);

export default EmailSegment;

export {
  EMAIL_SEGMENT_TYPES,
  EMAIL_SEGMENT_STATUSES,
  EMAIL_SEGMENT_RULE_SOURCES,
};
