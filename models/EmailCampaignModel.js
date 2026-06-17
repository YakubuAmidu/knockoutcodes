// models/emailCampaignModel.js
import mongoose from "mongoose";

/**
 * Allowed campaign statuses.
 */
const EMAIL_CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
  "paused",
];

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
 * Normalizes and removes duplicate emails.
 */
function normalizeEmails(list = []) {
  if (!Array.isArray(list)) return [];

  return [
    ...new Set(
      list
        .map((email) =>
          String(email || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
}

/**
 * Email campaign schema
 * Stores campaign content, audience targeting, scheduling,
 * sending progress, locking, and delivery totals.
 */
const emailCampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    previewText: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },

    brandName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "KnockoutCodes",
    },

    headline: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 180,
    },

    subheadline: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 12000,
    },

    ctaText: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "Shop Now",
    },

    ctaUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
      validate: {
        validator: isValidHttpUrl,
        message: "CTA URL must be a valid http or https URL",
      },
    },

    signature: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Team KnockoutCodes",
    },

    audienceType: {
      type: String,
      enum: ["all", "newsletter", "customers", "manual"],
      default: "newsletter",
      index: true,
    },

    manualRecipients: {
      type: [String],
      default: [],
      set: normalizeEmails,
      validate: {
        validator(value) {
          if (!Array.isArray(value)) return false;

          const emailRegex =
            /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

          return value.every((email) => emailRegex.test(email));
        },
        message: "Invalid manual recipient emails",
      },
    },

    status: {
      type: String,
      enum: EMAIL_CAMPAIGN_STATUSES,
      default: "draft",
    },

    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    totalRecipients: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalSent: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalFailed: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalUnsubscribed: {
      type: Number,
      min: 0,
      default: 0,
    },

    failedRecipients: {
      type: [
        {
          email: {
            type: String,
            trim: true,
            lowercase: true,
          },
          error: {
            type: String,
            trim: true,
            maxlength: 500,
          },
        },
      ],
      default: [],
    },

    lastError: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    allowUnsubscribe: {
      type: Boolean,
      default: true,
    },

    processingLockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    processingLockId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    retryCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

/**
 * Validates scheduling, audience, and campaign totals before saving.
 */
emailCampaignSchema.pre("validate", function (next) {
  if (this.audienceType !== "manual") {
    this.manualRecipients = [];
  }

  if (this.status === "scheduled") {
    if (!this.scheduledFor) {
      return next(
        new Error("scheduledFor is required when campaign is scheduled"),
      );
    }

    if (this.scheduledFor <= new Date()) {
      return next(new Error("scheduledFor must be a future date"));
    }
  }

  if (this.status !== "scheduled") {
    this.scheduledFor = null;
  }

  if (this.status === "sent" && !this.sentAt) {
    this.sentAt = new Date();
  }

  if (this.totalSent + this.totalFailed > this.totalRecipients) {
    return next(new Error("Sent + Failed cannot exceed totalRecipients"));
  }

  next();
});

/**
 * Indexes for scheduling, filtering, and search.
 */
emailCampaignSchema.index({ status: 1, scheduledFor: 1 });
emailCampaignSchema.index({ createdBy: 1, createdAt: -1 });
emailCampaignSchema.index({ createdAt: -1 });
emailCampaignSchema.index({ name: "text", subject: "text" });

const EmailCampaign =
  mongoose.models.EmailCampaign ||
  mongoose.model("EmailCampaign", emailCampaignSchema);

export default EmailCampaign;
export { EMAIL_CAMPAIGN_STATUSES };
