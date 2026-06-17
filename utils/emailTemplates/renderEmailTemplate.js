import { campaignTemplate } from "./campaignTemplate.js";

function normalizeBaseUrl(url = "") {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function safeString(value = "") {
  return String(value || "").trim();
}

function ensureAbsoluteUrl(url = "") {
  const clean = safeString(url);

  if (!clean) return "";
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("tel:")
  ) {
    return clean;
  }

  if (clean.startsWith("/") && !clean.startsWith("//")) {
    return clean;
  }

  return clean;
}

function buildOpenTrackingUrl(baseUrl, logId) {
  const cleanBaseUrl = normalizeBaseUrl(baseUrl);
  const cleanLogId = safeString(logId);

  if (!cleanBaseUrl || !cleanLogId) return "";

  return `${cleanBaseUrl}/api/v1/email-campaigns/track/open?logId=${encodeURIComponent(
    cleanLogId,
  )}`;
}

function buildClickTrackingUrl(baseUrl, logId, campaignId, targetUrl) {
  const cleanBaseUrl = normalizeBaseUrl(baseUrl);
  const cleanTargetUrl = ensureAbsoluteUrl(targetUrl);
  const cleanLogId = safeString(logId);
  const cleanCampaignId = safeString(campaignId);

  if (!cleanTargetUrl) return "#";
  if (!cleanBaseUrl) return cleanTargetUrl;

  const params = new URLSearchParams();

  if (cleanLogId) {
    params.set("logId", cleanLogId);
  }

  if (cleanCampaignId) {
    params.set("campaign", cleanCampaignId);
  }

  params.set("url", cleanTargetUrl);

  return `${cleanBaseUrl}/api/v1/email-campaigns/track/click?${params.toString()}`;
}

function appendOpenPixel(html, openTrackingUrl) {
  if (!html || !openTrackingUrl) return html || "";

  const pixelTag = `
    <img
      src="${openTrackingUrl}"
      alt=""
      width="1"
      height="1"
      style="display:block;width:1px;height:1px;border:0;opacity:0;"
    />
  `;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixelTag}</body>`);
  }

  return `${html}${pixelTag}`;
}

function buildTextEmail({
  headline,
  subheadline,
  body,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
  signature,
}) {
  const lines = [
    safeString(headline) || "A Premium Offer Built For Winners",
    "",
  ];

  if (safeString(subheadline)) {
    lines.push(safeString(subheadline), "");
  }

  if (safeString(body)) {
    lines.push(safeString(body), "");
  }

  lines.push(
    `${safeString(ctaText) || "Shop Now"}: ${safeString(ctaUrl) || "#"}`,
  );

  if (safeString(unsubscribeUrl)) {
    lines.push("", `Unsubscribe: ${safeString(unsubscribeUrl)}`);
  }

  lines.push("", safeString(signature) || "Team KnockoutCodes");

  return lines.join("\n").trim();
}

export function renderCampaignEmail(data = {}) {
  const baseUrl = normalizeBaseUrl(
    data.baseUrl ||
      // eslint-disable-next-line no-undef
      process.env.APP_BASE_URL ||
      // eslint-disable-next-line no-undef
      process.env.CLIENT_URL ||
      "http://localhost:5000",
  );

  const logId = safeString(data.logId);
  const campaignId = safeString(data.campaignId);
  const originalCtaUrl = ensureAbsoluteUrl(data.ctaUrl);
  const originalUnsubscribeUrl = ensureAbsoluteUrl(data.unsubscribeUrl);

  const trackedCtaUrl = buildClickTrackingUrl(
    baseUrl,
    logId,
    campaignId,
    originalCtaUrl,
  );

  const trackedUnsubscribeUrl = originalUnsubscribeUrl
    ? buildClickTrackingUrl(baseUrl, logId, campaignId, originalUnsubscribeUrl)
    : "";

  const openTrackingUrl = buildOpenTrackingUrl(baseUrl, logId);

  const templateData = {
    ...data,
    ctaUrl: trackedCtaUrl || originalCtaUrl || "#",
    unsubscribeUrl: trackedUnsubscribeUrl || originalUnsubscribeUrl || "",
  };

  let html = campaignTemplate(templateData);
  html = appendOpenPixel(html, openTrackingUrl);

  const text = buildTextEmail({
    headline: data.headline,
    subheadline: data.subheadline,
    body: data.body,
    ctaText: data.ctaText,
    ctaUrl: originalCtaUrl,
    unsubscribeUrl: originalUnsubscribeUrl,
    signature: data.signature,
  });

  return {
    html,
    text,
    meta: {
      openTrackingUrl,
      trackedCtaUrl,
      trackedUnsubscribeUrl,
    },
  };
}
