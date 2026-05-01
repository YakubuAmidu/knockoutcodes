// models/contactModel.js
import mongoose from "mongoose";

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

const contactSchema = new mongoose.Schema(
  {
    // ✅ Link ticket to a real logged-in user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 70 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    subject: { type: String, required: true, trim: true, maxlength: 300 },

    // backward compat (kept)
    message: { type: String, trim: true, maxlength: 2500 },

    // ✅ Threaded messages (source of truth)
    messages: { type: [messageSchema], default: [] },

    // ✅ Fast "new message" detection fields
    lastSender: { type: String, enum: ["user", "admin"], default: "user", index: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },

    // ✅ Separate "seen" timestamps per side (this fixes your exact issue)
    userLastSeenAt: { type: Date, default: null },
    adminLastSeenAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["new", "open", "pending", "resolved", "closed"],
      default: "new",
      index: true,
    },

    // ✅ admin has seen latest user message?
    isSeen: { type: Boolean, default: false },

    // ✅ admin has replied at least once?
    replied: { type: Boolean, default: false },

    replyNote: { type: String, default: "", trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// ✅ Helpful compound index for user inbox sorting
contactSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model("Contact", contactSchema);
