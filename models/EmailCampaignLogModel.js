// models/emailCampaignLogModel.js
import mongoose from "mongoose";

/**
 * Allowed lifecycle statuses for each campaign recipient.
 */
const EMAIL_CAMPAIGN_LOG_STATUSES = [
  "pending",
  "sent",
  "failed",
  "opened",
  "clicked",
  "unsubscribed",
];

/**
 * Validates email format before saving campaign log records.
 */
function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    String(email || "")
      .trim()
      .toLowerCase(),
  );
}

/**
 * Email campaign log schema
 * Tracks delivery, opens, clicks, unsubscribes, and provider errors
 * for each recipient inside one campaign.
 */
const emailCampaignLogSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: isValidEmail,
        message: "A valid email is required",
      },
    },

    status: {
      type: String,
      enum: EMAIL_CAMPAIGN_LOG_STATUSES,
      default: "pending",
      index: true,
    },

    providerMessageId: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    errorMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    sentAt: {
      type: Date,
      default: null,
    },

    openedAt: {
      type: Date,
      default: null,
    },

    clickedAt: {
      type: Date,
      default: null,
    },

    unsubscribedAt: {
      type: Date,
      default: null,
    },

    openCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    clickCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastOpenedAt: {
      type: Date,
      default: null,
    },

    lastClickedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/**
 * Normalizes email and keeps event timestamps consistent.
 */
emailCampaignLogSchema.pre("validate", function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }

  if (this.status === "sent" && !this.sentAt) {
    this.sentAt = new Date();
  }

  if (this.status === "opened") {
    const openedDate = this.lastOpenedAt || this.openedAt || new Date();

    this.openedAt = this.openedAt || openedDate;
    this.lastOpenedAt = this.lastOpenedAt || openedDate;

    if (this.openCount < 1) {
      this.openCount = 1;
    }
  }

  if (this.status === "clicked") {
    const clickedDate = this.lastClickedAt || this.clickedAt || new Date();

    this.clickedAt = this.clickedAt || clickedDate;
    this.lastClickedAt = this.lastClickedAt || clickedDate;

    if (!this.openedAt) {
      this.openedAt = clickedDate;
    }

    if (!this.lastOpenedAt) {
      this.lastOpenedAt = clickedDate;
    }

    if (this.openCount < 1) {
      this.openCount = 1;
    }

    if (this.clickCount < 1) {
      this.clickCount = 1;
    }
  }

  if (this.status === "unsubscribed" && !this.unsubscribedAt) {
    this.unsubscribedAt = new Date();
  }

  if (this.openCount > 0 && !this.openedAt) {
    this.openedAt = this.lastOpenedAt || new Date();
  }

  if (this.clickCount > 0 && !this.clickedAt) {
    this.clickedAt = this.lastClickedAt || new Date();
  }

  next();
});

/**
 * Indexes for campaign analytics, recipient lookup, and duplicate prevention.
 */
emailCampaignLogSchema.index({ campaign: 1, email: 1 }, { unique: true });
emailCampaignLogSchema.index({ campaign: 1, status: 1 });
emailCampaignLogSchema.index({ campaign: 1, updatedAt: -1 });
emailCampaignLogSchema.index({ email: 1, createdAt: -1 });

const EmailCampaignLog =
  mongoose.models.EmailCampaignLog ||
  mongoose.model("EmailCampaignLog", emailCampaignLogSchema);

export default EmailCampaignLog;
export { EMAIL_CAMPAIGN_LOG_STATUSES };
