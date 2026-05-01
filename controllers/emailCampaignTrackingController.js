// controllers/emailCampaignTrackingController.js
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";

function getTrackingId(req) {
  return (req.query.logId || req.query.id || req.query.log || "")
    .toString()
    .trim();
}

function getSafeRedirectUrl(rawUrl) {
  if (!rawUrl) return "/";

  let decoded = rawUrl;

  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    decoded = rawUrl;
  }

  const trimmed = String(decoded).trim();

  if (!trimmed) return "/";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return "/";
}

async function updateOpenTracking(logId) {
  if (!logId) return;

  const now = new Date();

  const log = await EmailCampaignLog.findById(logId);
  if (!log) return;

  log.openCount = Number(log.openCount || 0) + 1;
  log.lastOpenedAt = now;

  if (!log.openedAt) {
    log.openedAt = now;
  }

  if (log.status === "sent" || log.status === "pending") {
    log.status = "opened";
  }

  await log.save();
}

async function updateClickTracking(logId) {
  if (!logId) return;

  const now = new Date();

  const log = await EmailCampaignLog.findById(logId);
  if (!log) return;

  log.clickCount = Number(log.clickCount || 0) + 1;
  log.lastClickedAt = now;

  if (!log.clickedAt) {
    log.clickedAt = now;
  }

  if (
    log.status === "sent" ||
    log.status === "pending" ||
    log.status === "opened"
  ) {
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
      "base64"
    );

    res.set("Content-Type", "image/gif");
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    return res.send(pixel);
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