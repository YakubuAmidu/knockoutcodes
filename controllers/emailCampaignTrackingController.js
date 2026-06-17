// controllers/emailCampaignTrackingController.js
import mongoose from "mongoose";
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";

function getTrackingId(req) {
  return String(req.query.logId || req.query.id || req.query.log || "").trim();
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getSafeRedirectUrl(rawUrl) {
  if (!rawUrl) return "/";

  let decoded = "";

  try {
    decoded = decodeURIComponent(String(rawUrl));
  } catch {
    decoded = String(rawUrl);
  }

  const trimmed = decoded.trim();

  if (!trimmed) return "/";

  try {
    const url = new URL(trimmed);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "/";
    }

    return url.toString();
  } catch {
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }

    return "/";
  }
}

async function updateOpenTracking(logId) {
  if (!isValidObjectId(logId)) return;

  const now = new Date();

  await EmailCampaignLog.findByIdAndUpdate(logId, {
    $inc: { openCount: 1 },
    $set: {
      lastOpenedAt: now,
    },
    $setOnInsert: {},
  });

  const log = await EmailCampaignLog.findById(logId);
  if (!log) return;

  if (!log.openedAt) log.openedAt = now;

  if (log.status === "sent" || log.status === "pending") {
    log.status = "opened";
  }

  await log.save();
}

async function updateClickTracking(logId) {
  if (!isValidObjectId(logId)) return;

  const now = new Date();

  const log = await EmailCampaignLog.findById(logId);
  if (!log) return;

  log.clickCount = Number(log.clickCount || 0) + 1;
  log.lastClickedAt = now;

  if (!log.clickedAt) log.clickedAt = now;
  if (!log.openedAt) log.openedAt = now;
  if (!log.lastOpenedAt) log.lastOpenedAt = now;

  if (["sent", "pending", "opened"].includes(log.status)) {
    log.status = "clicked";
  }

  await log.save();
}

export const trackEmailOpen = async (req, res) => {
  try {
    const logId = getTrackingId(req);

    await updateOpenTracking(logId);

    // eslint-disable-next-line no-undef
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "base64",
    );

    res.set("Content-Type", "image/gif");
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    return res.status(200).send(pixel);
  } catch {
    return res.status(200).end();
  }
};

export const trackEmailClick = async (req, res) => {
  try {
    const logId = getTrackingId(req);
    const targetUrl = getSafeRedirectUrl(req.query.url || "");

    await updateClickTracking(logId);

    return res.redirect(targetUrl);
  } catch {
    return res.redirect("/");
  }
};
