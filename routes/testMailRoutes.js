import express from "express";
import { verifyMailTransport } from "../utils/mailer.js";

const router = express.Router();

router.get("/verify", async (req, res, next) => {
  try {
    await verifyMailTransport();

    res.status(200).json({
      success: true,
      message: "Mail transport verified successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
// DELETE THIS LATER AFTER TESTING.