import mongoose from "mongoose";
import EmailSubscriber from "../models/EmailSubscriberModel.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const createEmailSubscriber = async (req, res) => {
  try {
    const { email, name, source, status, tags } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const exists = await EmailSubscriber.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Subscriber already exists.",
      });
    }

    const subscriber = await EmailSubscriber.create({
      email,
      name,
      source: source || "manual",
      status: status || "active",
      tags: Array.isArray(tags) ? tags : [],
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Subscriber created successfully.",
      subscriber,
    });
  } catch (error) {
    console.error("Create subscriber error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create subscriber.",
    });
  }
};

export const getEmailSubscribers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim();
    const status = req.query.status?.trim();
    const source = req.query.source?.trim();

    const filter = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    if (status) filter.status = status;
    if (source) filter.source = source;

    const [subscribers, total] = await Promise.all([
      EmailSubscriber.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailSubscriber.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      subscribers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get subscribers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers.",
    });
  }
};

export const getEmailSubscriberById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber id.",
      });
    }

    const subscriber = await EmailSubscriber.findById(id).lean();

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      subscriber,
    });
  } catch (error) {
    console.error("Get subscriber error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriber.",
    });
  }
};

export const updateEmailSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber id.",
      });
    }

    const allowed = ["email", "name", "source", "status", "tags"];
    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (updates.email) {
      updates.email = String(updates.email).toLowerCase().trim();
    }

    if (updates.status === "unsubscribed") {
      updates.unsubscribedAt = new Date();
    }

    if (updates.status === "active") {
      updates.unsubscribedAt = null;
    }

    const subscriber = await EmailSubscriber.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscriber updated successfully.",
      subscriber,
    });
  } catch (error) {
    console.error("Update subscriber error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update subscriber.",
    });
  }
};

export const deleteEmailSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber id.",
      });
    }

    const subscriber = await EmailSubscriber.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscriber deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete subscriber.",
    });
  }
};