// controllers/emailCampaignAnalyticsController.js
import mongoose from "mongoose";
import EmailCampaign from "../models/EmailCampaignModel.js";
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function percent(part, total) {
  if (!total) return 0;
  return Number(((Number(part || 0) / Number(total || 0)) * 100).toFixed(2));
}

function safeCampaign(campaign) {
  if (!campaign) return null;

  const item = campaign.toObject ? campaign.toObject() : campaign;

  return {
    _id: item._id,
    name: item.name,
    subject: item.subject,
    status: item.status,
    totalRecipients: item.totalRecipients || 0,
    totalSent: item.totalSent || 0,
    totalFailed: item.totalFailed || 0,
    totalUnsubscribed: item.totalUnsubscribed || 0,
    scheduledFor: item.scheduledFor || null,
    sentAt: item.sentAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function safeActivity(item) {
  return {
    _id: item._id,
    campaign: item.campaign,
    email: item.email,
    status: item.status || "pending",
    sentAt: item.sentAt || null,
    openedAt: item.openedAt || null,
    clickedAt: item.clickedAt || null,
    unsubscribedAt: item.unsubscribedAt || null,
    openCount: item.openCount || 0,
    clickCount: item.clickCount || 0,
    providerMessageId: item.providerMessageId || "",
    errorMessage: item.errorMessage || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function buildCampaignAnalytics(campaignId) {
  const campaign = await EmailCampaign.findById(campaignId).lean();

  if (!campaign) return null;

  const [
    totalLogs,
    sent,
    failed,
    opened,
    clicked,
    unsubscribed,
    recentActivity,
  ] = await Promise.all([
    EmailCampaignLog.countDocuments({ campaign: campaignId }),

    EmailCampaignLog.countDocuments({
      campaign: campaignId,
      status: { $in: ["sent", "opened", "clicked", "unsubscribed"] },
    }),

    EmailCampaignLog.countDocuments({
      campaign: campaignId,
      status: "failed",
    }),

    EmailCampaignLog.countDocuments({
      campaign: campaignId,
      openCount: { $gt: 0 },
    }),

    EmailCampaignLog.countDocuments({
      campaign: campaignId,
      clickCount: { $gt: 0 },
    }),

    EmailCampaignLog.countDocuments({
      campaign: campaignId,
      status: "unsubscribed",
    }),

    EmailCampaignLog.find({ campaign: campaignId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const recipients = campaign.totalRecipients || totalLogs || 0;
  const sentTotal = campaign.totalSent || sent || 0;
  const failedTotal = campaign.totalFailed || failed || 0;
  const unsubscribedTotal = campaign.totalUnsubscribed || unsubscribed || 0;
  const deliveredBase = sentTotal || recipients;

  return {
    campaign: safeCampaign(campaign),
    totals: {
      logs: totalLogs,
      recipients,
      sent: sentTotal,
      failed: failedTotal,
      opened,
      clicked,
      unsubscribed: unsubscribedTotal,
      bounced: 0,
    },
    engagement: {
      openRate: percent(opened, deliveredBase),
      clickRate: percent(clicked, deliveredBase),
      failureRate: percent(failedTotal, recipients),
      unsubscribeRate: percent(unsubscribedTotal, deliveredBase),
      bounceRate: 0,
    },
    recentActivity: recentActivity.map(safeActivity),
  };
}

export async function getEmailCampaignAnalytics(req, res, next) {
  try {
    const campaigns = await EmailCampaign.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const campaignIds = campaigns.map((campaign) => campaign._id);

    const [totalCampaigns, totalLogs, opened, clicked, unsubscribed, failed] =
      await Promise.all([
        EmailCampaign.countDocuments({}),

        EmailCampaignLog.countDocuments({
          campaign: { $in: campaignIds },
        }),

        EmailCampaignLog.countDocuments({
          campaign: { $in: campaignIds },
          openCount: { $gt: 0 },
        }),

        EmailCampaignLog.countDocuments({
          campaign: { $in: campaignIds },
          clickCount: { $gt: 0 },
        }),

        EmailCampaignLog.countDocuments({
          campaign: { $in: campaignIds },
          status: "unsubscribed",
        }),

        EmailCampaignLog.countDocuments({
          campaign: { $in: campaignIds },
          status: "failed",
        }),
      ]);

    const campaignSummaries = await Promise.all(
      campaigns.map(async (campaign) => {
        const analytics = await buildCampaignAnalytics(campaign._id);

        return {
          campaign: safeCampaign(campaign),
          totals: analytics?.totals || {
            logs: 0,
            recipients: campaign.totalRecipients || 0,
            sent: campaign.totalSent || 0,
            failed: campaign.totalFailed || 0,
            opened: 0,
            clicked: 0,
            unsubscribed: campaign.totalUnsubscribed || 0,
            bounced: 0,
          },
          engagement: analytics?.engagement || {
            openRate: 0,
            clickRate: 0,
            failureRate: 0,
            unsubscribeRate: 0,
            bounceRate: 0,
          },
        };
      }),
    );

    const totalSent = campaignSummaries.reduce(
      (sum, item) => sum + Number(item?.totals?.sent || 0),
      0,
    );

    const totalRecipients = campaignSummaries.reduce(
      (sum, item) => sum + Number(item?.totals?.recipients || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCampaigns,
          totalLogs,
          totalRecipients,
          totalSent,
          opened,
          clicked,
          unsubscribed,
          failed,
          openRate: percent(opened, totalSent || totalLogs),
          clickRate: percent(clicked, totalSent || totalLogs),
          unsubscribeRate: percent(unsubscribed, totalSent || totalLogs),
          failureRate: percent(failed, totalRecipients || totalLogs),
        },
        campaigns: campaignSummaries,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailCampaignAnalyticsById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const analytics = await buildCampaignAnalytics(req.params.id);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: "Campaign analytics not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: analytics,
      analytics,
    });
  } catch (error) {
    next(error);
  }
}
