import cron from "node-cron";
import EmailCampaign from "../models/EmailCampaignModel.js";
import { sendCampaignById } from "../controllers/emailCampaignSendController.js";

let schedulerStarted = false;
let scheduledTask = null;

function nowUtc() {
  return new Date();
}

export function startEmailCampaignScheduler() {
  if (schedulerStarted) {
    return;
  }

  const expression = "* * * * *";

  if (!cron.validate(expression)) {
    throw new Error("Invalid cron expression for email campaign scheduler");
  }

  scheduledTask = cron.schedule(
    expression,
    async () => {
      try {
        const dueCampaigns = await EmailCampaign.find({
          status: "scheduled",
          scheduledFor: { $lte: nowUtc() },
        })
          .sort({ scheduledFor: 1, createdAt: 1 })
          .limit(5);

        for (const campaign of dueCampaigns) {
          try {
            await sendCampaignById(campaign._id.toString(), {
              source: "scheduler",
            });
          } catch (error) {
            console.error(
              `[EMAIL CAMPAIGN SCHEDULER] Failed campaign ${campaign._id}:`,
              error?.message || error,
            );

            await EmailCampaign.findByIdAndUpdate(campaign._id, {
              status: "failed",
              lastError: String(
                error?.message || "Scheduler failed to send campaign",
              ).slice(0, 500),
              processingLockedAt: null,
              processingLockId: "",
            });
          }
        }
      } catch (error) {
        console.error(
          "[EMAIL CAMPAIGN SCHEDULER] Tick failed:",
          error?.message || error,
        );
      }
    },
    {
      timezone: "UTC",
      noOverlap: true,
    },
  );

  schedulerStarted = true;
  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV !== "production") {
    console.log("[EMAIL CAMPAIGN SCHEDULER] Started");
  }
}

export function stopEmailCampaignScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  schedulerStarted = false;
  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV !== "production") {
    console.log("[EMAIL CAMPAIGN SCHEDULER] Stopped");
  }
}

export function getEmailCampaignSchedulerStatus() {
  return {
    started: schedulerStarted,
    running: !!scheduledTask,
    expression: "* * * * *",
    timezone: "UTC",
  };
}
