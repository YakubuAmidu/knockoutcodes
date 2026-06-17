// controllers/contactController.js
import crypto from "crypto";
import Contact from "../models/ContactModel.js"; // ✅ match your actual filename
import { sendMail } from "../utils/mailer.js";
import { emitToUser, getIO } from "../config/socket.js";

/**
 * Helper: sanitize for safe content
 */
function safe(s, max = 5000) {
  return String(s || "")
    .trim()
    .slice(0, max);
}

function publicUrl() {
  // eslint-disable-next-line no-undef
  return process.env.APP_PUBLIC_URL || "";
}

function emitContactRealtime(contact, action = "updated") {
  try {
    if (!contact) return;

    const safeContact = contact.toObject ? contact.toObject() : contact;
    const userId = safeContact.user?._id || safeContact.user;

    if (userId) {
      emitToUser(userId, "user:contact-updated", {
        action,
        contact: safeContact,
      });
    }

    const io = getIO?.();

    if (io) {
      io.emit("admin:contacts-refresh", {
        action,
        contactId: safeContact._id,
      });
    }
  } catch {
    // Ignore contact realtime emit failure.
  }
}

/* =========================================================
   ✅ PoW (Proof-of-Work) SERVER HELPERS
========================================================= */

function powSecret() {
  // eslint-disable-next-line no-undef
  const secret = process.env.POW_SECRET;

  if (!secret) {
    throw new Error("POW secret is not configured.");
  }

  return secret;
}

function hmacSig(payload) {
  return crypto.createHmac("sha256", powSecret()).update(payload).digest("hex");
}

function sha256Hex(payload) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function meetsDifficulty(hex, difficultyBits) {
  const zeroHexChars = Math.floor(difficultyBits / 4);
  const leftoverBits = difficultyBits % 4;

  for (let i = 0; i < zeroHexChars; i++) {
    if (hex[i] !== "0") return false;
  }
  if (leftoverBits === 0) return true;

  const nibble = parseInt(hex[zeroHexChars], 16);
  const threshold = 1 << (4 - leftoverBits);
  return nibble < threshold;
}

function normalizeEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

/**
 * ✅ PUBLIC: PoW challenge endpoint
 * GET /api/v1/contacts/challenge
 */
export const getPowChallenge = async (req, res) => {
  try {
    const now = Date.now();
    // eslint-disable-next-line no-undef
    const ttlMs = Number(process.env.POW_TTL_MS || 120000);
    // eslint-disable-next-line no-undef
    const difficulty = Number(process.env.POW_DIFFICULTY_BITS || 18);
    const nonce = crypto.randomBytes(16).toString("hex");

    const payload = `${nonce}.${now}.${difficulty}.${ttlMs}`;
    const sig = hmacSig(payload);

    return res.status(200).json({
      success: true,
      pow: { nonce, ts: now, difficulty, ttlMs, sig },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to generate challenge",
    });
  }
};

function verifyPow({ pow, email }) {
  if (!pow || typeof pow !== "object")
    return { ok: false, reason: "Missing pow." };

  const nonce = safe(pow.nonce, 200);
  const sig = safe(pow.sig, 200);

  const ts = Number(pow.ts);
  const difficulty = Number(pow.difficulty);
  const ttlMs = Number(pow.ttlMs);
  const answer = Number(pow.answer);

  if (!nonce || !sig) return { ok: false, reason: "Invalid pow payload." };
  if (
    !Number.isFinite(ts) ||
    !Number.isFinite(difficulty) ||
    !Number.isFinite(ttlMs)
  )
    return { ok: false, reason: "Invalid pow metadata." };
  if (!Number.isFinite(answer) || answer < 0)
    return { ok: false, reason: "Invalid pow answer." };

  if (Date.now() - ts > ttlMs)
    return { ok: false, reason: "Challenge expired." };

  const payload = `${nonce}.${ts}.${difficulty}.${ttlMs}`;
  const expectedSig = hmacSig(payload);
  if (expectedSig !== sig)
    return { ok: false, reason: "Bad challenge signature." };

  // eslint-disable-next-line no-undef
  const minBits = Number(process.env.POW_MIN_BITS || 12);
  // eslint-disable-next-line no-undef
  const maxBits = Number(process.env.POW_MAX_BITS || 26);
  if (difficulty < minBits || difficulty > maxBits)
    return { ok: false, reason: "Difficulty out of range." };

  const e = normalizeEmail(email);
  if (!e) return { ok: false, reason: "Missing email for pow." };

  const digest = sha256Hex(`${nonce}.${e}.${answer}`);
  if (!meetsDifficulty(digest, difficulty))
    return { ok: false, reason: "Pow does not meet difficulty." };

  return { ok: true };
}

/* =========================================================
   ✅ USER: create ticket (LOGIN REQUIRED)
   POST /api/v1/contacts
========================================================= */
export const createContact = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Login required." });
    }

    const name = safe(req.user?.name, 60) || safe(req.body?.name, 60);
    const email =
      normalizeEmail(req.user?.email) || normalizeEmail(req.body?.email);
    const phone = safe(req.user?.phone, 20) || safe(req.body?.phone, 20);

    const subject = safe(req.body?.subject, 300);
    const message = safe(req.body?.message, 2500);

    // honeypot
    const company = safe(req.body?.company, 200);
    if (company) {
      return res.status(200).json({ success: true, message: "OK" });
    }

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // ✅ Verify PoW
    const pow = req.body?.pow;
    const verified = verifyPow({ pow, email });
    if (!verified.ok) {
      return res.status(400).json({
        success: false,
        message: `Security check failed: ${verified.reason}`,
      });
    }

    const now = new Date();

    const doc = await Contact.create({
      user: userId,
      name,
      email,
      phone,
      subject,
      message, // backward-compat
      messages: [{ sender: "user", text: message }],
      status: "new",
      isSeen: false,
      replied: false,

      // ✅ NEW: tracking
      lastSender: "user",
      lastMessageAt: now,
      userLastSeenAt: now, // user created it, so they've "seen" it
      adminLastSeenAt: null,
    });

    emitContactRealtime(doc, "created");

    // ✅ Auto-confirmation email (won't break if SMTP fails)
    try {
      const url = publicUrl();
      // eslint-disable-next-line no-undef
      const supportName = process.env.MAIL_FROM_NAME || "Support";

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 10px">We received your message ✅</h2>
          <p style="margin:0 0 12px">
            Hi ${name},<br/>
            Thanks for contacting ${supportName}. Your request is in our inbox.
          </p>
          <p style="margin:0 0 12px">
            <b>Subject:</b> ${subject}<br/>
            <b>Message:</b> ${message}
          </p>
          <p style="margin:0 0 12px">
            You can view this thread inside your account under <b>My Messages</b>.
          </p>
          ${url ? `<p style="margin:0">Website: <a href="${url}">${url}</a></p>` : ""}
          <p style="margin:16px 0 0;color:#777;font-size:12px">This is an automated confirmation.</p>
        </div>
      `;

      const text = `We received your message.\n\nSubject: ${subject}\nMessage: ${message}\n\nYou can view and reply inside your account under My Messages.`;

      await sendMail({
        to: email,
        subject: "We received your message ✅",
        html,
        text,
      });
    } catch {
      // do not fail if email fails
    }

    return res.status(201).json({
      success: true,
      message: "Contact created successfully.",
      contact: doc,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

/* =========================================================
   ✅ USER: list my tickets
   GET /api/v1/contacts/my
========================================================= */
export const getMyContacts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Login required." });

    const docs = await Contact.find({ user: userId })
      .select(
        "_id subject status replied isSeen createdAt updatedAt lastSender lastMessageAt userLastSeenAt",
      )
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      items: docs,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/* =========================================================
   ✅ USER: open my ticket (full thread)
   GET /api/v1/contacts/my/:id
========================================================= */
export const getMyContact = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Login required." });

    const { id } = req.params;

    const doc = await Contact.findOne({ _id: id, user: userId });
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Thread not found." });

    // ✅ IMPORTANT FIX:
    // User opening a ticket should NOT flip admin's isSeen flag.
    // It should only mark userLastSeenAt so user can detect new admin replies.
    doc.userLastSeenAt = new Date();
    await doc.save();

    emitContactRealtime(doc, "user-seen");

    return res.status(200).json({
      success: true,
      item: doc,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/* =========================================================
   ✅ USER: reply inside my thread
   POST /api/v1/contacts/my/:id/reply
========================================================= */
export const sendMyReply = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required.",
      });
    }

    const { id } = req.params;

    const replyText = safe(req.body?.message, 5000);

    if (!replyText) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const contact = await Contact.findOne({
      _id: id,
      user: userId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Thread not found.",
      });
    }

    // ✅ PROFESSIONAL TICKET PROTECTION
    // Once a ticket is resolved/completed/closed,
    // users cannot continue replying.
    const lockedStatuses = ["resolved", "complete", "completed", "closed"];

    if (lockedStatuses.includes(String(contact.status || "").toLowerCase())) {
      return res.status(403).json({
        success: false,
        message:
          "This conversation is already finished. Please open a new ticket.",
      });
    }

    const now = new Date();

    contact.messages = Array.isArray(contact.messages) ? contact.messages : [];

    contact.messages.push({
      sender: "user",
      text: replyText,
    });

    // ✅ workflow + detection
    contact.isSeen = false;

    // admin hasn't seen latest user reply yet
    contact.lastSender = "user";
    contact.lastMessageAt = now;

    // user wrote it, so they've seen it
    contact.userLastSeenAt = now;

    await contact.save();

    emitContactRealtime(contact, "user-replied");

    // ✅ emit directly to admin rooms too
    const io = req.app.get("io");

    if (io) {
      io.emit("contact:updated", {
        contactId: contact._id,
        sender: "user",
        lastSender: "user",
        action: "user-replied",
        updatedAt: contact.updatedAt,
        lastMessageAt: contact.lastMessageAt,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sent",
      item: contact,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

/* =========================================================
   ✅ ADMIN: get all contacts
   GET /api/v1/contacts
========================================================= */
export const getAllContacts = async (req, res) => {
  try {
    const docs = await Contact.find()
      .sort({ createdAt: -1 })
      .select(
        "_id user name email subject phone status isSeen replied replyNote messages createdAt updatedAt lastSender lastMessageAt adminLastSeenAt",
      );

    return res.status(200).json({
      success: true,
      contacts: docs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

/* =========================================================
   ✅ ADMIN: update workflow fields
   PUT /api/v1/contacts/:id
========================================================= */
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;

    const patch = {
      status: req.body?.status,
      isSeen: req.body?.isSeen,
      replied: req.body?.replied,
      replyNote: safe(req.body?.replyNote, 2000),
    };

    // ✅ If admin marks "seen", record adminLastSeenAt automatically
    if (patch.isSeen === true) {
      patch.adminLastSeenAt = new Date();
    }

    Object.keys(patch).forEach(
      (k) => patch[k] === undefined && delete patch[k],
    );

    const updated = await Contact.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    emitContactRealtime(updated, "updated");

    return res.status(200).json({
      success: true,
      message: "Contact updated",
      contact: updated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

/* =========================================================
   ✅ ADMIN: delete contact
   DELETE /api/v1/contacts/:id
========================================================= */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Contact.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    emitContactRealtime(deleted, "deleted");

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

/* =========================================================
   ✅ ADMIN: mark all contacts seen
   PUT /api/v1/contacts/mark-all-seen
========================================================= */
export const markAllSeen = async (req, res) => {
  try {
    const now = new Date();
    await Contact.updateMany(
      {},
      { $set: { isSeen: true, adminLastSeenAt: now } },
    );

    try {
      const io = getIO?.();
      io?.emit("admin:contacts-refresh", {
        action: "mark-all-seen",
      });
    } catch {
      // ignore socket errors
    }

    return res
      .status(200)
      .json({ success: true, message: "All contacts marked seen" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

/* =========================================================
   ✅ ADMIN: send reply (thread + email)
   POST /api/v1/contacts/:id/reply
========================================================= */
export const sendAdminReply = async (req, res) => {
  try {
    const { id } = req.params;
    const replyText = safe(req.body?.message, 5000);

    if (!replyText) {
      return res
        .status(400)
        .json({ success: false, message: "Reply message is required." });
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    const now = new Date();

    contact.messages = Array.isArray(contact.messages) ? contact.messages : [];
    contact.messages.push({ sender: "admin", text: replyText });

    // ✅ workflow + detection
    contact.isSeen = true; // admin has seen it (they are replying)
    contact.replied = true;
    if (contact.status === "new") contact.status = "open";

    contact.lastSender = "admin";
    contact.lastMessageAt = now;
    contact.adminLastSeenAt = now; // admin just acted on it

    await contact.save();

    emitContactRealtime(contact, "admin-replied");

    // ✅ Real-time update for user's MyMessages.jsx
    const io = req.app.get("io");

    const userId =
      contact.user?._id?.toString?.() ||
      contact.user?.toString?.() ||
      contact.userId?._id?.toString?.() ||
      contact.userId?.toString?.();

    if (io && userId) {
      io.to(`user:${userId}`).emit("myMessages:updated", {
        ticketId: contact._id,
        contactId: contact._id,
        sender: "admin",
        lastSender: "admin",
        action: "admin-replied",
        message: "Admin replied",
        updatedAt: contact.updatedAt,
        lastMessageAt: contact.lastMessageAt,
      });

      io.to(`user:${userId}`).emit("user:ticket-reply", {
        ticketId: contact._id,
        contactId: contact._id,
        sender: "admin",
        lastSender: "admin",
        action: "admin-replied",
        updatedAt: contact.updatedAt,
        lastMessageAt: contact.lastMessageAt,
      });
    }

    // Email (safe)
    try {
      const url = publicUrl();
      // eslint-disable-next-line no-undef
      const supportName = process.env.MAIL_FROM_NAME || "Support";

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 10px">Reply from ${supportName}</h2>
          <p style="margin:0 0 12px"><b>Subject:</b> ${safe(contact.subject, 300)}</p>
          <div style="margin:0 0 12px;padding:12px;border:1px solid #eee;border-radius:10px">
            ${replyText.replace(/\n/g, "<br/>")}
          </div>
          ${url ? `<p style="margin:0">Website: <a href="${url}">${url}</a></p>` : ""}
          <p style="margin:16px 0 0;color:#777;font-size:12px">
            You can reply inside your account under <b>My Messages</b>.
          </p>
        </div>
      `;

      const text = `Reply from ${supportName}\n\nSubject: ${safe(contact.subject, 300)}\n\n${replyText}\n\nReply inside your account under My Messages.`;

      await sendMail({
        to: contact.email,
        subject: `Re: ${safe(contact.subject, 250)}`,
        html,
        text,
      });
    } catch {
      // ignore SMTP errors
    }

    return res.status(200).json({
      success: true,
      message: "Reply sent",
      contact,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};
