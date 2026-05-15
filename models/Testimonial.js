// models/Testimonial.js
import mongoose from "mongoose";

/* =========================
   Helpers
========================= */
function sanitizeText(value) {
  if (value == null) return "";

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function countLinks(text) {
  const content = String(text || "");

  const links = content.match(/https?:\/\/|www\./gi);

  return links ? links.length : 0;
}

/* =========================
   Testimonial Schema
========================= */
const testimonialSchema = new mongoose.Schema(
  {
    // Optional user image
    imageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    // Main testimonial message
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [3, "Message must be at least 3 characters"],
      maxlength: [1200, "Message must be at most 1200 characters"],
      set: sanitizeText,

      validate: [
        {
          validator(value) {
            // Prevent spam-style link flooding
            return countLinks(value) < 2;
          },

          message: "Message looks like spam (too many links).",
        },
      ],
    },

    // Rating score
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,

      set(value) {
        const num = Number(value);

        if (!Number.isFinite(num)) return 5;

        return Math.max(1, Math.min(5, num));
      },

      validate: {
        validator: Number.isFinite,
        message: "Rating must be a number between 1 and 5",
      },
    },

    // Optional linked user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    // Public display name
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
      set: sanitizeText,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   Indexes
========================= */
testimonialSchema.index({ createdAt: -1 });
testimonialSchema.index({ rating: -1, createdAt: -1 });

/* =========================
   Model Export
========================= */
const Testimonial =
  mongoose.models.Testimonial ||
  mongoose.model("Testimonial", testimonialSchema);

export default Testimonial;