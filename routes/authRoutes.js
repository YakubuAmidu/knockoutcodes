// routes/authRoutes.js
import express from "express";
import {
  login,
  register,
  logoutUser,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/authController.js";

import { authRequired } from "../middleware/authMiddleware.js";
import { requireCsrf, issueCsrf } from "../middleware/csrfMiddleware.js";
import { authShield } from "../middleware/securityShield.js";

const router = express.Router();

router.get("/csrf", issueCsrf);

/**
 * Verify email
 * GET /api/v1/auth/verify-email/:token
 */
router.get("/verify-email/:token", verifyEmail);

router.post("/register", ...authShield, register);

/**
 * Resend email verification
 * POST /api/v1/auth/resend-verification
 */
router.post("/resend-verification", ...authShield, resendVerificationEmail);

router.post("/login", ...authShield, login);

router.post("/forgot-password", ...authShield, forgotPassword);

router.post("/reset-password/:token", ...authShield, resetPassword);

router.post("/refresh", refresh);

router.get("/me", authRequired, me);

router.post("/logout", requireCsrf, logoutUser);

export default router;
