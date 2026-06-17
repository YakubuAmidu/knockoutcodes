// routes/courseRoutes.js
import express from "express";

import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getCoursePlayer,
} from "../controllers/courseController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";

import {
  publicShield,
  writeShield,
  allowMethods,
} from "../middleware/securityShield.js";

const router = express.Router();

/* ======================================================
   KNOCKOUTCODES COURSE ROUTES
====================================================== */

/* =========================
   ADMIN COURSE LIST
   Must stay above "/:id"
========================= */
router.get(
  "/admin/manage",
  allowMethods(["GET"]),
  publicShield,
  authRequired,
  adminOnly,
  getCourses,
);

/* =========================
   COURSE LIST / CREATE
========================= */
router
  .route("/")
  .get(publicShield, getCourses)
  .post(
    allowMethods(["POST"]),
    writeShield,
    authRequired,
    adminOnly,
    csrfRequired,
    createCourse,
  );

/* =========================
   COURSE PLAYER
   Must stay above "/:id"
========================= */
router.get("/player/:courseId", publicShield, authRequired, getCoursePlayer);

/* =========================
   SINGLE COURSE / UPDATE / DELETE
========================= */
router
  .route("/:id")
  .get(publicShield, getCourse)
  .put(
    allowMethods(["PUT"]),
    writeShield,
    authRequired,
    adminOnly,
    csrfRequired,
    updateCourse,
  )
  .delete(
    allowMethods(["DELETE"]),
    writeShield,
    authRequired,
    adminOnly,
    csrfRequired,
    deleteCourse,
  );

export default router;
