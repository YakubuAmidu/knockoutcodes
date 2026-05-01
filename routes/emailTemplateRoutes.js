import express from "express";

import {
  createEmailTemplate,
  getEmailTemplates,
  getEmailTemplateById,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../controllers/adminEmailTemplateController.js";

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

router.get("/", getEmailTemplates);
router.get("/:id", getEmailTemplateById);

router.post(
  "/",
  requireCsrf,
  requireJsonContent,
  adminRequestHardening,
  createEmailTemplate
);

router.put(
  "/:id",
  requireCsrf,
  requireJsonContent,
  adminRequestHardening,
  updateEmailTemplate
);

router.delete(
  "/:id",
  requireCsrf,
  adminDeleteHardening,
  deleteEmailTemplate
);

export default router;