import mongoose from "mongoose";

function sanitizeText(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function countLinks(text = "") {
  const links = String(text).match(/https?:\/\/|www\./gi);
  return links ? links.length : 0;
}

const testimonialSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Image URL must be at most 500 characters"],
      set: sanitizeText,
    },

    approved: {
      type: Boolean,
      default: false,
      index: true,
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [3, "Message must be at least 3 characters"],
      maxlength: [1200, "Message must be at most 1200 characters"],
      set: sanitizeText,
      validate: {
        validator(value) {
          return countLinks(value) < 2;
        },
        message: "Message looks like spam. Too many links.",
      },
    },

    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      default: 5,
      set(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return 5;
        return Math.max(1, Math.min(5, Math.round(num)));
      },
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Name must be at most 80 characters"],
      set: sanitizeText,
    },
  },
  { timestamps: true },
);

testimonialSchema.index({ createdAt: -1 });
testimonialSchema.index({ rating: -1, createdAt: -1 });
testimonialSchema.index({ approved: 1, createdAt: -1 });

testimonialSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $exists: true, $type: "objectId" },
    },
  },
);

const Testimonial =
  mongoose.models.Testimonial ||
  mongoose.model("Testimonial", testimonialSchema);

export default Testimonial;
