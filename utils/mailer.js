// utils/mailer.js
import nodemailer from "nodemailer";

function requiredEnv(name) {
  // eslint-disable-next-line no-undef
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }

  return String(value).trim();
}

function optionalEnv(name, fallback = "") {
  // eslint-disable-next-line no-undef
  const value = process.env[name];
  return value === undefined || value === null
    ? fallback
    : String(value).trim();
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function parseNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sanitizeHeaderValue(value, fieldName) {
  if (value === undefined || value === null) return "";

  const clean = String(value)
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (!clean) return "";

  if (clean.length > 255) {
    throw new Error(`${fieldName} is too long`);
  }

  return clean;
}

function sanitizeEmailAddress(value, fieldName = "Email") {
  const clean = sanitizeHeaderValue(value, fieldName);

  const emailRegex =
    /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

  if (!emailRegex.test(clean)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return clean;
}

function extractEmailAddress(value, fieldName = "Email") {
  const clean = sanitizeHeaderValue(value, fieldName);

  if (!clean) {
    throw new Error(`${fieldName} is invalid`);
  }

  const angleMatch = clean.match(/<([^<>]+)>/);
  const emailOnly = angleMatch ? angleMatch[1].trim() : clean;

  return sanitizeEmailAddress(emailOnly, fieldName);
}

function sanitizeEmailList(input, fieldName = "Recipient") {
  if (!input) return undefined;

  const items = Array.isArray(input)
    ? input
    : String(input)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  if (!items.length) return undefined;

  return items.map((item) => extractEmailAddress(item, fieldName)).join(", ");
}

function sanitizeSubject(subject) {
  const clean = sanitizeHeaderValue(subject, "Subject");

  if (!clean) {
    throw new Error("Subject is required");
  }

  if (clean.length > 200) {
    throw new Error("Subject is too long");
  }

  return clean;
}

function sanitizeHtml(html) {
  if (html === undefined || html === null) return undefined;
  return String(html);
}

function sanitizeText(text) {
  if (text === undefined || text === null) return undefined;
  return String(text);
}

function formatFromAddress(name, email) {
  const safeName = sanitizeHeaderValue(name, "MAIL_FROM_NAME");
  const safeEmail = sanitizeEmailAddress(email, "MAIL_FROM_EMAIL");

  return safeName ? `${safeName} <${safeEmail}>` : safeEmail;
}

let transporterInstance = null;

export function createTransport() {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = requiredEnv("SMTP_HOST");
  const port = parseNumber(requiredEnv("SMTP_PORT"), NaN);
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid number");
  }

  const secure = parseBoolean(
    optionalEnv("SMTP_SECURE", port === 465 ? "true" : "false"),
    port === 465,
  );

  transporterInstance = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },

    pool: parseBoolean(optionalEnv("SMTP_POOL", "true"), true),
    maxConnections: parseNumber(optionalEnv("SMTP_MAX_CONNECTIONS", "3"), 3),
    maxMessages: parseNumber(optionalEnv("SMTP_MAX_MESSAGES", "100"), 100),

    connectionTimeout: parseNumber(
      optionalEnv("SMTP_CONNECTION_TIMEOUT", "10000"),
      10000,
    ),
    greetingTimeout: parseNumber(
      optionalEnv("SMTP_GREETING_TIMEOUT", "10000"),
      10000,
    ),
    socketTimeout: parseNumber(
      optionalEnv("SMTP_SOCKET_TIMEOUT", "15000"),
      15000,
    ),

    tls: {
      rejectUnauthorized: parseBoolean(
        optionalEnv("SMTP_TLS_REJECT_UNAUTHORIZED", "true"),
        true,
      ),
    },
  });

  return transporterInstance;
}

export async function verifyMailTransport() {
  const transporter = createTransport();
  await transporter.verify();
  return true;
}

export async function sendMail({ to, cc, bcc, subject, html, text, replyTo }) {
  const transporter = createTransport();

  // eslint-disable-next-line no-undef
  const fromName = process.env.MAIL_FROM_NAME || "Support";
  const fromEmail = requiredEnv("MAIL_FROM_EMAIL");

  const safeTo = sanitizeEmailList(to, "Recipient");
  const safeCc = sanitizeEmailList(cc, "CC");
  const safeBcc = sanitizeEmailList(bcc, "BCC");
  const safeReplyTo = replyTo
    ? extractEmailAddress(replyTo, "Reply-To")
    : undefined;

  const safeSubject = sanitizeSubject(subject);
  const safeHtml = sanitizeHtml(html);
  const safeText = sanitizeText(text);

  if (!safeTo) {
    throw new Error("Recipient is required");
  }

  if (!safeHtml && !safeText) {
    throw new Error("Email html or text content is required");
  }

  try {
    const info = await transporter.sendMail({
      from: formatFromAddress(fromName, fromEmail),
      to: safeTo,
      cc: safeCc,
      bcc: safeBcc,
      replyTo: safeReplyTo,
      subject: safeSubject,
      text: safeText,
      html: safeHtml,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      response: info.response || "",
    };
  } catch (error) {
    const safeError = new Error(error?.message || "Failed to send email");
    safeError.code = error?.code || "MAIL_SEND_FAILED";
    throw safeError;
  }
}
