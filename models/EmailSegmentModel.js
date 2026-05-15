// models/emailSegmentModel.js
import mongoose from "mongoose";

/**
 * Email segment schema
 * Stores reusable subscriber/customer groups for email campaigns.
 */
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
      enum: ["newsletter", "buyers", "coaching", "vip", "inactive", "manual"],
      default: "newsletter",
    },

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      index: true,
    },

    rules: {
      source: {
        type: String,
        enum: ["all", "newsletter", "orders", "coaching", "manual"],
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
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Cleans segment fields before saving.
 */
emailSegmentSchema.pre("validate", function (next) {
  if (this.name) {
    this.name = String(this.name).trim();
  }

  if (this.rules?.tags?.length) {
    this.rules.tags = [
      ...new Set(
        this.rules.tags
          .map((tag) => String(tag || "").trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
  }

  next();
});

/**
 * Indexes for filtering and admin search.
 */
emailSegmentSchema.index({ type: 1, status: 1 });
emailSegmentSchema.index({ createdBy: 1, createdAt: -1 });

const EmailSegment =
  mongoose.models.EmailSegment ||
  mongoose.model("EmailSegment", emailSegmentSchema);

export default EmailSegment;