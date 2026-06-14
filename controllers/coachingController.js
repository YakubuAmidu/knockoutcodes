import Coaching, {
  BOXING_COACHING_TYPES,
  COACHING_SESSION_METHODS,
  COACHING_STATUSES,
} from "../models/CoachingModel.js";
import { sendMail } from "../utils/mailer.js";

const STATUSES = COACHING_STATUSES || [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

const SESSION_METHODS = COACHING_SESSION_METHODS || [
  "Google Meet",
  "Phone Call",
  "Zoom",
  "WhatsApp",
];

const LIMITS = {
  fullName: { min: 2, max: 80 },
  email: { min: 6, max: 120 },
  phone: { min: 7, max: 25 },
  timeZone: { min: 3, max: 60 },
  coachingType: { min: 3, max: 80 },
  goals: { min: 20, max: 1200 },
  adminNote: { min: 0, max: 500 },
  sessionLink: { min: 0, max: 500 },
  sessionPhone: { min: 0, max: 40 },
  sessionInstructions: { min: 0, max: 800 },
};

const badReq = (res, message) =>
  res.status(400).json({ success: false, message });

const notFound = (res) =>
  res.status(404).json({
    success: false,
    message: "Coaching request not found.",
  });

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));

const clamp = (v, max) => {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
};

const stripAngles = (v) => String(v || "").replace(/[<>]/g, "");
const normalizeSpaces = (v) => String(v || "").replace(/\s+/g, " ").trim();
const onlyDigitsPlus = (v) => String(v || "").replace(/[^\d+]/g, "");

const isDateYYYYMMDD = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const isTimeHHMM = (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(v || ""));

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip || null;
}

function hasSpamPattern(str) {
  const value = String(str || "");
  const links = value.match(/https?:\/\/|www\./gi);
  const tooManyLinks = (links?.length || 0) >= 2;
  const repeatingChars = /([a-zA-Z0-9!?.])\1{9,}/.test(value);
  return tooManyLinks || repeatingChars;
}

function isValidISODate(value) {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function cleanISO(value) {
  if (!value) return null;
  const s = String(value).trim();
  return isValidISODate(s) ? new Date(s).toISOString() : null;
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function todayYYYYMMDDUTC() {
  return new Date().toISOString().slice(0, 10);
}

function lenErr(label, value, min, max) {
  const s = String(value || "");
  if (s.length < min) return `${label} must be at least ${min} characters.`;
  if (s.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

function botGuard(req) {
  const honey = req.headers["x-honey"] || "";
  if (String(honey).trim()) return "Bot detected.";

  const ua = req.headers["user-agent"];
  if (!ua || String(ua).length < 8) return "Invalid client.";

  const t = Number(req.headers["x-form-ts"]);
  if (!Number.isFinite(t)) return "Invalid request.";

  const ageMs = Math.abs(Date.now() - t);
  if (ageMs > 10 * 60 * 1000) return "Request expired.";

  return null;
}

function buildStatusPatch(status) {
  const now = new Date();

  const patch = {
    status,
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
  };

  if (status === "confirmed") patch.confirmedAt = now;
  if (status === "completed") patch.completedAt = now;
  if (status === "cancelled") patch.cancelledAt = now;

  return patch;
}

function getSort(sort = "-createdAt") {
  const value = String(sort || "-createdAt").trim();
  if (value === "createdAt") return { createdAt: 1 };
  return { createdAt: -1 };
}

function buildSessionDetails(doc) {
  const method = doc.sessionMethod || "Google Meet";

  if (method === "Phone Call") {
    return `
Session Method: Phone Call
Phone: ${doc.sessionPhone || doc.phone || "We will contact you with the phone details."}
Instructions: ${doc.sessionInstructions || "Please be ready at your scheduled time."}
    `.trim();
  }

  if (method === "WhatsApp") {
    return `
Session Method: WhatsApp
WhatsApp Phone: ${doc.sessionPhone || doc.phone || "We will contact you with the WhatsApp details."}
Instructions: ${doc.sessionInstructions || "Please be ready at your scheduled time."}
    `.trim();
  }

  if (method === "Zoom") {
    return `
Session Method: Zoom
Zoom Link: ${doc.sessionLink || "Zoom link will be sent before the session."}
Instructions: ${doc.sessionInstructions || "Please join a few minutes early."}
    `.trim();
  }

  return `
Session Method: Google Meet
Google Meet Link: ${doc.sessionLink || "Google Meet link will be sent before the session."}
Instructions: ${doc.sessionInstructions || "Please join a few minutes early."}
  `.trim();
}

function buildSessionDetailsHtml(doc) {
  const method = escapeHtml(doc.sessionMethod || "Google Meet");

  return `
    <p><strong>Session Method:</strong> ${method}</p>
    ${
      doc.sessionLink
        ? `<p><strong>Session Link:</strong> <a href="${escapeHtml(
            doc.sessionLink
          )}">${escapeHtml(doc.sessionLink)}</a></p>`
        : ""
    }
    ${
      doc.sessionPhone
        ? `<p><strong>Session Phone:</strong> ${escapeHtml(
            doc.sessionPhone
          )}</p>`
        : ""
    }
    ${
      doc.sessionInstructions
        ? `<p><strong>Instructions:</strong> ${escapeHtml(
            doc.sessionInstructions
          )}</p>`
        : ""
    }
  `;
}

async function sendCustomerCoachingUpdateEmail(doc, reason = "updated") {
  if (!doc?.email) return false;

  const statusLabel = String(doc.status || "pending").toUpperCase();

  const subject =
    reason === "confirmed"
      ? "Your coaching session is confirmed"
      : reason === "completed"
      ? "Your coaching session is completed"
      : reason === "cancelled"
      ? "Your coaching session was cancelled"
      : "Your coaching session was updated";

  const sessionDetails = buildSessionDetails(doc);

  await sendMail({
    to: doc.email,
    subject,
    text: `
Hi ${doc.fullName},

Your coaching request has been ${reason}.

Status: ${statusLabel}
Coaching Type: ${doc.coachingType}
Duration: ${doc.duration} minutes
Date: ${doc.preferredDate}
Time: ${doc.preferredTime}
Time Zone: ${doc.timeZone}

${sessionDetails}

${doc.adminNote ? `Admin Note:\n${doc.adminNote}` : ""}

Thank you,
KnockoutCodes
    `.trim(),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>Your coaching session was ${escapeHtml(reason)}</h2>

        <p>Hi ${escapeHtml(doc.fullName)},</p>

        <p>Your coaching request has been updated.</p>

        <ul>
          <li><strong>Status:</strong> ${escapeHtml(statusLabel)}</li>
          <li><strong>Coaching Type:</strong> ${escapeHtml(doc.coachingType)}</li>
          <li><strong>Duration:</strong> ${escapeHtml(doc.duration)} minutes</li>
          <li><strong>Date:</strong> ${escapeHtml(doc.preferredDate)}</li>
          <li><strong>Time:</strong> ${escapeHtml(doc.preferredTime)}</li>
          <li><strong>Time Zone:</strong> ${escapeHtml(doc.timeZone)}</li>
        </ul>

        ${buildSessionDetailsHtml(doc)}

        ${
          doc.adminNote
            ? `<p><strong>Admin Note:</strong> ${escapeHtml(
                doc.adminNote
              )}</p>`
            : ""
        }

        <p>Thank you,<br/>KnockoutCodes</p>
      </div>
    `,
  });

  await Coaching.findByIdAndUpdate(doc._id, {
    lastCustomerEmailSentAt: new Date(),
  });

  return true;
}

export const createCoaching = async (req, res) => {
  try {
    const botMsg = botGuard(req);
    if (botMsg) return badReq(res, botMsg);

    const body = req.body || {};

    const fullName = clamp(
      normalizeSpaces(stripAngles(body.fullName)),
      LIMITS.fullName.max
    );

    const email = clamp(
      normalizeSpaces(stripAngles(body.email)).toLowerCase(),
      LIMITS.email.max
    );

    const phoneRaw = clamp(normalizeSpaces(stripAngles(body.phone)), 60);
    const phone = clamp(onlyDigitsPlus(phoneRaw), LIMITS.phone.max);

    const coachingType = clamp(
      normalizeSpaces(stripAngles(body.coachingType)),
      LIMITS.coachingType.max
    );

    const duration = Number(body.duration);

    const timeZone = clamp(
      normalizeSpaces(stripAngles(body.timeZone)),
      LIMITS.timeZone.max
    );

    const preferredDate = normalizeSpaces(String(body.preferredDate || ""));
    const preferredTime = normalizeSpaces(String(body.preferredTime || ""));

    const preferredStartISO = body.preferredStartISO
      ? cleanISO(body.preferredStartISO)
      : null;

    const preferGoogleMeet = !!body.preferGoogleMeet;

    const requestedSessionMethod = normalizeSpaces(
      stripAngles(body.sessionMethod)
    );

    const sessionMethod = SESSION_METHODS.includes(requestedSessionMethod)
      ? requestedSessionMethod
      : preferGoogleMeet
      ? "Google Meet"
      : "Phone Call";

    const marketingOptIn = !!body.marketingOptIn;

    const goals = clamp(
      normalizeSpaces(stripAngles(body.goals)),
      LIMITS.goals.max
    );

    const emailSubject = body.emailSubject
      ? clamp(stripAngles(body.emailSubject), 160)
      : null;

    const emailSummary = body.emailSummary
      ? clamp(stripAngles(body.emailSummary), 4000)
      : null;

    if (!fullName) return badReq(res, "Please enter your full name.");

    const nameLen = lenErr(
      "Full name",
      fullName,
      LIMITS.fullName.min,
      LIMITS.fullName.max
    );
    if (nameLen) return badReq(res, nameLen);

    if (hasSpamPattern(fullName)) {
      return badReq(res, "Name looks invalid. Please rewrite it.");
    }

    if (!email) return badReq(res, "Email is required.");

    const emailLen = lenErr("Email", email, LIMITS.email.min, LIMITS.email.max);
    if (emailLen) return badReq(res, emailLen);

    if (!isEmail(email)) return badReq(res, "Enter a valid email.");

    if (!phone) return badReq(res, "Phone number is required.");

    const phoneLen = lenErr(
      "Phone number",
      phone,
      LIMITS.phone.min,
      LIMITS.phone.max
    );
    if (phoneLen) return badReq(res, phoneLen);

    if (!coachingType) return badReq(res, "Coaching type is required.");

    if (!BOXING_COACHING_TYPES.includes(coachingType)) {
      return badReq(res, "Invalid coaching type.");
    }

    if (![30, 60, 90].includes(duration)) {
      return badReq(res, "Invalid duration.");
    }

    if (!timeZone) return badReq(res, "Time zone is required.");

    const tzLen = lenErr(
      "Time zone",
      timeZone,
      LIMITS.timeZone.min,
      LIMITS.timeZone.max
    );
    if (tzLen) return badReq(res, tzLen);

    if (!isValidTimeZone(timeZone)) {
      return badReq(res, "Invalid time zone.");
    }

    if (!preferredDate) return badReq(res, "Pick a preferred date.");

    if (!isDateYYYYMMDD(preferredDate)) {
      return badReq(res, "Invalid date format. Use YYYY-MM-DD.");
    }

    if (preferredDate < todayYYYYMMDDUTC()) {
      return badReq(res, "Preferred date cannot be in the past.");
    }

    if (!preferredTime) return badReq(res, "Pick a preferred time.");

    if (!isTimeHHMM(preferredTime)) {
      return badReq(res, "Invalid time format. Use HH:mm.");
    }

    if (body.preferredStartISO && !preferredStartISO) {
      return badReq(res, "Invalid preferred start time.");
    }

    if (!SESSION_METHODS.includes(sessionMethod)) {
      return badReq(res, "Invalid session method.");
    }

    if (!goals) {
      return badReq(
        res,
        "Please write what you want from this session (goals)."
      );
    }

    const goalsLen = lenErr(
      "Message",
      goals,
      LIMITS.goals.min,
      LIMITS.goals.max
    );
    if (goalsLen) return badReq(res, goalsLen);

    if (hasSpamPattern(goals)) {
      return badReq(
        res,
        "Message looks like spam. Please rewrite and try again."
      );
    }

    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    const dup = await Coaching.exists({
      email,
      coachingType,
      preferredDate,
      preferredTime,
      createdAt: { $gte: twoMinAgo },
    });

    if (dup) {
      return badReq(res, "You already submitted this request. Please wait.");
    }

    const doc = await Coaching.create({
      user: req.user?._id || null,
      fullName,
      email,
      phone,
      coachingType,
      duration,
      sessionMethod,
      timeZone,
      preferredDate,
      preferredTime,
      preferredStartISO,
      preferGoogleMeet,
      goals,
      marketingOptIn,
      emailSubject,
      emailSummary,
      source: {
        channel: clamp(
          normalizeSpaces(stripAngles(body?.source?.channel || "web")),
          40
        ),
        pageUrl: body?.source?.pageUrl
          ? clamp(stripAngles(body.source.pageUrl), 500)
          : null,
        userAgent: req.headers["user-agent"] || null,
        ip: getClientIp(req),
      },
      status: "pending",
    });

    const safe = {
      fullName: escapeHtml(fullName),
      email: escapeHtml(email),
      phone: escapeHtml(phone),
      coachingType: escapeHtml(coachingType),
      duration: escapeHtml(duration),
      timeZone: escapeHtml(timeZone),
      preferredDate: escapeHtml(preferredDate),
      preferredTime: escapeHtml(preferredTime),
      goals: escapeHtml(goals).replace(/\n/g, "<br/>"),
      sessionMethod: escapeHtml(sessionMethod),
    };

    let adminEmailSent = false;
    let customerEmailSent = false;

    try {
      const adminTo =
        // eslint-disable-next-line no-undef
        process.env.COACHING_ADMIN_EMAIL || process.env.MAIL_FROM_EMAIL;

      if (adminTo) {
        await sendMail({
          to: adminTo,
          subject: emailSubject || `New Coaching Request from ${fullName}`,
          text: `
New Coaching Request

Name: ${fullName}
Email: ${email}
Phone: ${phone}
Coaching Type: ${coachingType}
Duration: ${duration} minutes
Time Zone: ${timeZone}
Preferred Date: ${preferredDate}
Preferred Time: ${preferredTime}
Session Method: ${sessionMethod}
Marketing Opt-In: ${marketingOptIn ? "Yes" : "No"}

Goals:
${goals}
          `.trim(),
          html: `
            <h2>New Coaching Request</h2>
            <p><strong>Name:</strong> ${safe.fullName}</p>
            <p><strong>Email:</strong> ${safe.email}</p>
            <p><strong>Phone:</strong> ${safe.phone}</p>
            <p><strong>Coaching Type:</strong> ${safe.coachingType}</p>
            <p><strong>Duration:</strong> ${safe.duration} minutes</p>
            <p><strong>Time Zone:</strong> ${safe.timeZone}</p>
            <p><strong>Preferred Date:</strong> ${safe.preferredDate}</p>
            <p><strong>Preferred Time:</strong> ${safe.preferredTime}</p>
            <p><strong>Session Method:</strong> ${safe.sessionMethod}</p>
            <p><strong>Marketing Opt-In:</strong> ${
              marketingOptIn ? "Yes" : "No"
            }</p>
            <p><strong>Goals:</strong></p>
            <p>${safe.goals}</p>
          `,
          replyTo: email,
        });

        adminEmailSent = true;
      }
    } catch {
  // Email failure should not block the coaching request.
}

    try {
      await sendMail({
        to: email,
        subject: "We received your coaching request",
        text: `
Hi ${fullName},

We received your coaching request successfully.

Details:
- Coaching Type: ${coachingType}
- Duration: ${duration} minutes
- Preferred Date: ${preferredDate}
- Preferred Time: ${preferredTime}
- Time Zone: ${timeZone}
- Session Method: ${sessionMethod}

We will contact you soon to confirm the session.

Thank you,
KnockoutCodes
        `.trim(),
        html: `
          <p>Hi ${safe.fullName},</p>
          <p>We received your coaching request successfully.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Coaching Type: ${safe.coachingType}</li>
            <li>Duration: ${safe.duration} minutes</li>
            <li>Preferred Date: ${safe.preferredDate}</li>
            <li>Preferred Time: ${safe.preferredTime}</li>
            <li>Time Zone: ${safe.timeZone}</li>
            <li>Session Method: ${safe.sessionMethod}</li>
          </ul>
          <p>We will contact you soon to confirm the session.</p>
          <p>Thank you,<br/>KnockoutCodes</p>
        `,
      });

      customerEmailSent = true;
    } catch {
  // Email failure should not block the coaching request.
}

    return res.status(201).json({
      success: true,
      message:
        adminEmailSent || customerEmailSent
          ? "Coaching request received successfully."
          : "Coaching request saved successfully, but email notification could not be sent right now.",
      id: doc._id,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving your coaching request.",
    });
  }
};

export const getAllCoachings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const q = String(req.query.q || "").trim().slice(0, 60);
    const safeQ = q ? escapeRegex(q) : "";

    const filter = safeQ
      ? {
          $or: [
            { fullName: { $regex: safeQ, $options: "i" } },
            { email: { $regex: safeQ, $options: "i" } },
            { phone: { $regex: safeQ, $options: "i" } },
            { coachingType: { $regex: safeQ, $options: "i" } },
            { status: { $regex: safeQ, $options: "i" } },
            { sessionMethod: { $regex: safeQ, $options: "i" } },
          ],
        }
      : {};

    const sort = getSort(req.query.sort);

    const [items, total] = await Promise.all([
      Coaching.find(filter)
        .select("-source.ip -__v")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Coaching.countDocuments(filter),
    ]);

    return res.json({ success: true, page, limit, total, items });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coaching requests.",
    });
  }
};

export const getCoachingById = async (req, res) => {
  try {
    const doc = await Coaching.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { viewCount: 1 },
        $set: { adminViewedAt: new Date() },
      },
      { new: true, runValidators: true }
    )
      .select("-__v")
      .lean();

    if (!doc) return notFound(res);

    return res.json({ success: true, item: doc });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coaching request.",
    });
  }
};

export const updateCoaching = async (req, res) => {
  try {
    const updates = req.body || {};
    const allowed = {};
    let emailReason = "updated";
    let shouldEmailCustomer = false;

    const oldDoc = await Coaching.findById(req.params.id).lean();
    if (!oldDoc) return notFound(res);

    if (updates.status !== undefined) {
      const status = String(updates.status || "").trim().toLowerCase();

      if (!STATUSES.includes(status)) return badReq(res, "Invalid status.");

      Object.assign(allowed, buildStatusPatch(status));

      if (status !== oldDoc.status) {
        shouldEmailCustomer = true;
        emailReason = status;
      }
    }

    if (updates.adminNote !== undefined) {
      allowed.adminNote = clamp(
        normalizeSpaces(stripAngles(updates.adminNote)),
        LIMITS.adminNote.max
      );

      if (allowed.adminNote !== oldDoc.adminNote) shouldEmailCustomer = true;
    }

    if (updates.sessionMethod !== undefined) {
      const sessionMethod = normalizeSpaces(stripAngles(updates.sessionMethod));

      if (!SESSION_METHODS.includes(sessionMethod)) {
        return badReq(res, "Invalid session method.");
      }

      allowed.sessionMethod = sessionMethod;

      if (sessionMethod !== oldDoc.sessionMethod) shouldEmailCustomer = true;
    }

    if (updates.sessionLink !== undefined) {
      allowed.sessionLink = clamp(
        normalizeSpaces(stripAngles(updates.sessionLink)),
        LIMITS.sessionLink.max
      );

      if (allowed.sessionLink !== oldDoc.sessionLink) {
        shouldEmailCustomer = true;
      }
    }

    if (updates.sessionPhone !== undefined) {
      allowed.sessionPhone = clamp(
        normalizeSpaces(stripAngles(updates.sessionPhone)),
        LIMITS.sessionPhone.max
      );

      if (allowed.sessionPhone !== oldDoc.sessionPhone) {
        shouldEmailCustomer = true;
      }
    }

    if (updates.sessionInstructions !== undefined) {
      allowed.sessionInstructions = clamp(
        normalizeSpaces(stripAngles(updates.sessionInstructions)),
        LIMITS.sessionInstructions.max
      );

      if (allowed.sessionInstructions !== oldDoc.sessionInstructions) {
        shouldEmailCustomer = true;
      }
    }

    if (updates.fullName !== undefined) {
      const fullName = clamp(
        normalizeSpaces(stripAngles(updates.fullName)),
        LIMITS.fullName.max
      );

      const nameLen = lenErr(
        "Full name",
        fullName,
        LIMITS.fullName.min,
        LIMITS.fullName.max
      );
      if (nameLen) return badReq(res, nameLen);

      if (hasSpamPattern(fullName)) {
        return badReq(res, "Name looks invalid. Please rewrite it.");
      }

      allowed.fullName = fullName;

      if (fullName !== oldDoc.fullName) shouldEmailCustomer = true;
    }

    if (updates.email !== undefined) {
      const email = clamp(
        normalizeSpaces(stripAngles(updates.email)).toLowerCase(),
        LIMITS.email.max
      );

      const emailLen = lenErr(
        "Email",
        email,
        LIMITS.email.min,
        LIMITS.email.max
      );
      if (emailLen) return badReq(res, emailLen);
      if (!isEmail(email)) return badReq(res, "Enter a valid email.");

      allowed.email = email;
    }

    if (updates.phone !== undefined) {
      const phoneRaw = clamp(normalizeSpaces(stripAngles(updates.phone)), 60);
      const phone = clamp(onlyDigitsPlus(phoneRaw), LIMITS.phone.max);

      const phoneLen = lenErr(
        "Phone number",
        phone,
        LIMITS.phone.min,
        LIMITS.phone.max
      );
      if (phoneLen) return badReq(res, phoneLen);

      allowed.phone = phone;

      if (phone !== oldDoc.phone) shouldEmailCustomer = true;
    }

    if (updates.coachingType !== undefined) {
      const coachingType = clamp(
        normalizeSpaces(stripAngles(updates.coachingType)),
        LIMITS.coachingType.max
      );

      if (!BOXING_COACHING_TYPES.includes(coachingType)) {
        return badReq(res, "Invalid coaching type.");
      }

      allowed.coachingType = coachingType;

      if (coachingType !== oldDoc.coachingType) shouldEmailCustomer = true;
    }

    if (updates.duration !== undefined) {
      const duration = Number(updates.duration);

      if (![30, 60, 90].includes(duration)) {
        return badReq(res, "Invalid duration.");
      }

      allowed.duration = duration;

      if (duration !== oldDoc.duration) shouldEmailCustomer = true;
    }

    if (updates.timeZone !== undefined) {
      const timeZone = clamp(
        normalizeSpaces(stripAngles(updates.timeZone)),
        LIMITS.timeZone.max
      );

      const tzLen = lenErr(
        "Time zone",
        timeZone,
        LIMITS.timeZone.min,
        LIMITS.timeZone.max
      );
      if (tzLen) return badReq(res, tzLen);

      if (!isValidTimeZone(timeZone)) {
        return badReq(res, "Invalid time zone.");
      }

      allowed.timeZone = timeZone;

      if (timeZone !== oldDoc.timeZone) shouldEmailCustomer = true;
    }

    if (updates.preferredDate !== undefined) {
      const preferredDate = normalizeSpaces(String(updates.preferredDate || ""));

      if (!isDateYYYYMMDD(preferredDate)) {
        return badReq(res, "Invalid date format. Use YYYY-MM-DD.");
      }

      allowed.preferredDate = preferredDate;

      if (preferredDate !== oldDoc.preferredDate) shouldEmailCustomer = true;
    }

    if (updates.preferredTime !== undefined) {
      const preferredTime = normalizeSpaces(String(updates.preferredTime || ""));

      if (!isTimeHHMM(preferredTime)) {
        return badReq(res, "Invalid time format. Use HH:mm.");
      }

      allowed.preferredTime = preferredTime;

      if (preferredTime !== oldDoc.preferredTime) shouldEmailCustomer = true;
    }

    if (updates.preferredStartISO !== undefined) {
      const preferredStartISO = updates.preferredStartISO
        ? cleanISO(updates.preferredStartISO)
        : null;

      if (updates.preferredStartISO && !preferredStartISO) {
        return badReq(res, "Invalid preferred start time.");
      }

      allowed.preferredStartISO = preferredStartISO;

      if (preferredStartISO !== oldDoc.preferredStartISO) {
        shouldEmailCustomer = true;
      }
    }

    if (updates.goals !== undefined || updates.message !== undefined) {
      const goalsValue =
        updates.goals !== undefined ? updates.goals : updates.message;

      const goals = clamp(
        normalizeSpaces(stripAngles(goalsValue)),
        LIMITS.goals.max
      );

      const goalsLen = lenErr(
        "Message",
        goals,
        LIMITS.goals.min,
        LIMITS.goals.max
      );
      if (goalsLen) return badReq(res, goalsLen);

      if (hasSpamPattern(goals)) {
        return badReq(
          res,
          "Message looks like spam. Please rewrite and try again."
        );
      }

      allowed.goals = goals;

      if (goals !== oldDoc.goals) shouldEmailCustomer = true;
    }

    if (Object.keys(allowed).length === 0) {
      return badReq(res, "No valid fields provided for update.");
    }

    const updatedDoc = await Coaching.findByIdAndUpdate(req.params.id, allowed, {
      new: true,
      runValidators: true,
    })
      .select("-__v")
      .lean();

    if (!updatedDoc) return notFound(res);

    let customerEmailSent = false;

    if (shouldEmailCustomer) {
      try {
        customerEmailSent = await sendCustomerCoachingUpdateEmail(
          updatedDoc,
          emailReason
        );
      } catch {
  // Email failure should not block the coaching update.
}
    }

    const finalDoc = await Coaching.findById(req.params.id)
      .select("-__v")
      .lean();

    return res.json({
      success: true,
      message: customerEmailSent
        ? "Coaching updated and customer email sent."
        : "Coaching updated.",
      customerEmailSent,
      item: finalDoc || updatedDoc,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update coaching request.",
    });
  }
};

export const deleteCoaching = async (req, res) => {
  try {
    const doc = await Coaching.findByIdAndDelete(req.params.id).lean();

    if (!doc) return notFound(res);

    return res.json({
      success: true,
      message: "Coaching deleted.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete coaching request.",
    });
  }
};