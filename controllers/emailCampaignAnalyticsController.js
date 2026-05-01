import mongoose from "mongoose";
import EmailCampaign from "../models/EmailCampaignModel.js";
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildRate(numerator, denominator) {
  const safeNumerator = toNumber(numerator, 0);
  const safeDenominator = toNumber(denominator, 0);

  if (safeDenominator <= 0) return 0;

  return Number(((safeNumerator / safeDenominator) * 100).toFixed(2));
}

function createEmptyLogBreakdown() {
  return {
    pending: 0,
    sent: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
  };
}

function applyLogBreakdownRows(rows = []) {
  const breakdown = createEmptyLogBreakdown();

  for (const row of rows) {
    if (
      row?._id &&
      Object.prototype.hasOwnProperty.call(breakdown, row._id)
    ) {
      breakdown[row._id] = toNumber(row.count, 0);
    }
  }

  return breakdown;
}

function normalizeCampaignTotals(row = {}) {
  return {
    totalRecipients: toNumber(row.totalRecipients, 0),
    totalSent: toNumber(row.totalSent, 0),
    totalFailed: toNumber(row.totalFailed, 0),
    totalUnsubscribed: toNumber(row.totalUnsubscribed, 0),
  };
}

function normalizeEngagementTotals(row = {}) {
  return {
    totalLogs: toNumber(row.totalLogs, 0),
    totalOpenEvents: toNumber(row.totalOpenEvents, 0),
    totalClickEvents: toNumber(row.totalClickEvents, 0),
    uniqueOpenedLogs: toNumber(row.uniqueOpenedLogs, 0),
    uniqueClickedLogs: toNumber(row.uniqueClickedLogs, 0),
    uniqueUnsubscribedLogs: toNumber(row.uniqueUnsubscribedLogs, 0),
  };
}

function buildEngagementResponse(engagementTotals, deliveredBase) {
  return {
    totalLogs: toNumber(engagementTotals.totalLogs, 0),
    totalOpenEvents: toNumber(engagementTotals.totalOpenEvents, 0),
    totalClickEvents: toNumber(engagementTotals.totalClickEvents, 0),
    uniqueOpenedLogs: toNumber(engagementTotals.uniqueOpenedLogs, 0),
    uniqueClickedLogs: toNumber(engagementTotals.uniqueClickedLogs, 0),
    uniqueUnsubscribedLogs: toNumber(
      engagementTotals.uniqueUnsubscribedLogs,
      0
    ),
    openRate: buildRate(
      engagementTotals.uniqueOpenedLogs,
      deliveredBase
    ),
    clickRate: buildRate(
      engagementTotals.uniqueClickedLogs,
      deliveredBase
    ),
    unsubscribeRate: buildRate(
      engagementTotals.uniqueUnsubscribedLogs,
      deliveredBase
    ),
  };
}

export async function getEmailCampaignAnalytics(req, res, next) {
  try {
    const [
      totalCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      sendingCampaigns,
      sentCampaigns,
      failedCampaigns,
      aggregateCampaigns,
      aggregateLogStatuses,
      aggregateLogEngagement,
      recentCampaigns,
    ] = await Promise.all([
      EmailCampaign.countDocuments({}),
      EmailCampaign.countDocuments({ status: "draft" }),
      EmailCampaign.countDocuments({ status: "scheduled" }),
      EmailCampaign.countDocuments({ status: "sending" }),
      EmailCampaign.countDocuments({ status: "sent" }),
      EmailCampaign.countDocuments({ status: "failed" }),

      EmailCampaign.aggregate([
        {
          $group: {
            _id: null,
            totalRecipients: { $sum: { $ifNull: ["$totalRecipients", 0] } },
            totalSent: { $sum: { $ifNull: ["$totalSent", 0] } },
            totalFailed: { $sum: { $ifNull: ["$totalFailed", 0] } },
            totalUnsubscribed: { $sum: { $ifNull: ["$totalUnsubscribed", 0] } },
          },
        },
      ]),

      EmailCampaignLog.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      EmailCampaignLog.aggregate([
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            totalOpenEvents: { $sum: { $ifNull: ["$openCount", 0] } },
            totalClickEvents: { $sum: { $ifNull: ["$clickCount", 0] } },
            uniqueOpenedLogs: {
              $sum: {
                $cond: [{ $ne: ["$openedAt", null] }, 1, 0],
              },
            },
            uniqueClickedLogs: {
              $sum: {
                $cond: [{ $ne: ["$clickedAt", null] }, 1, 0],
              },
            },
            uniqueUnsubscribedLogs: {
              $sum: {
                $cond: [{ $ne: ["$unsubscribedAt", null] }, 1, 0],
              },
            },
          },
        },
      ]),

      EmailCampaign.find({})
        .select(
          "name subject status totalRecipients totalSent totalFailed totalUnsubscribed scheduledFor sentAt createdAt"
        )
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const campaignTotals = normalizeCampaignTotals(aggregateCampaigns[0]);
    const engagementTotals = normalizeEngagementTotals(
      aggregateLogEngagement[0]
    );
    const logBreakdown = applyLogBreakdownRows(aggregateLogStatuses);

    return res.status(200).json({
      success: true,
      data: {
        cards: {
          totalCampaigns: toNumber(totalCampaigns, 0),
          draftCampaigns: toNumber(draftCampaigns, 0),
          scheduledCampaigns: toNumber(scheduledCampaigns, 0),
          sendingCampaigns: toNumber(sendingCampaigns, 0),
          sentCampaigns: toNumber(sentCampaigns, 0),
          failedCampaigns: toNumber(failedCampaigns, 0),
          totalRecipients: campaignTotals.totalRecipients,
          totalSent: campaignTotals.totalSent,
          totalFailed: campaignTotals.totalFailed,
          totalUnsubscribed: campaignTotals.totalUnsubscribed,
        },
        logs: logBreakdown,
        engagement: buildEngagementResponse(
          engagementTotals,
          campaignTotals.totalSent
        ),
        recentCampaigns: Array.isArray(recentCampaigns) ? recentCampaigns : [],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailCampaignAnalyticsById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaignObjectId = new mongoose.Types.ObjectId(id);

    const campaign = await EmailCampaign.findById(id)
      .select(
        "name subject previewText brandName headline subheadline status audienceType totalRecipients totalSent totalFailed totalUnsubscribed scheduledFor sentAt createdAt updatedAt"
      )
      .lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    const [statusRows, engagementRows, recentActivity] = await Promise.all([
      EmailCampaignLog.aggregate([
        {
          $match: {
            campaign: campaignObjectId,
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      EmailCampaignLog.aggregate([
        {
          $match: {
            campaign: campaignObjectId,
          },
        },
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            totalOpenEvents: { $sum: { $ifNull: ["$openCount", 0] } },
            totalClickEvents: { $sum: { $ifNull: ["$clickCount", 0] } },
            uniqueOpenedLogs: {
              $sum: {
                $cond: [{ $ne: ["$openedAt", null] }, 1, 0],
              },
            },
            uniqueClickedLogs: {
              $sum: {
                $cond: [{ $ne: ["$clickedAt", null] }, 1, 0],
              },
            },
            uniqueUnsubscribedLogs: {
              $sum: {
                $cond: [{ $ne: ["$unsubscribedAt", null] }, 1, 0],
              },
            },
          },
        },
      ]),

      EmailCampaignLog.find({ campaign: campaignObjectId })
        .select(
          "email status sentAt openedAt clickedAt unsubscribedAt openCount clickCount lastOpenedAt lastClickedAt errorMessage createdAt updatedAt"
        )
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const logBreakdown = applyLogBreakdownRows(statusRows);
    const engagementTotals = normalizeEngagementTotals(engagementRows[0]);

    return res.status(200).json({
      success: true,
      data: {
        campaign: {
          ...campaign,
          totalRecipients: toNumber(campaign.totalRecipients, 0),
          totalSent: toNumber(campaign.totalSent, 0),
          totalFailed: toNumber(campaign.totalFailed, 0),
          totalUnsubscribed: toNumber(campaign.totalUnsubscribed, 0),
        },
        logs: logBreakdown,
        engagement: buildEngagementResponse(
          engagementTotals,
          campaign.totalSent
        ),
        recentActivity: Array.isArray(recentActivity) ? recentActivity : [],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}