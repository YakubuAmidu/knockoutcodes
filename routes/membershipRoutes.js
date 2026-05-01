import express from "express";
import {
  createMembership,
  getMemberships,
  getMembership,
  updateMembership,
  deleteMembership,
  getMembershipLessons,
} from "../controllers/membershipController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { membershipShield } from "../middleware/membershipShield.js";
import { subscriptionRequired } from "../middleware/subscriptionRequired.js";

const router = express.Router();

router.use(membershipShield()); // ✅ protects only this router

router
  .route("/")
  .get(getMemberships)
  .post(authRequired, adminOnly, createMembership);

router.get("/:id/lessons", authRequired, subscriptionRequired, getMembershipLessons);

router
  .route("/:id")
  .get(getMembership)
  .put(authRequired, adminOnly, updateMembership)
  .delete(authRequired, adminOnly, deleteMembership);

export default router;
