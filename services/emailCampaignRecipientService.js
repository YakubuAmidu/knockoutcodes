// services/emailCampaignRecipientService.js
import Newsletter from "../models/NewsletterModel.js";
import Order from "../models/OrderModel.js";
import EmailUnsubscribe from "../models/EmailUnsubScribeModel.js";

function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    String(email || "")
      .trim()
      .toLowerCase(),
  );
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeAudienceType(value) {
  const normalized = String(value || "newsletter")
    .trim()
    .toLowerCase();
  const allowed = ["manual", "newsletter", "customers", "all"];
  return allowed.includes(normalized) ? normalized : "newsletter";
}

function uniqueEmails(list = []) {
  return [...new Set(list.map(normalizeEmail).filter(isValidEmail))];
}

async function getNewsletterEmails() {
  const subscribers = await Newsletter.find({}).select("email").lean();

  return uniqueEmails(subscribers.map((item) => item?.email));
}

async function getCustomerEmails() {
  const orders = await Order.find({})
    .select("email userEmail customerEmail shippingAddress.email")
    .lean();

  const emails = [];

  for (const order of orders) {
    if (order?.email) emails.push(order.email);
    if (order?.userEmail) emails.push(order.userEmail);
    if (order?.customerEmail) emails.push(order.customerEmail);
    if (order?.shippingAddress?.email) emails.push(order.shippingAddress.email);
  }

  return uniqueEmails(emails);
}

export async function resolveCampaignRecipients(campaign) {
  const audienceType = normalizeAudienceType(campaign?.audienceType);

  let recipients = [];

  if (audienceType === "manual") {
    recipients = uniqueEmails(campaign?.manualRecipients || []);
  } else if (audienceType === "newsletter") {
    recipients = await getNewsletterEmails();
  } else if (audienceType === "customers") {
    recipients = await getCustomerEmails();
  } else if (audienceType === "all") {
    const [newsletterEmails, customerEmails] = await Promise.all([
      getNewsletterEmails(),
      getCustomerEmails(),
    ]);

    recipients = uniqueEmails([...newsletterEmails, ...customerEmails]);
  }

  const unsubscribedDocs = await EmailUnsubscribe.find({})
    .select("email")
    .lean();

  const unsubscribedSet = new Set(
    unsubscribedDocs.map((item) => normalizeEmail(item?.email)).filter(Boolean),
  );

  return recipients.filter(
    (email) => !unsubscribedSet.has(normalizeEmail(email)),
  );
}
