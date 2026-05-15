// models/emailTemplateModel.js
import mongoose from "mongoose";

/**
 * Validates optional CTA URLs.
 */
function isValidHttpUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Email template schema
 * Stores reusable email layouts for campaigns, announcements,
 * courses, promotions, newsletters, and welcome messages.
 */
const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      minlength: [2, "Template name must be at least 2 characters"],
      maxlength: [120, "Template name cannot exceed 120 characters"],
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      minlength: [2, "Subject must be at least 2 characters"],
      maxlength: [180, "Subject cannot exceed 180 characters"],
    },

    previewText: {
      type: String,
      trim: true,
      maxlength: [220, "Preview text cannot exceed 220 characters"],
      default: "",
    },

    headline: {
      type: String,
      required: [true, "Headline is required"],
      trim: true,
      minlength: [2, "Headline must be at least 2 characters"],
      maxlength: [160, "Headline cannot exceed 160 characters"],
    },

    body: {
      type: String,
      required: [true, "Email body is required"],
      trim: true,
      minlength: [10, "Email body must be at least 10 characters"],
      maxlength: [12000, "Email body cannot exceed 12000 characters"],
    },

    ctaText: {
      type: String,
      trim: true,
      maxlength: [60, "CTA text cannot exceed 60 characters"],
      default: "Learn More",
    },

    ctaUrl: {
      type: String,
      trim: true,
      maxlength: [500, "CTA URL cannot exceed 500 characters"],
      default: "",
      validate: {
        validator: isValidHttpUrl,
        message: "CTA URL must be a valid http or https URL",
      },
    },

    category: {
      type: String,
      enum: ["promotion", "newsletter", "course", "announcement", "welcome"],
      default: "newsletter",
    },

    isActive: {
      type: Boolean,
      default: true,
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
 * Normalizes template fields before saving.
 */
emailTemplateSchema.pre("validate", function (next) {
  if (this.name) {
    this.name = String(this.name).trim();
  }

  if (this.subject) {
    this.subject = String(this.subject).trim();
  }

  if (this.ctaUrl) {
    this.ctaUrl = String(this.ctaUrl).trim();
  }

  next();
});

/**
 * Indexes for admin filtering and search.
 */
emailTemplateSchema.index({ name: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ isActive: 1 });
emailTemplateSchema.index({ createdBy: 1, createdAt: -1 });
emailTemplateSchema.index({ name: "text", subject: "text", headline: "text" });

const EmailTemplate =
  mongoose.models.EmailTemplate ||
  mongoose.model("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;