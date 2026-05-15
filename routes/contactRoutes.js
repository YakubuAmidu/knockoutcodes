// routes/contactRoutes.js
import express from "express";
import {
  getPowChallenge,
  createContact,
  getMyContacts,
  getMyContact,
  sendMyReply,
  getAllContacts,
  updateContact,
  deleteContact,
  markAllSeen,
  sendAdminReply,
} from "../controllers/contactController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";

const router = express.Router();

router.get("/challenge", getPowChallenge);

router.post("/", authRequired, requireCsrf, createContact);

router.get("/my", authRequired, getMyContacts);
router.get("/my/:id", authRequired, getMyContact);
router.post("/my/:id/reply", authRequired, requireCsrf, sendMyReply);

router.put("/mark-all-seen", authRequired, adminOnly, requireCsrf, markAllSeen);

router.get("/", authRequired, adminOnly, getAllContacts);
router.put("/:id", authRequired, adminOnly, requireCsrf, updateContact);
router.delete("/:id", authRequired, adminOnly, requireCsrf, deleteContact);
router.post("/:id/reply", authRequired, adminOnly, requireCsrf, sendAdminReply);

export default router;