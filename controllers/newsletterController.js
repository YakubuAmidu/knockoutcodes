// controllers/newsletterController.js
import crypto from "crypto";
import mongoose from "mongoose";
import Newsletter from "../models/NewsletterModel.js";
import EmailSubscriber from "../models/EmailSubscriberModel.js";
import { getIO } from "../config/socket.js";

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const syncEmailSubscriber = async ({
  email,
  name = "",
  source = "newsletter",
  status = "active",
}) => {
  if (!email) return null;

  const normalizedEmail = normalizeEmail(email);

  return EmailSubscriber.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        name: name || "",
        source,
        status,
        unsubscribedAt: status === "unsubscribed" ? new Date() : null,
      },
      $addToSet: {
        tags: "newsletter",
      },
      $setOnInsert: {
        subscribedAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

const safeNewsletter = (doc) => ({
  _id: doc._id,
  name: doc.name || "",
  email: doc.email,
  topic: doc.topic || "KnockoutCodes Updates",
  source: doc.source || "footer",
  notes: doc.notes || "",
  isActive: Boolean(doc.isActive),
  subscribedAt: doc.subscribedAt,
  unsubscribedAt: doc.unsubscribedAt,
  lastReactivatedAt: doc.lastReactivatedAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const emitNewsletterEvent = (event, payload) => {
  try {
    const io = getIO();
    io.emit(event, payload);
  } catch {
    // Ignore realtime/socket failure.
  }
};

const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  "";

const hashValue = (value = "") =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const ipHits = new Map();
const WINDOW_MS = 60_000;
const MAX_HITS = 6;

const allowIp = (ip) => {
  const now = Date.now();
  const hits = ipHits.get(ip) || [];
  const freshHits = hits.filter((time) => now - time < WINDOW_MS);

  freshHits.push(now);
  ipHits.set(ip, freshHits);

  return freshHits.length <= MAX_HITS;
};

/* ===============================
   PUBLIC: Subscribe
================================ */
export const createNewsletter = async (req, res) => {
  try {
    if (req.body?.company || req.body?.website) {
      return res.status(200).json({
        success: true,
        message: "Subscribed successfully.",
      });
    }

    const ip = getClientIp(req);

    if (!allowIp(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please wait and try again.",
      });
    }

    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const existing = await Newsletter.findOne({ email });

    if (existing) {
      if (!existing.isActive) {
        existing.name = req.body?.name || existing.name || "";
        existing.topic =
          req.body?.topic || existing.topic || "KnockoutCodes Updates";
        existing.source = req.body?.source || existing.source || "footer";
        existing.isActive = true;
        existing.unsubscribedAt = null;
        existing.lastReactivatedAt = new Date();

        await existing.save();

        await syncEmailSubscriber({
          email: existing.email,
          name: existing.name,
          source: "newsletter",
          status: "active",
        });

        const data = safeNewsletter(existing);

        emitNewsletterEvent("newsletter:subscriber-reactivated", data);

        return res.status(200).json({
          success: true,
          message: "Welcome back. Your subscription is active again.",
          data,
        });
      }

      await syncEmailSubscriber({
        email: existing.email,
        name: existing.name,
        source: "newsletter",
        status: "active",
      });

      return res.status(409).json({
        success: false,
        message: "You are already subscribed.",
      });
    }

    const subscriber = await Newsletter.create({
      name: req.body?.name || "",
      email,
      topic: req.body?.topic || "KnockoutCodes Updates",
      source: req.body?.source || "footer",
      notes: "",
      isActive: true,
      metadata: {
        userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
        ipHash: ip ? hashValue(ip) : "",
      },
    });

    await syncEmailSubscriber({
      email: subscriber.email,
      name: subscriber.name,
      source: "newsletter",
      status: "active",
    });

    const data = safeNewsletter(subscriber);

    emitNewsletterEvent("newsletter:new-subscriber", data);

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully.",
      data,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You are already subscribed.",
      });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)?.[0]?.message || "Invalid data.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to subscribe.",
    });
  }
};

/* ===============================
   ADMIN: Get all subscribers
================================ */
export const getNewsletters = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (q) {
      const safeQ = escapeRegex(q);

      filter.$or = [
        { email: { $regex: safeQ, $options: "i" } },
        { name: { $regex: safeQ, $options: "i" } },
        { topic: { $regex: safeQ, $options: "i" } },
        { source: { $regex: safeQ, $options: "i" } },
        { notes: { $regex: safeQ, $options: "i" } },
      ];
    }

    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "inactive") filter.isActive = false;

    const [docs, total, active, inactive] = await Promise.all([
      Newsletter.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Newsletter.countDocuments(filter),
      Newsletter.countDocuments({ ...filter, isActive: true }),
      Newsletter.countDocuments({ ...filter, isActive: false }),
    ]);

    return res.status(200).json({
      success: true,
      count: docs.length,
      total,
      active,
      inactive,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: docs.map(safeNewsletter),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch newsletter subscribers.",
    });
  }
};

/* ===============================
   ADMIN: Get one subscriber
================================ */
export const getNewsletter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber ID.",
      });
    }

    const subscriber = await Newsletter.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeNewsletter(subscriber),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriber.",
    });
  }
};

/* ===============================
   ADMIN: Update subscriber
================================ */
export const updateNewsletter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber ID.",
      });
    }

    const subscriber = await Newsletter.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    if (typeof req.body.email === "string") {
      const nextEmail = normalizeEmail(req.body.email);

      if (nextEmail && nextEmail !== subscriber.email) {
        const taken = await Newsletter.findOne({
          email: nextEmail,
          _id: { $ne: subscriber._id },
        });

        if (taken) {
          return res.status(409).json({
            success: false,
            message: "Email already subscribed.",
          });
        }

        subscriber.email = nextEmail;
      }
    }

    if (typeof req.body.name === "string") subscriber.name = req.body.name;
    if (typeof req.body.topic === "string") subscriber.topic = req.body.topic;
    if (typeof req.body.source === "string")
      subscriber.source = req.body.source;
    if (typeof req.body.notes === "string") subscriber.notes = req.body.notes;

    if (typeof req.body.isActive === "boolean") {
      subscriber.isActive = req.body.isActive;
      subscriber.unsubscribedAt = req.body.isActive ? null : new Date();
    }

    if (req.user?._id) {
      subscriber.lastUpdatedBy = req.user._id;
    }

    await subscriber.save();

    await syncEmailSubscriber({
      email: subscriber.email,
      name: subscriber.name,
      source: "newsletter",
      status: subscriber.isActive ? "active" : "unsubscribed",
    });

    const data = safeNewsletter(subscriber);

    emitNewsletterEvent("newsletter:subscriber-updated", data);

    return res.status(200).json({
      success: true,
      message: "Subscriber updated successfully.",
      data,
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)?.[0]?.message || "Invalid data.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update subscriber.",
    });
  }
};

/* ===============================
   ADMIN: Delete subscriber
================================ */
export const deleteNewsletter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber ID.",
      });
    }

    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    await syncEmailSubscriber({
      email: subscriber.email,
      name: subscriber.name,
      source: "newsletter",
      status: "unsubscribed",
    });

    emitNewsletterEvent("newsletter:subscriber-deleted", {
      _id: subscriber._id,
      email: subscriber.email,
      deletedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Subscriber deleted successfully.",
      deletedId: req.params.id,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete subscriber.",
    });
  }
};
