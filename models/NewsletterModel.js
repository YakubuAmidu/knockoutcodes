// models/NewsletterModel.js
import mongoose from "mongoose";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const cleanString = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const newsletterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Name cannot exceed 80 characters"],
      set: cleanString,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      maxlength: [160, "Email cannot exceed 160 characters"],
      set: (value) => String(value || "").trim().toLowerCase(),
      validate: {
        validator(value) {
          return EMAIL_REGEX.test(value);
        },
        message: "Please provide a valid email address.",
      },
    },

    topic: {
      type: String,
      trim: true,
      default: "KnockoutCodes Updates",
      maxlength: [80, "Topic cannot exceed 80 characters"],
      set: cleanString,
    },

    source: {
      type: String,
      trim: true,
      lowercase: true,
      default: "footer",
      maxlength: [60, "Source cannot exceed 60 characters"],
      index: true,
      set: (value) =>
        cleanString(value || "footer")
          .toLowerCase()
          .replace(/[^a-z0-9-_ ]/g, "")
          .slice(0, 60),
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      set: (value) => String(value || "").trim(),
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    subscribedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    unsubscribedAt: {
      type: Date,
      default: null,
    },

    lastReactivatedAt: {
      type: Date,
      default: null,
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    metadata: {
      userAgent: {
        type: String,
        default: "",
        maxlength: 300,
      },
      ipHash: {
        type: String,
        default: "",
        maxlength: 140,
      },
    },
  },
  {
    timestamps: true,
  }
);

newsletterSchema.index({ isActive: 1, createdAt: -1 });
newsletterSchema.index({ source: 1, createdAt: -1 });
newsletterSchema.index({ email: 1, isActive: 1 });

newsletterSchema.pre("save", function (next) {
  if (this.isModified("isActive")) {
    if (this.isActive) {
      this.unsubscribedAt = null;

      if (!this.isNew) {
        this.lastReactivatedAt = new Date();
      }
    } else {
      this.unsubscribedAt = new Date();
    }
  }

  next();
});

newsletterSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

const Newsletter =
  mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;