// models/emailTemplateModel.js
import mongoose from "mongoose";

const EMAIL_TEMPLATE_CATEGORIES = [
  "promotion",
  "newsletter",
  "course",
  "announcement",
  "welcome",
  "product",
  "order",
  "membership",
  "coaching",
  "system",
  "custom",
];

const EMAIL_TEMPLATE_STATUSES = ["draft", "active", "inactive", "archived"];

function isValidHttpUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(String(value).trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function cleanTemplateString(value, maxLength = 5000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      minlength: [2, "Template name must be at least 2 characters"],
      maxlength: [120, "Template name cannot exceed 120 characters"],
      index: true,
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
      maxlength: [180, "Headline cannot exceed 180 characters"],
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
      enum: EMAIL_TEMPLATE_CATEGORIES,
      default: "newsletter",
      index: true,
    },

    status: {
      type: String,
      enum: EMAIL_TEMPLATE_STATUSES,
      default: "draft",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastUsedAt: {
      type: Date,
      default: null,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: "",
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

emailTemplateSchema.pre("validate", function (next) {
  this.name = cleanTemplateString(this.name, 120);
  this.subject = cleanTemplateString(this.subject, 180);
  this.previewText = cleanTemplateString(this.previewText, 220);
  this.headline = cleanTemplateString(this.headline, 180);
  this.body = cleanTemplateString(this.body, 12000);
  this.ctaText = cleanTemplateString(this.ctaText, 60) || "Learn More";
  this.ctaUrl = cleanTemplateString(this.ctaUrl, 500);
  this.notes = cleanTemplateString(this.notes, 1000);

  if (this.category) {
    this.category = String(this.category).trim().toLowerCase();
  }

  if (this.status) {
    this.status = String(this.status).trim().toLowerCase();
  }

  if (this.status === "active") {
    this.isActive = true;
  }

  if (["draft", "inactive", "archived"].includes(this.status)) {
    this.isActive = false;
  }

  if (this.isActive === true && this.status !== "active") {
    this.status = "active";
  }

  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }

  next();
});

emailTemplateSchema.index({ category: 1, status: 1, isActive: 1 });
emailTemplateSchema.index({ createdBy: 1, createdAt: -1 });
emailTemplateSchema.index({ updatedAt: -1 });
emailTemplateSchema.index({ usageCount: -1 });
emailTemplateSchema.index({ name: "text", subject: "text", headline: "text" });

const EmailTemplate =
  mongoose.models.EmailTemplate ||
  mongoose.model("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;

export { EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATE_STATUSES, isValidHttpUrl };
