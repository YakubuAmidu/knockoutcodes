// controllers/emailCampaignSendController.js
import mongoose from "mongoose";
import EmailCampaign from "../models/EmailCampaignModel.js";
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";
import EmailUnsubscribe from "../models/EmailUnsubScribeModel.js";
import EmailSubscriber from "../models/EmailSubscriberModel.js";
import { renderCampaignEmail } from "../utils/emailTemplates/renderEmailTemplate.js";
import { sendMail } from "../utils/mailer.js";
import { resolveCampaignRecipients } from "../services/emailCampaignRecipientService.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getBaseUrl(req) {
  const envBase =
    // eslint-disable-next-line no-undef
    process.env.APP_BASE_URL ||
    // eslint-disable-next-line no-undef
    process.env.CLIENT_URL ||
    // eslint-disable-next-line no-undef
    process.env.SERVER_URL ||
    "";

  if (envBase) return String(envBase).trim().replace(/\/+$/, "");

  if (req?.protocol && req?.get) {
    return `${req.protocol}://${req.get("host")}`;
  }

  return "http://localhost:5000";
}

function safeErrorMessage(error) {
  return String(
    error?.response?.data?.message || error?.message || "Email sending failed",
  ).slice(0, 500);
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeRecipients(list = []) {
  return [
    ...new Set(
      (Array.isArray(list) ? list : []).map(normalizeEmail).filter(Boolean),
    ),
  ];
}

function safeCampaign(campaign) {
  return {
    _id: campaign._id,
    name: campaign.name,
    subject: campaign.subject,
    previewText: campaign.previewText,
    brandName: campaign.brandName,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    body: campaign.body,
    ctaText: campaign.ctaText,
    ctaUrl: campaign.ctaUrl,
    signature: campaign.signature,
    audienceType: campaign.audienceType,
    manualRecipients: campaign.manualRecipients,
    status: campaign.status,
    scheduledFor: campaign.scheduledFor,
    sentAt: campaign.sentAt,
    totalRecipients: campaign.totalRecipients,
    totalSent: campaign.totalSent,
    totalFailed: campaign.totalFailed,
    totalUnsubscribed: campaign.totalUnsubscribed || 0,
    failedRecipients: campaign.failedRecipients || [],
    lastError: campaign.lastError || "",
    retryCount: campaign.retryCount || 0,
    processingLockedAt: campaign.processingLockedAt || null,
    processingLockId: campaign.processingLockId || "",
    createdBy: campaign.createdBy,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

async function populateCampaign(campaignId) {
  return EmailCampaign.findById(campaignId).populate("createdBy", "name email");
}

async function removeUnsafeRecipients(recipients = []) {
  const cleanRecipients = normalizeRecipients(recipients);

  if (!cleanRecipients.length) return [];

  const [unsubscribes, blockedSubscribers] = await Promise.all([
    EmailUnsubscribe.find({
      email: { $in: cleanRecipients },
    })
      .select("email")
      .lean(),

    EmailSubscriber.find({
      email: { $in: cleanRecipients },
      status: { $in: ["unsubscribed", "bounced", "blocked"] },
    })
      .select("email")
      .lean(),
  ]);

  const blockedSet = new Set([
    ...unsubscribes.map((item) => normalizeEmail(item.email)),
    ...blockedSubscribers.map((item) => normalizeEmail(item.email)),
  ]);

  return cleanRecipients.filter((email) => !blockedSet.has(email));
}

async function acquireCampaignLock(campaignId) {
  const lockId = new mongoose.Types.ObjectId().toString();

  const campaign = await EmailCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      status: { $nin: ["sending", "sent"] },
    },
    {
      $set: {
        status: "sending",
        processingLockedAt: new Date(),
        processingLockId: lockId,
        lastAttemptAt: new Date(),
        lastError: "",
      },
    },
    {
      new: true,
    },
  );

  if (!campaign) {
    throw new Error(
      "This campaign is already sending or has already been sent",
    );
  }

  return campaign;
}

async function releaseCampaignLock(campaign, updates = {}) {
  Object.assign(campaign, updates);
  campaign.processingLockedAt = null;
  campaign.processingLockId = "";
  await campaign.save();

  return populateCampaign(campaign._id);
}

async function sendCampaignToRecipients({ campaign, recipients, baseUrl }) {
  const safeRecipients = await removeUnsafeRecipients(recipients);

  if (!safeRecipients.length) {
    throw new Error("No valid recipients found for this campaign");
  }

  let totalSent = 0;
  let totalFailed = 0;
  const failedRecipients = [];

  for (const email of safeRecipients) {
    let log = await EmailCampaignLog.findOne({
      campaign: campaign._id,
      email,
    });

    if (!log) {
      log = await EmailCampaignLog.create({
        campaign: campaign._id,
        email,
        status: "pending",
      });
    } else if (
      log.status === "sent" ||
      log.status === "clicked" ||
      log.status === "opened"
    ) {
      continue;
    } else {
      log.status = "pending";
      log.errorMessage = "";
      await log.save();
    }

    try {
      const { html, text } = renderCampaignEmail({
        name: campaign.name,
        subject: campaign.subject,
        previewText: campaign.previewText,
        brandName: campaign.brandName,
        headline: campaign.headline,
        subheadline: campaign.subheadline,
        body: campaign.body,
        ctaText: campaign.ctaText,
        ctaUrl: campaign.ctaUrl,
        signature: campaign.signature,
        unsubscribeUrl: `${baseUrl}/api/v1/email-campaigns/unsubscribe?email=${encodeURIComponent(
          email,
        )}&campaign=${campaign._id}`,
        logId: log._id.toString(),
        campaignId: campaign._id.toString(),
        baseUrl,
      });

      const mailResult = await sendMail({
        to: email,
        subject: campaign.subject,
        html,
        text,
      });

      log.status = "sent";
      log.sentAt = new Date();
      log.errorMessage = "";
      log.providerMessageId = String(
        mailResult?.messageId ||
          mailResult?.providerMessageId ||
          mailResult?.id ||
          "",
      ).slice(0, 300);

      await log.save();

      await EmailSubscriber.findOneAndUpdate(
        { email },
        { $set: { lastEmailSentAt: new Date() } },
      );

      totalSent += 1;
    } catch (error) {
      const message = safeErrorMessage(error);

      log.status = "failed";
      log.errorMessage = message;
      await log.save();

      totalFailed += 1;

      failedRecipients.push({
        email,
        error: "Email delivery failed.",
      });
    }
  }

  const finalStatus =
    totalSent > 0 && totalFailed > 0
      ? "sent"
      : totalSent > 0
        ? "sent"
        : "failed";

  const updatedCampaign = await releaseCampaignLock(campaign, {
    totalRecipients: safeRecipients.length,
    totalSent,
    totalFailed,
    failedRecipients,
    lastError: failedRecipients.length ? failedRecipients[0].error : "",
    sentAt: totalSent > 0 ? new Date() : campaign.sentAt,
    status: finalStatus,
  });

  return {
    campaign: updatedCampaign,
    summary: {
      totalRecipients: safeRecipients.length,
      totalSent,
      totalFailed,
      skippedRecipients: recipients.length - safeRecipients.length,
      failedRecipients,
    },
  };
}

export async function sendCampaignById(campaignId, options = {}) {
  if (!isValidObjectId(campaignId)) {
    throw new Error("Invalid campaign id");
  }

  const existingCampaign = await EmailCampaign.findById(campaignId);

  if (!existingCampaign) {
    throw new Error("Email campaign not found");
  }

  if (existingCampaign.status === "sending") {
    throw new Error("This campaign is already sending");
  }

  if (existingCampaign.status === "sent") {
    throw new Error("This campaign has already been sent");
  }

  const recipients = await resolveCampaignRecipients(existingCampaign);

  if (!recipients.length) {
    throw new Error("No valid recipients found for this campaign");
  }

  const campaign = await acquireCampaignLock(campaignId);
  const baseUrl = getBaseUrl(options.req);

  return sendCampaignToRecipients({
    campaign,
    recipients,
    baseUrl,
  });
}

export const sendEmailCampaignNow = async (req, res, next) => {
  try {
    const result = await sendCampaignById(req.params.id, { req });

    return res.status(200).json({
      success: true,
      message: "Email campaign sent successfully",
      data: safeCampaign(result.campaign),
      meta: result.summary,
    });
  } catch (error) {
    if (
      error.message === "Invalid campaign id" ||
      error.message === "No valid recipients found for this campaign" ||
      error.message === "This campaign is already sending" ||
      error.message === "This campaign has already been sent" ||
      error.message ===
        "This campaign is already sending or has already been sent"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid email campaign request.",
      });
    }

    if (error.message === "Email campaign not found") {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found.",
      });
    }

    next(error);
  }
};

export const retryFailedCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const existingCampaign = await EmailCampaign.findById(id);

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    if (existingCampaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "This campaign is currently sending and cannot be retried",
      });
    }

    const failedLogs = await EmailCampaignLog.find({
      campaign: existingCampaign._id,
      status: "failed",
    }).select("email");

    const recipients = normalizeRecipients(
      failedLogs.map((item) => item.email),
    );

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: "There are no failed recipients to retry",
      });
    }

    const campaign = await acquireCampaignLock(id);

    campaign.retryCount = Number(campaign.retryCount || 0) + 1;
    await campaign.save();

    const result = await sendCampaignToRecipients({
      campaign,
      recipients,
      baseUrl: getBaseUrl(req),
    });

    return res.status(200).json({
      success: true,
      message: "Failed campaign emails retried successfully",
      data: safeCampaign(result.campaign),
      meta: result.summary,
    });
  } catch (error) {
    next(error);
  }
};
