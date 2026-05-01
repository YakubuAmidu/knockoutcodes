import mongoose from "mongoose";

const emailSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      enum: ["newsletter", "checkout", "manual", "campaign", "import"],
      default: "newsletter",
    },

    status: {
      type: String,
      enum: ["active", "unsubscribed", "bounced", "blocked"],
      default: "active",
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    subscribedAt: {
      type: Date,
      default: Date.now,
    },

    unsubscribedAt: {
      type: Date,
      default: null,
    },

    lastEmailSentAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

emailSubscriberSchema.index({ email: 1 });
emailSubscriberSchema.index({ status: 1 });
emailSubscriberSchema.index({ source: 1 });

const EmailSubscriber = mongoose.model(
  "EmailSubscriber",
  emailSubscriberSchema
);

export default EmailSubscriber;