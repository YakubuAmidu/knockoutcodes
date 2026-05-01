// middleware/contactShield.js
import crypto from "crypto";
import AbuseBlock from "../models/AbuseBlock.js";

// ---------- helpers ----------
const now = () => Date.now();

function envBool(v, fallback = false) {
  if (v === undefined) return fallback;
  return String(v).toLowerCase() === "true";
}

function envInt(v, fallback) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

// eslint-disable-next-line no-undef
const POW_ENABLED = envBool(process.env.CONTACT_POW_ENABLED, true);
// eslint-disable-next-line no-undef
const POW_DIFFICULTY = envInt(process.env.CONTACT_POW_DIFFICULTY, 20);
// eslint-disable-next-line no-undef
const POW_TTL_MS = envInt(process.env.CONTACT_POW_TTL_MS, 5 * 60 * 1000);
// eslint-disable-next-line no-undef
const BLOCK_MS = envInt(process.env.CONTACT_ABUSE_BLOCK_MS, 60 * 60 * 1000);

const POW_SECRET =
  // eslint-disable-next-line no-undef
  process.env.CONTACT_POW_SECRET ||
  // eslint-disable-next-line no-undef
  (process.env.NODE_ENV === "production" ? "" : "pow-secret-dev-only");

// Basic email normalize
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

// Convert difficulty bits to hex prefix length (approx)
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

// HMAC signature for challenge
function signChallenge(payload) {
  return crypto.createHmac("sha256", POW_SECRET).update(payload).digest("hex");
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// ---------- Middleware: abuse guard ----------
export async function contactAbuseGuard(req, res, next) {
  try {
    const ip = req.ip || "";

    // ✅ DEV/LOCALHOST BYPASS
    if (ip === "::1" || ip === "127.0.0.1") return next();

    const email = normalizeEmail(req.body?.email);

    const keysToCheck = [
      ip ? `ip:${ip}` : null,
      email ? `email:${email}` : null,
    ].filter(Boolean);

    if (keysToCheck.length === 0) return next();

    const blocked = await AbuseBlock.findOne({
      key: { $in: keysToCheck },
      expiresAt: { $gt: new Date() },
    });

    if (blocked) {
      return res.status(429).json({
        success: false,
        message: "Too many requests from your network. Please try again later.",
      });
    }

    return next();
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // fail open
    return next();
  }
}

// Call this when you detect abuse (e.g. honeypot hit, bad PoW)
export async function blockAbuser({ ip, email, reason = "abuse" }) {
  const until = new Date(now() + BLOCK_MS);

  const ops = [];
  if (ip) ops.push(upsertBlock(`ip:${ip}`, reason, until));
  if (email) ops.push(upsertBlock(`email:${email}`, reason, until));

  await Promise.allSettled(ops);
}

async function upsertBlock(key, reason, expiresAt) {
  await AbuseBlock.findOneAndUpdate(
    { key },
    { $set: { reason, expiresAt }, $inc: { hits: 1 } },
    { upsert: true, new: true }
  );
}

// ---------- PoW Challenge endpoint helper ----------
export function buildPowChallenge() {
  const nonce = crypto.randomBytes(16).toString("hex");
  const ts = String(now());

  // ✅ Server-controlled difficulty + ttl
  const payload = `${nonce}.${ts}.${POW_DIFFICULTY}.${POW_TTL_MS}`;
  const sig = signChallenge(payload);

  return {
    nonce,
    ts,
    difficulty: POW_DIFFICULTY,
    ttlMs: POW_TTL_MS,
    sig,
  };
}

// ---------- Middleware: verify PoW ----------
export async function verifyContactPow(req, res, next) {
  try {
    if (!POW_ENABLED) return next();

    const ip = req.ip || "";
    const email = normalizeEmail(req.body?.email);

    const pow = req.body?.pow || null;
    const nonce = pow?.nonce;
    const ts = pow?.ts;
    const answer = pow?.answer; // REQUIRED
    const sig = pow?.sig;

    // ✅ Do NOT depend on client-provided difficulty/ttl for signature
    const difficulty = POW_DIFFICULTY;

    // basic presence checks
    if (!nonce || !ts || !sig || answer === undefined || answer === null) {
      await blockAbuser({ ip, email, reason: "missing_pow" });
      return res.status(400).json({
        success: false,
        message: "Security check failed. Please refresh and try again.",
      });
    }

    // ✅ verify signature using server config (prevents mismatch/tampering)
    const payload = `${nonce}.${ts}.${POW_DIFFICULTY}.${POW_TTL_MS}`;
    const expectedSig = signChallenge(payload);
    if (expectedSig !== sig) {
      await blockAbuser({ ip, email, reason: "bad_pow_sig" });
      return res.status(400).json({
        success: false,
        message: "Security check failed. Please refresh and try again.",
      });
    }

    // verify timestamp is not expired
    const tsNum = parseInt(String(ts), 10);
    if (!Number.isFinite(tsNum) || now() - tsNum > POW_TTL_MS) {
      return res.status(400).json({
        success: false,
        message: "Security check expired. Please refresh and try again.",
      });
    }

    // verify answer meets difficulty (bind to email so it can't be reused easily)
    const e = normalizeEmail(email);
    const candidate = `${nonce}.${e}.${answer}`;
    const digest = sha256Hex(candidate);

    if (!meetsDifficulty(digest, difficulty)) {
      await blockAbuser({ ip, email, reason: "bad_pow_answer" });
      return res.status(400).json({
        success: false,
        message: "Security check failed. Please try again.",
      });
    }

    return next();
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Security check failed. Please try again.",
    });
  }
}


