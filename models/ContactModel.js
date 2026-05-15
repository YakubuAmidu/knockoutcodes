// models/contactModel.js
import mongoose from "mongoose";

/**
 * Contact conversation message schema
 * Stores each message inside a contact thread.
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
  },
  { timestamps: true }
);

/**
 * Contact schema
 * Stores user contact requests and admin/user conversation history.
 */
const contactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 70,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email."],
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 2500,
      default: "",
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    lastSender: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    userLastSeenAt: {
      type: Date,
      default: null,
    },

    adminLastSeenAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["new", "open", "pending", "resolved", "closed"],
      default: "new",
    },

    isSeen: {
      type: Boolean,
      default: false,
      index: true,
    },

    replied: {
      type: Boolean,
      default: false,
    },

    replyNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  { timestamps: true }
);

/**
 * Keep thread status updated before saving.
 */
contactSchema.pre("save", function (next) {
  if (this.messages?.length) {
    const lastMessage = this.messages[this.messages.length - 1];

    if (lastMessage?.sender) {
      this.lastSender = lastMessage.sender;
    }

    if (lastMessage?.createdAt) {
      this.lastMessageAt = lastMessage.createdAt;
    }
  }

  if (this.lastSender === "admin") {
    this.replied = true;
  }

  next();
});

/**
 * Indexes for admin inbox, user inbox, and message filtering.
 */
contactSchema.index({ user: 1, updatedAt: -1 });
contactSchema.index({ status: 1, isSeen: 1, updatedAt: -1 });
contactSchema.index({ lastSender: 1, lastMessageAt: -1 });

const Contact =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);

export default Contact;