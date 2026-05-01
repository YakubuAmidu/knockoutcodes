// models/emailCampaignLogModel.js
import mongoose from "mongoose";

const EMAIL_CAMPAIGN_LOG_STATUSES = [
  "pending",
  "sent",
  "failed",
  "opened",
  "clicked",
  "unsubscribed",
];

function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    String(email || "").trim().toLowerCase()
  );
}

const emailCampaignLogSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
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
      default: 0,
      min: 0,
    },

    clickCount: {
      type: Number,
      default: 0,
      min: 0,
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
  {
    timestamps: true,
  }
);

emailCampaignLogSchema.pre("validate", function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }

  if (this.openCount > 0 && !this.openedAt) {
    this.openedAt = this.lastOpenedAt || new Date();
  }

  if (this.clickCount > 0 && !this.clickedAt) {
    this.clickedAt = this.lastClickedAt || new Date();
  }

  if (this.status === "opened" && !this.openedAt) {
    this.openedAt = this.lastOpenedAt || new Date();
  }

  if (this.status === "clicked") {
    if (!this.clickedAt) {
      this.clickedAt = this.lastClickedAt || new Date();
    }

    if (!this.openedAt) {
      this.openedAt = this.clickedAt;
    }

    if (this.openCount < 1) {
      this.openCount = 1;
    }
  }

  if (this.status === "unsubscribed" && !this.unsubscribedAt) {
    this.unsubscribedAt = new Date();
  }

  if (this.status === "sent" && !this.sentAt) {
    this.sentAt = new Date();
  }

  next();
});

emailCampaignLogSchema.index({ campaign: 1, email: 1 }, { unique: true });
emailCampaignLogSchema.index({ campaign: 1, status: 1 });
emailCampaignLogSchema.index({ campaign: 1, updatedAt: -1 });
emailCampaignLogSchema.index({ email: 1, createdAt: -1 });

const EmailCampaignLog = mongoose.model(
  "EmailCampaignLog",
  emailCampaignLogSchema
);

export default EmailCampaignLog;
export { EMAIL_CAMPAIGN_LOG_STATUSES };