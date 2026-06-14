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
  updateUserStatus,
  forceLogoutUser,
  softDeleteUser,
  restoreUser,
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

/* =========================
   User Self Routes
========================= */
router.get("/me", ...publicShield, authRequired, getMe);

router.patch("/me", ...writeShield, csrfRequired, authRequired, updateMe);

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

/* =========================
   Admin Routes
========================= */
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

router.patch(
  "/:id/status",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  updateUserStatus
);

router.patch(
  "/:id/force-logout",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  forceLogoutUser
);

router.patch(
  "/:id/soft-delete",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  softDeleteUser
);

router.patch(
  "/:id/restore",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  restoreUser
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