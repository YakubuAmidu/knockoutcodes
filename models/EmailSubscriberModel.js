import mongoose from "mongoose";

const EMAIL_SUBSCRIBER_STATUSES = [
  "active",
  "unsubscribed",
  "bounced",
  "blocked",
];

const EMAIL_SUBSCRIBER_SOURCES = [
  "newsletter",
  "checkout",
  "manual",
  "campaign",
  "import",
];

function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    String(email || "")
      .trim()
      .toLowerCase(),
  );
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) =>
          String(tag || "")
            .trim()
            .toLowerCase()
            .slice(0, 40),
        )
        .filter(Boolean),
    ),
  ].slice(0, 30);
}

const emailSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
      maxlength: 180,
      validate: {
        validator: isValidEmail,
        message: "A valid email is required",
      },
    },

    name: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    source: {
      type: String,
      enum: EMAIL_SUBSCRIBER_SOURCES,
      default: "newsletter",
      index: true,
    },

    status: {
      type: String,
      enum: EMAIL_SUBSCRIBER_STATUSES,
      default: "active",
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      set: normalizeTags,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
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

    lastEmailSentAt: {
      type: Date,
      default: null,
    },

    lastOpenedAt: {
      type: Date,
      default: null,
    },

    lastClickedAt: {
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

    sentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bounceCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    unsubscribeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bounceReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    blockedReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    consent: {
      hasConsent: {
        type: Boolean,
        default: true,
      },
      consentText: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
      consentIp: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
      },
      consentUserAgent: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },
      consentAt: {
        type: Date,
        default: Date.now,
      },
    },

    activityLog: [
      {
        action: {
          type: String,
          trim: true,
          maxlength: 80,
          required: true,
        },
        message: {
          type: String,
          trim: true,
          maxlength: 500,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

emailSubscriberSchema.pre("validate", function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }

  if (this.name) {
    this.name = String(this.name).trim().slice(0, 120);
  }

  if (this.notes) {
    this.notes = String(this.notes).trim().slice(0, 1000);
  }

  if (this.bounceReason) {
    this.bounceReason = String(this.bounceReason).trim().slice(0, 500);
  }

  if (this.blockedReason) {
    this.blockedReason = String(this.blockedReason).trim().slice(0, 500);
  }

  if (Array.isArray(this.tags)) {
    this.tags = normalizeTags(this.tags);
  }

  if (this.status === "unsubscribed") {
    if (!this.unsubscribedAt) this.unsubscribedAt = new Date();
  } else {
    this.unsubscribedAt = null;
  }

  if (this.status !== "bounced") {
    this.bounceReason = "";
  }

  if (this.status !== "blocked") {
    this.blockedReason = "";
  }

  if (Array.isArray(this.activityLog) && this.activityLog.length > 50) {
    this.activityLog = this.activityLog.slice(-50);
  }

  next();
});

emailSubscriberSchema.methods.addActivity = function addActivity(
  action,
  message = "",
) {
  this.activityLog = [
    ...(this.activityLog || []),
    {
      action: String(action || "")
        .trim()
        .slice(0, 80),
      message: String(message || "")
        .trim()
        .slice(0, 500),
      createdAt: new Date(),
    },
  ].slice(-50);
};

emailSubscriberSchema.index({ status: 1, source: 1 });
emailSubscriberSchema.index({ createdBy: 1, createdAt: -1 });
emailSubscriberSchema.index({ subscribedAt: -1 });
emailSubscriberSchema.index({ lastEmailSentAt: -1 });
emailSubscriberSchema.index({ lastOpenedAt: -1 });
emailSubscriberSchema.index({ lastClickedAt: -1 });
emailSubscriberSchema.index({ email: "text", name: "text", tags: "text" });

const EmailSubscriber =
  mongoose.models.EmailSubscriber ||
  mongoose.model("EmailSubscriber", emailSubscriberSchema);

export default EmailSubscriber;

export {
  EMAIL_SUBSCRIBER_STATUSES,
  EMAIL_SUBSCRIBER_SOURCES,
  isValidEmail,
  normalizeTags,
};
