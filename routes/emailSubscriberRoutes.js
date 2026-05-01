import express from "express";
import {
  createEmailSubscriber,
  getEmailSubscribers,
  getEmailSubscriberById,
  updateEmailSubscriber,
  deleteEmailSubscriber,
} from "../controllers/adminEmailSubscriberController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";
import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";

const router = express.Router();

router.use(authRequired);
router.use(adminOnly);

router.get("/", getEmailSubscribers);
router.get("/:id", getEmailSubscriberById);

router.post(
  "/",
  requireCsrf,
  requireJsonContent,
  adminRequestHardening,
  createEmailSubscriber
);

router.put(
  "/:id",
  requireCsrf,
  requireJsonContent,
  adminRequestHardening,
  updateEmailSubscriber
);

router.delete(
  "/:id",
  requireCsrf,
  adminDeleteHardening,
  deleteEmailSubscriber
);

export default router;