// routes/authRoutes.js
import express from "express";
import {
  login,
  register,
  logoutUser,
  refresh,
  me,
} from "../controllers/authController.js";

import { authRequired } from "../middleware/authMiddleware.js";
import { requireCsrf, issueCsrf } from "../middleware/csrfMiddleware.js";
import {
  requireJsonContent,
} from "../middleware/requestHardening.js";
import { authShield } from "../middleware/securityShield.js";

const router = express.Router();

router.get("/csrf", issueCsrf);

router.post(
  "/register",
  ...authShield,
  register
);

router.post(
  "/login",
  ...authShield,
  login
);

router.post("/refresh", refresh);

router.get("/me", authRequired, me);

router.post(
  "/logout",
  requireJsonContent,
  requireCsrf,
  logoutUser
);

export default router;