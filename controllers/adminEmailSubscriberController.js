import mongoose from "mongoose";
import EmailSubscriber, {
  EMAIL_SUBSCRIBER_STATUSES,
  EMAIL_SUBSCRIBER_SOURCES,
  isValidEmail,
} from "../models/EmailSubscriberModel.js";

function cleanString(value, maxLength = 500) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTags(tags = []) {
  const raw = Array.isArray(tags)
    ? tags
    : String(tags || "")
        .split(",")
        .map((tag) => tag.trim());

  return [
    ...new Set(
      raw
        .map((tag) => cleanString(tag, 40).toLowerCase())
        .filter(Boolean)
    ),
  ].slice(0, 30);
}

function cleanIds(ids = []) {
  if (!Array.isArray(ids)) return [];

  return [
    ...new Set(
      ids
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];
}

function safeSubscriber(subscriber) {
  if (!subscriber) return null;

  const item = subscriber.toObject ? subscriber.toObject() : subscriber;

  return {
    _id: item._id,
    email: item.email,
    name: item.name || "",
    source: item.source || "newsletter",
    status: item.status || "active",
    tags: item.tags || [],
    notes: item.notes || "",

    subscribedAt: item.subscribedAt || null,
    unsubscribedAt: item.unsubscribedAt || null,
    lastEmailSentAt: item.lastEmailSentAt || null,
    lastOpenedAt: item.lastOpenedAt || null,
    lastClickedAt: item.lastClickedAt || null,

    openCount: item.openCount || 0,
    clickCount: item.clickCount || 0,
    sentCount: item.sentCount || 0,
    bounceCount: item.bounceCount || 0,
    unsubscribeCount: item.unsubscribeCount || 0,

    bounceReason: item.bounceReason || "",
    blockedReason: item.blockedReason || "",

    consent: item.consent || {},
    activityLog: Array.isArray(item.activityLog) ? item.activityLog.slice(-20) : [],

    createdBy: item.createdBy || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function pushActivity(payload, action, message = "") {
  payload.$push = {
    ...(payload.$push || {}),
    activityLog: {
      $each: [
        {
          action: cleanString(action, 80),
          message: cleanString(message, 500),
          createdAt: new Date(),
        },
      ],
      $slice: -50,
    },
  };
}

function buildSubscriberPayload(body = {}, isCreate = false) {
  const payload = {};

  if (body.email !== undefined || isCreate) {
    payload.email = cleanString(body.email, 180).toLowerCase();

    if (!payload.email || !isValidEmail(payload.email)) {
      const error = new Error("A valid email is required");
      error.statusCode = 400;
      throw error;
    }
  }

  if (body.name !== undefined) {
    payload.name = cleanString(body.name, 120);
  }

  if (body.source !== undefined) {
    const source = cleanString(body.source, 30).toLowerCase();

    if (!EMAIL_SUBSCRIBER_SOURCES.includes(source)) {
      const error = new Error("Invalid subscriber source");
      error.statusCode = 400;
      throw error;
    }

    payload.source = source;
  }

  if (body.status !== undefined) {
    const status = cleanString(body.status, 30).toLowerCase();

    if (!EMAIL_SUBSCRIBER_STATUSES.includes(status)) {
      const error = new Error("Invalid subscriber status");
      error.statusCode = 400;
      throw error;
    }

    payload.status = status;
  }

  if (body.tags !== undefined) {
    payload.tags = cleanTags(body.tags);
  }

  if (body.notes !== undefined) {
    payload.notes = cleanString(body.notes, 1000);
  }

  if (body.bounceReason !== undefined) {
    payload.bounceReason = cleanString(body.bounceReason, 500);
  }

  if (body.blockedReason !== undefined) {
    payload.blockedReason = cleanString(body.blockedReason, 500);
  }

  return payload;
}

export async function createEmailSubscriber(req, res, next) {
  try {
    const payload = buildSubscriberPayload(req.body, true);

    const existingSubscriber = await EmailSubscriber.findOne({
      email: payload.email,
    });

    if (existingSubscriber) {
      const wasUnsubscribed = existingSubscriber.status === "unsubscribed";

      if (wasUnsubscribed) {
        existingSubscriber.status = "active";
        existingSubscriber.unsubscribedAt = null;
      }

      existingSubscriber.name = payload.name ?? existingSubscriber.name;
      existingSubscriber.source = payload.source || existingSubscriber.source;
      existingSubscriber.notes = payload.notes ?? existingSubscriber.notes;
      existingSubscriber.tags =
        Array.isArray(payload.tags) && payload.tags.length > 0
          ? payload.tags
          : existingSubscriber.tags;

      existingSubscriber.createdBy =
        existingSubscriber.createdBy || req.user?._id || null;

      existingSubscriber.addActivity(
        wasUnsubscribed ? "reactivated" : "updated",
        "Subscriber was updated by admin."
      );

      await existingSubscriber.save();

      return res.status(200).json({
        success: true,
        message: wasUnsubscribed
          ? "Subscriber reactivated successfully"
          : "Subscriber already existed and was updated",
        data: safeSubscriber(existingSubscriber),
        subscriber: safeSubscriber(existingSubscriber),
      });
    }

    const subscriber = await EmailSubscriber.create({
      ...payload,
      source: payload.source || "manual",
      createdBy: req.user?._id || null,
      activityLog: [
        {
          action: "created",
          message: "Subscriber created by admin.",
          createdAt: new Date(),
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Email subscriber created successfully",
      data: safeSubscriber(subscriber),
      subscriber: safeSubscriber(subscriber),
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.message = "Subscriber email already exists";
    }

    next(error);
  }
}

export async function getEmailSubscribers(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const search = cleanString(req.query.search || req.query.q || "", 120);
    const status = cleanString(req.query.status || "", 30).toLowerCase();
    const source = cleanString(req.query.source || "", 30).toLowerCase();

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      email: { email: 1 },
      mostOpened: { openCount: -1 },
      mostClicked: { clickCount: -1 },
      recentlySent: { lastEmailSentAt: -1 },
      recentlyOpened: { lastOpenedAt: -1 },
      recentlyClicked: { lastClickedAt: -1 },
    };

    const sort = sortMap[req.query.sort] || sortMap.newest;

    const query = {};

    if (search) {
      const escaped = escapeRegex(search);

      query.$or = [
        { email: { $regex: escaped, $options: "i" } },
        { name: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
      ];
    }

    if (status && EMAIL_SUBSCRIBER_STATUSES.includes(status)) {
      query.status = status;
    }

    if (source && EMAIL_SUBSCRIBER_SOURCES.includes(source)) {
      query.source = source;
    }

    const [subscribers, total, totals] = await Promise.all([
      EmailSubscriber.find(query).sort(sort).skip(skip).limit(limit).lean(),
      EmailSubscriber.countDocuments(query),
      EmailSubscriber.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            sentCount: { $sum: "$sentCount" },
            openCount: { $sum: "$openCount" },
            clickCount: { $sum: "$clickCount" },
            bounceCount: { $sum: "$bounceCount" },
            unsubscribeCount: { $sum: "$unsubscribeCount" },
          },
        },
      ]),
    ]);

    const summary = {
      totalAll: 0,
      active: 0,
      unsubscribed: 0,
      bounced: 0,
      blocked: 0,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
    };

    totals.forEach((item) => {
      const key = item._id || "unknown";
      if (key in summary) summary[key] = item.count || 0;

      summary.totalAll += item.count || 0;
      summary.sentCount += item.sentCount || 0;
      summary.openCount += item.openCount || 0;
      summary.clickCount += item.clickCount || 0;
      summary.bounceCount += item.bounceCount || 0;
      summary.unsubscribeCount += item.unsubscribeCount || 0;
    });

    if (summary.sentCount > 0) {
      summary.openRate = Math.round((summary.openCount / summary.sentCount) * 100);
      summary.clickRate = Math.round((summary.clickCount / summary.sentCount) * 100);
      summary.bounceRate = Math.round((summary.bounceCount / summary.sentCount) * 100);
      summary.unsubscribeRate = Math.round(
        (summary.unsubscribeCount / summary.sentCount) * 100
      );
    }

    const safeData = subscribers.map(safeSubscriber);

    return res.status(200).json({
      success: true,
      count: safeData.length,
      total,
      summary,
      data: safeData,
      subscribers: safeData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailSubscriberById(req, res, next) {
  try {
    const subscriber = await EmailSubscriber.findById(req.params.id).lean();

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Email subscriber not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeSubscriber(subscriber),
      subscriber: safeSubscriber(subscriber),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailSubscriber(req, res, next) {
  try {
    const payload = buildSubscriberPayload(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    if (payload.email) {
      const duplicate = await EmailSubscriber.findOne({
        email: payload.email,
        _id: { $ne: req.params.id },
      }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another subscriber already uses this email",
        });
      }
    }

    const subscriber = await EmailSubscriber.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Email subscriber not found",
      });
    }

    Object.assign(subscriber, payload);

    if (payload.status === "bounced") {
      subscriber.bounceCount += 1;
    }

    if (payload.status === "unsubscribed") {
      subscriber.unsubscribeCount += 1;
    }

    subscriber.addActivity("updated", "Subscriber was updated by admin.");

    await subscriber.save();

    return res.status(200).json({
      success: true,
      message: "Email subscriber updated successfully",
      data: safeSubscriber(subscriber),
      subscriber: safeSubscriber(subscriber),
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.message = "Subscriber email already exists";
    }

    next(error);
  }
}

export async function deleteEmailSubscriber(req, res, next) {
  try {
    const subscriber = await EmailSubscriber.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Email subscriber not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email subscriber deleted successfully",
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
}

export async function bulkUpdateEmailSubscribers(req, res, next) {
  try {
    const ids = cleanIds(req.body?.ids);
    const status = cleanString(req.body?.status, 30).toLowerCase();
    const reason = cleanString(req.body?.reason, 500);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one valid subscriber",
      });
    }

    if (!EMAIL_SUBSCRIBER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscriber status",
      });
    }

    const update = {
      $set: { status },
    };

    if (status === "unsubscribed") {
      update.$set.unsubscribedAt = new Date();
      update.$inc = { unsubscribeCount: 1 };
    } else {
      update.$set.unsubscribedAt = null;
    }

    if (status === "bounced") {
      update.$set.bounceReason = reason;
      update.$inc = { ...(update.$inc || {}), bounceCount: 1 };
    } else {
      update.$set.bounceReason = "";
    }

    if (status === "blocked") {
      update.$set.blockedReason = reason;
    } else {
      update.$set.blockedReason = "";
    }

    pushActivity(update, "bulk_status_updated", `Status changed to ${status}.`);

    const result = await EmailSubscriber.updateMany(
      { _id: { $in: ids } },
      update,
      { runValidators: true }
    );

    const subscribers = await EmailSubscriber.find({ _id: { $in: ids } }).lean();
    const safeData = subscribers.map(safeSubscriber);

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount || 0} subscribers updated successfully`,
      modifiedCount: result.modifiedCount || 0,
      data: safeData,
      subscribers: safeData,
    });
  } catch (error) {
    next(error);
  }
}

export async function bulkDeleteEmailSubscribers(req, res, next) {
  try {
    const ids = cleanIds(req.body?.ids);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one valid subscriber",
      });
    }

    const result = await EmailSubscriber.deleteMany({
      _id: { $in: ids },
    });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount || 0} subscribers deleted successfully`,
      deletedCount: result.deletedCount || 0,
      data: { ids },
    });
  } catch (error) {
    next(error);
  }
}