import mongoose from "mongoose";

const emailSegmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Segment name is required"],
      trim: true,
      minlength: [2, "Segment name must be at least 2 characters"],
      maxlength: [80, "Segment name cannot exceed 80 characters"],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    type: {
      type: String,
      enum: [
        "newsletter",
        "buyers",
        "coaching",
        "vip",
        "inactive",
        "manual",
      ],
      default: "newsletter",
      index: true,
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
        default: 0,
        min: 0,
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
      index: true,
    },
  },
  { timestamps: true }
);

emailSegmentSchema.index({ name: 1 }, { unique: true });

const EmailSegment = mongoose.model("EmailSegment", emailSegmentSchema);

export default EmailSegment;