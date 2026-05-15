// controllers/coachingController.js
import Coaching, { BOXING_COACHING_TYPES } from "../models/CoachingModel.js";
import { sendMail } from "../utils/mailer.js";

const badReq = (res, message) =>
  res.status(400).json({ success: false, message });

const notFound = (res) =>
  res
    .status(404)
    .json({ success: false, message: "Coaching request not found." });

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));

const clamp = (v, max) => {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
};

const stripAngles = (v) => String(v || "").replace(/[<>]/g, "");
const normalizeSpaces = (v) => String(v || "").replace(/\s+/g, " ").trim();
const onlyDigitsPlus = (v) => String(v || "").replace(/[^\d+]/g, "");

const isDateYYYYMMDD = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const isTimeHHMM = (v) => /^\d{2}:\d{2}$/.test(String(v || ""));

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidISODate(value) {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isValidTimeValue(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

function botGuard(req) {
  const honey = req.headers["x-honey"] || "";
  if (String(honey).trim()) return "Bot detected.";

  const ua = req.headers["user-agent"];
  if (!ua || String(ua).length < 8) return "Invalid client.";

  const t = Number(req.headers["x-form-ts"]);
  if (!Number.isFinite(t)) return "Invalid request.";

  const now = Date.now();
  const ageMs = Math.abs(now - t);

  if (ageMs > 10 * 60 * 1000) return "Request expired.";

  return null;
}

const LIMITS = {
  fullName: { min: 2, max: 80 },
  email: { min: 6, max: 120 },
  phone: { min: 7, max: 25 },
  timeZone: { min: 3, max: 60 },
  coachingType: { min: 3, max: 80 },
  goals: { min: 20, max: 1200 },
  adminNote: { min: 0, max: 500 },
};

function lenErr(label, value, min, max) {
  const s = String(value || "");
  if (s.length < min) return `${label} must be at least ${min} characters.`;
  if (s.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

function todayYYYYMMDDUTC() {
  return new Date().toISOString().slice(0, 10);
}

// =============================
// PUBLIC: Create Coaching
// POST /api/v1/coachings
// =============================
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
      ? String(body.preferredStartISO)
      : null;

    const preferGoogleMeet = !!body.preferGoogleMeet;
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

    if (!email) return badReq(res, "Email is required.");

    const emailLen = lenErr(
      "Email",
      email,
      LIMITS.email.min,
      LIMITS.email.max
    );
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

    if (!preferredDate) return badReq(res, "Pick a preferred date.");

    if (!isDateYYYYMMDD(preferredDate)) {
      return badReq(res, "Invalid date format. Use YYYY-MM-DD.");
    }

    if (preferredDate < todayYYYYMMDDUTC()) {
      return badReq(res, "Preferred date cannot be in the past.");
    }

    if (!preferredTime) return badReq(res, "Pick a preferred time.");

    if (!isTimeHHMM(preferredTime) || !isValidTimeValue(preferredTime)) {
      return badReq(res, "Invalid time format. Use HH:mm.");
    }

    if (!isValidISODate(preferredStartISO)) {
      return badReq(res, "Invalid preferred start time.");
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

    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    const dup = await Coaching.findOne({
      email,
      preferredDate,
      preferredTime,
      createdAt: { $gte: twoMinAgo },
    }).lean();

    if (dup) {
      return badReq(res, "You already submitted this request. Please wait.");
    }

    const doc = await Coaching.create({
      fullName,
      email,
      phone,
      coachingType,
      duration,
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
        channel: body?.source?.channel || "web",
        pageUrl: body?.source?.pageUrl || null,
        userAgent: req.headers["user-agent"] || null,
        ip: getClientIp(req),
      },
      status: "pending",
    });

    // Safe values are ONLY for HTML/email rendering.
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
Google Meet: ${preferGoogleMeet ? "Yes" : "No"}
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
            <p><strong>Google Meet:</strong> ${
              preferGoogleMeet ? "Yes" : "No"
            }</p>
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
    } catch (mailErr) {
      console.error("Admin coaching email failed:", mailErr.message);
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

We will contact you soon to confirm the session.

Thank you.
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
          </ul>
          <p>We will contact you soon to confirm the session.</p>
          <p>Thank you.</p>
        `,
      });

      customerEmailSent = true;
    } catch (mailErr) {
      console.error("Customer confirmation email failed:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message:
        adminEmailSent || customerEmailSent
          ? "Coaching request received successfully."
          : "Coaching request saved successfully, but email notification could not be sent right now.",
      id: doc._id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving your coaching request.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// =============================
// ADMIN: CRUD
// =============================

export const getAllCoachings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const q = String(req.query.q || "").trim();
    const safeQ = q ? escapeRegex(q.slice(0, 60)) : "";

    const filter = safeQ
      ? {
          $or: [
            { fullName: { $regex: safeQ, $options: "i" } },
            { email: { $regex: safeQ, $options: "i" } },
            { coachingType: { $regex: safeQ, $options: "i" } },
            { status: { $regex: safeQ, $options: "i" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      Coaching.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Coaching.countDocuments(filter),
    ]);

    return res.json({ success: true, page, limit, total, items });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coaching requests.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

export const getCoachingById = async (req, res) => {
  try {
    const doc = await Coaching.findById(req.params.id);
    if (!doc) return notFound(res);

    return res.json({ success: true, item: doc });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coaching request.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

export const updateCoaching = async (req, res) => {
  try {
    const updates = req.body || {};
    const allowed = {};

    if (updates.status !== undefined) {
      const status = String(updates.status || "").trim();

      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return badReq(res, "Invalid status.");
      }

      allowed.status = status;
    }

    if (updates.adminNote !== undefined) {
      allowed.adminNote = clamp(
        normalizeSpaces(stripAngles(updates.adminNote)),
        LIMITS.adminNote.max
      );
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
      allowed.fullName = fullName;
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
    }

    if (updates.preferredDate !== undefined) {
      const preferredDate = normalizeSpaces(String(updates.preferredDate || ""));

      if (!isDateYYYYMMDD(preferredDate)) {
        return badReq(res, "Invalid date format. Use YYYY-MM-DD.");
      }

      allowed.preferredDate = preferredDate;
    }

    if (updates.preferredTime !== undefined) {
      const preferredTime = normalizeSpaces(String(updates.preferredTime || ""));

      if (!isTimeHHMM(preferredTime) || !isValidTimeValue(preferredTime)) {
        return badReq(res, "Invalid time format. Use HH:mm.");
      }

      allowed.preferredTime = preferredTime;
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
      allowed.goals = goals;
    }

    const doc = await Coaching.findByIdAndUpdate(req.params.id, allowed, {
      new: true,
      runValidators: true,
    });

    if (!doc) return notFound(res);

    return res.json({ success: true, message: "Coaching updated.", item: doc });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update coaching request.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

export const deleteCoaching = async (req, res) => {
  try {
    const doc = await Coaching.findByIdAndDelete(req.params.id);
    if (!doc) return notFound(res);

    return res.json({ success: true, message: "Coaching deleted." });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete coaching request.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};