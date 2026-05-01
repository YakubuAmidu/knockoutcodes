// controllers/newsletterController.js
import mongoose from "mongoose";
import Newsletter from "../models/NewsletterModel.js";

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeNewsletter(doc) {
  return {
    _id: doc._id,
    name: doc.name || "",
    email: doc.email,
    topic: doc.topic || "",
    source: doc.source || "footer",
    notes: doc.notes || "",
    isActive: !!doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ---------------------------------------------------------
// Tiny in-memory anti-abuse
// Still useful as a second layer in addition to route limiter
// ---------------------------------------------------------
const ipHits = new Map();
const WINDOW_MS = 60_000;
const MAX_HITS = 6;

function allowIp(ip) {
  const now = Date.now();
  const arr = ipHits.get(ip) || [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  fresh.push(now);
  ipHits.set(ip, fresh);
  return fresh.length <= MAX_HITS;
}

// PUBLIC
export const createNewsletter = async (req, res) => {
  try {
    if (req.body?.company || req.body?.website) {
      return res.status(200).json({
        success: true,
        message: "Subscribed successfully.",
      });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;

    if (!allowIp(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please wait a moment and try again.",
      });
    }

    const { email, source, notes, name, topic } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const existing = await Newsletter.findOne({ email: normalizedEmail }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You are already subscribed.",
      });
    }

    const doc = await Newsletter.create({
      email: normalizedEmail,
      source: source || "footer",
      notes: notes || "",
      name: name || "",
      topic: topic || "",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully.",
      data: safeNewsletter(doc),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid newsletter data.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to subscribe.",
    });
  }
};

// ADMINS ONLY
export const getNewsletters = async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const filter = q
      ? {
          $or: [
            { email: { $regex: escapeRegex(q), $options: "i" } },
            { name: { $regex: escapeRegex(q), $options: "i" } },
            { topic: { $regex: escapeRegex(q), $options: "i" } },
            { notes: { $regex: escapeRegex(q), $options: "i" } },
            { source: { $regex: escapeRegex(q), $options: "i" } },
          ],
        }
      : {};

    const docs = await Newsletter.find(filter).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: docs.length,
      data: docs.map(safeNewsletter),
    });
  } catch{
    return res.status(500).json({
      success: false,
      message: "Failed to fetch newsletters.",
    });
  }
};

export const getNewsletter = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber ID.",
      });
    }

    const doc = await Newsletter.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeNewsletter(doc),
    });
  } catch{
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriber.",
    });
  }
};

export const updateNewsletter = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, source, notes, name, topic, isActive } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber ID.",
      });
    }

    const doc = await Newsletter.findById(id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    if (email) {
      const normalized = normalizeEmail(email);

      if (normalized && normalized !== doc.email) {
        const taken = await Newsletter.findOne({
          email: normalized,
          _id: { $ne: doc._id },
        }).lean();

        if (taken) {
          return res.status(409).json({
            success: false,
            message: "Email already subscribed.",
          });
        }

        doc.email = normalized;
      }
    }

    if (typeof name === "string") doc.name = name;
    if (typeof topic === "string") doc.topic = topic;
    if (typeof source === "string" && source) doc.source = source;
    if (typeof notes === "string") doc.notes = notes;
    if (typeof isActive === "boolean") doc.isActive = isActive;

    await doc.save();

    return res.status(200).json({
      success: true,
      message: "Subscriber updated.",
      data: safeNewsletter(doc),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber data.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update subscriber.",
    });
  }
};

export const deleteNewsletter = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber ID.",
      });
    }

    const doc = await Newsletter.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscriber deleted.",
    });
  } catch{
    return res.status(500).json({
      success: false,
      message: "Failed to delete subscriber.",
    });
  }
};