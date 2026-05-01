import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    previewText: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },

    headline: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    ctaText: {
      type: String,
      trim: true,
      default: "Learn More",
    },

    ctaUrl: {
      type: String,
      trim: true,
      default: "",
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

emailTemplateSchema.index({ name: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ isActive: 1 });

const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;