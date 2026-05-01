// models/Testimonial.js
import mongoose from "mongoose";

function sanitizeText(v) {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function countLinks(text) {
  const t = String(text || "");
  const links = t.match(/https?:\/\/|www\./gi);
  return links ? links.length : 0;
}

const TestimonialSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500, // ✅ prevent huge strings
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [3, "Message must be at least 3 characters"],
      maxlength: [1200, "Message must be at most 1200 characters"],
      set: sanitizeText, // ✅ normalize whitespace safely
      validate: [
        {
          validator: function (v) {
            // ✅ block obvious spam: too many links
            return countLinks(v) < 2; // allow 0-1 links
          },
          message: "Message looks like spam (too many links).",
        },
      ],
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
      set: (v) => {
        const x = Number(v);
        if (!Number.isFinite(x)) return 5;
        // ✅ clamp without crashing
        return Math.max(1, Math.min(5, x));
      },
      validate: {
        validator: Number.isFinite,
        message: "Rating must be a number between 1 and 5",
      },
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // ✅ keep optional
      index: true,     // ✅ faster filtering
    },

    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,     // ✅ prevent junk payloads
      set: sanitizeText, // ✅ normalize whitespace safely
    },
  },
  { timestamps: true }
);

// ✅ Helpful indexes for admin listings
TestimonialSchema.index({ createdAt: -1 });
TestimonialSchema.index({ rating: -1, createdAt: -1 });

const Testimonial = mongoose.model("Testimonial", TestimonialSchema);
export default Testimonial;
