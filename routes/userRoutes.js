// routes/userRoutes.js
import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  updateMyAvatar,
  changeMyPassword,
} from "../controllers/userController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { handleAvatarUpload } from "../middleware/avatarUploadMiddleware.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";
import {
  publicShield,
  writeShield,
  headerSanity,
  botGuard,
  maxBodySize,
  noSqlShield,
  allowMethods,
} from "../middleware/securityShield.js";

const router = express.Router();

const uploadShield = [
  allowMethods(["POST"]),
  headerSanity,
  botGuard,
  maxBodySize(2 * 1024 * 1024),
  noSqlShield,
];

/**
 * USER SELF ROUTES
 */
router.get("/me", ...publicShield, authRequired, getMe);

router.patch(
  "/me",
  ...writeShield,
  csrfRequired,
  authRequired,
  updateMe
);

router.post(
  "/me/avatar",
  ...uploadShield,
  csrfRequired,
  authRequired,
  handleAvatarUpload,
  updateMyAvatar
);

router.patch(
  "/me/password",
  ...writeShield,
  csrfRequired,
  authRequired,
  changeMyPassword
);

/**
 * ADMIN ROUTES
 */
router.get("/", ...publicShield, authRequired, adminOnly, getUsers);

router.get("/:id", ...publicShield, authRequired, adminOnly, getUser);

router.patch(
  "/:id",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  updateUser
);

router.delete(
  "/:id",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  deleteUser
);

export default router;