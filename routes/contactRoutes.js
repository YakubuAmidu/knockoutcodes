// routes/contactRoutes.js
import express from "express";
import {
  createContact,
  getAllContacts,
  updateContact,
  deleteContact,
  markAllSeen,
  sendAdminReply,
  getPowChallenge,

  // ✅ USER inbox endpoints
  getMyContacts,
  getMyContact,
  sendMyReply,
} from "../controllers/contactController.js";

import { contactCreateLimiter } from '../middleware/rateLimiters.js'

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ✅ PUBLIC PoW challenge
 * GET /api/v1/contacts/challenge
 */
router.get("/challenge", getPowChallenge);

/**
 * ✅ USER (LOGIN REQUIRED): create ticket
 * POST /api/v1/contacts
 */
router.post("/", authRequired, contactCreateLimiter, createContact);

/**
 * ✅ USER INBOX (LOGIN REQUIRED)
 * GET  /api/v1/contacts/my
 * GET  /api/v1/contacts/my/:id
 * POST /api/v1/contacts/my/:id/reply
 */
router.get("/my", authRequired, getMyContacts);
router.get("/my/:id", authRequired, getMyContact);
router.post("/my/:id/reply", authRequired, sendMyReply);

/**
 * ✅ ADMIN INBOX
 */
router.get("/", authRequired, adminOnly, getAllContacts);
router.put("/mark-all-seen", authRequired, adminOnly, markAllSeen);
router.put("/:id", authRequired, adminOnly, updateContact);
router.delete("/:id", authRequired, adminOnly, deleteContact);

/**
 * ✅ ADMIN REPLY (thread + email)
 */
router.post("/:id/reply", authRequired, adminOnly, sendAdminReply);

export default router;
